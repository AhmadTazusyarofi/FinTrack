import { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { pool } from '../../database/connection/db'
import { v4 as uuidv4 } from 'uuid'

export type DebtType = 'PAYABLE' | 'RECEIVABLE'
export type DebtStatus = 'ACTIVE' | 'SETTLED'

export interface DebtRow {
  id: string
  user_id: string
  type: DebtType
  person_name: string
  amount: number
  paid_amount: number
  due_date: string | null
  note: string | null
  status: DebtStatus
  created_at: Date
  updated_at: Date
}

export interface DebtPaymentRow {
  id: string
  debt_id: string
  account_id: string
  account_name: string
  transaction_id: string | null
  amount: number
  date: string
  note: string | null
  created_at: Date
}

export interface DebtData {
  type: DebtType
  personName: string
  amount: number
  dueDate: string | null
  note: string | null
}

export interface DebtUpdateData {
  personName: string
  dueDate: string | null
  note: string | null
}

export interface PaymentData {
  accountId: string
  amount: number
  date: string
  note: string | null
}

async function getOrCreateDebtCategory(
  conn: Awaited<ReturnType<typeof pool.getConnection>>,
  userId: string,
  debtType: DebtType
): Promise<string> {
  const name = debtType === 'PAYABLE' ? 'Hutang' : 'Piutang'
  const txType = debtType === 'PAYABLE' ? 'EXPENSE' : 'INCOME'
  const newId = uuidv4()
  await conn.query<ResultSetHeader>(
    'INSERT IGNORE INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)',
    [newId, userId, name, txType]
  )
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ?',
    [userId, name, txType]
  )
  return (rows[0] as { id: string }).id
}

function castDebt(r: RowDataPacket): DebtRow {
  return { ...r, amount: Number(r.amount), paid_amount: Number(r.paid_amount) } as DebtRow
}

function castPayment(r: RowDataPacket): DebtPaymentRow {
  return { ...r, amount: Number(r.amount) } as DebtPaymentRow
}

export async function findDebts(userId: string, type?: DebtType, status?: DebtStatus): Promise<DebtRow[]> {
  const conds: string[] = ['user_id = ?']
  const params: unknown[] = [userId]
  if (type)   { conds.push('type = ?');   params.push(type) }
  if (status) { conds.push('status = ?'); params.push(status) }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM debts WHERE ${conds.join(' AND ')} ORDER BY created_at DESC`,
    params
  )
  return (rows as RowDataPacket[]).map(castDebt)
}

export async function findDebtById(id: string, userId: string): Promise<DebtRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM debts WHERE id = ? AND user_id = ?',
    [id, userId]
  )
  return rows[0] ? castDebt(rows[0]) : null
}

export async function findPaymentsByDebtId(debtId: string): Promise<DebtPaymentRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT dp.*, a.name as account_name
     FROM debt_payments dp
     LEFT JOIN accounts a ON dp.account_id = a.id
     WHERE dp.debt_id = ?
     ORDER BY dp.date DESC, dp.created_at DESC`,
    [debtId]
  )
  return (rows as RowDataPacket[]).map(castPayment)
}

export async function insertDebt(userId: string, data: DebtData): Promise<DebtRow> {
  const id = uuidv4()
  await pool.query<ResultSetHeader>(
    'INSERT INTO debts (id, user_id, type, person_name, amount, due_date, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, userId, data.type, data.personName, data.amount, data.dueDate ?? null, data.note ?? null]
  )
  return findDebtById(id, userId) as Promise<DebtRow>
}

export async function updateDebtRow(id: string, userId: string, data: DebtUpdateData): Promise<DebtRow> {
  await pool.query<ResultSetHeader>(
    'UPDATE debts SET person_name = ?, due_date = ?, note = ? WHERE id = ? AND user_id = ?',
    [data.personName, data.dueDate ?? null, data.note ?? null, id, userId]
  )
  return findDebtById(id, userId) as Promise<DebtRow>
}

export async function insertPayment(userId: string, debt: DebtRow, data: PaymentData): Promise<DebtPaymentRow> {
  const paymentId = uuidv4()
  const txId = uuidv4()
  const txType = debt.type === 'PAYABLE' ? 'EXPENSE' : 'INCOME'
  const balanceDelta = debt.type === 'PAYABLE' ? -data.amount : data.amount
  const newPaidAmount = debt.paid_amount + data.amount
  const newStatus: DebtStatus = newPaidAmount >= debt.amount ? 'SETTLED' : 'ACTIVE'
  const autoNote = data.note ?? `Cicilan ${debt.type === 'PAYABLE' ? 'hutang' : 'piutang'} - ${debt.person_name}`

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const categoryId = await getOrCreateDebtCategory(conn, userId, debt.type)
    await conn.query<ResultSetHeader>(
      'INSERT INTO transactions (id, user_id, type, amount, note, date, category_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [txId, userId, txType, data.amount, autoNote, data.date, categoryId, data.accountId]
    )
    await conn.query<ResultSetHeader>(
      'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
      [balanceDelta, data.accountId, userId]
    )
    await conn.query<ResultSetHeader>(
      'INSERT INTO debt_payments (id, debt_id, account_id, transaction_id, amount, date, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [paymentId, debt.id, data.accountId, txId, data.amount, data.date, data.note ?? null]
    )
    await conn.query<ResultSetHeader>(
      'UPDATE debts SET paid_amount = ?, status = ? WHERE id = ?',
      [newPaidAmount, newStatus, debt.id]
    )
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT dp.*, a.name as account_name FROM debt_payments dp LEFT JOIN accounts a ON dp.account_id = a.id WHERE dp.id = ?`,
    [paymentId]
  )
  return castPayment(rows[0])
}

export async function deletePaymentRow(userId: string, debt: DebtRow, paymentId: string): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM debt_payments WHERE id = ? AND debt_id = ?',
    [paymentId, debt.id]
  )
  if (!rows[0]) throw new Error('Cicilan tidak ditemukan')
  const p = castPayment(rows[0])
  const balanceDelta = debt.type === 'PAYABLE' ? p.amount : -p.amount
  const newPaidAmount = Math.max(0, debt.paid_amount - p.amount)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query<ResultSetHeader>('DELETE FROM debt_payments WHERE id = ?', [paymentId])
    if (p.transaction_id) {
      await conn.query<ResultSetHeader>(
        'DELETE FROM transactions WHERE id = ? AND user_id = ?',
        [p.transaction_id, userId]
      )
    }
    await conn.query<ResultSetHeader>(
      'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
      [balanceDelta, p.account_id, userId]
    )
    await conn.query<ResultSetHeader>(
      'UPDATE debts SET paid_amount = ?, status = ? WHERE id = ?',
      [newPaidAmount, 'ACTIVE', debt.id]
    )
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export async function deleteDebtRow(id: string, userId: string): Promise<void> {
  const debt = await findDebtById(id, userId)
  if (!debt) throw new Error('Hutang tidak ditemukan')
  const payments = await findPaymentsByDebtId(id)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    for (const p of payments) {
      const balanceDelta = debt.type === 'PAYABLE' ? p.amount : -p.amount
      if (p.transaction_id) {
        await conn.query<ResultSetHeader>(
          'DELETE FROM transactions WHERE id = ? AND user_id = ?',
          [p.transaction_id, userId]
        )
      }
      await conn.query<ResultSetHeader>(
        'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
        [balanceDelta, p.account_id, userId]
      )
    }
    await conn.query<ResultSetHeader>(
      'DELETE FROM debts WHERE id = ? AND user_id = ?',
      [id, userId]
    )
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

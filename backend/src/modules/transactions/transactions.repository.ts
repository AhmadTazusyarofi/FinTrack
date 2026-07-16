import { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { pool } from '../../database/connection/db'
import { v4 as uuidv4 } from 'uuid'

export interface TransactionRow {
  id: string
  user_id: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  date: string
  category_id: string
  category_name: string
  account_id: string
  account_name: string
  created_at: Date
  updated_at: Date
}

export interface TxFilter {
  type?: 'INCOME' | 'EXPENSE'
  month?: number
  year?: number
  search?: string
  page: number
  limit: number
}

export interface TxMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

const SELECT_TX = `
  SELECT t.id, t.user_id, t.type, t.amount, t.note as description, t.date,
         t.category_id, c.name as category_name,
         t.account_id,  a.name as account_name,
         t.created_at,  t.updated_at
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  LEFT JOIN accounts   a ON t.account_id  = a.id`

export async function findTransactions(
  userId: string,
  filter: TxFilter
): Promise<{ data: TransactionRow[]; meta: TxMeta }> {
  const conds: string[] = ['t.user_id = ?']
  const params: unknown[] = [userId]

  if (filter.type)   { conds.push('t.type = ?');           params.push(filter.type) }
  if (filter.month)  { conds.push('MONTH(t.date) = ?');    params.push(filter.month) }
  if (filter.year)   { conds.push('YEAR(t.date) = ?');     params.push(filter.year) }
  if (filter.search) { conds.push('t.note LIKE ?'); params.push(`%${filter.search}%`) }

  const where = conds.join(' AND ')

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM transactions t WHERE ${where}`, params
  )
  const total = (countRows[0] as { total: number }).total
  const offset = (filter.page - 1) * filter.limit

  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_TX} WHERE ${where} ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`,
    [...params, filter.limit, offset]
  )

  return {
    data: rows as TransactionRow[],
    meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) || 1 },
  }
}

export async function findTransactionById(id: string, userId: string): Promise<TransactionRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_TX} WHERE t.id = ? AND t.user_id = ?`, [id, userId]
  )
  return (rows[0] as TransactionRow) ?? null
}

export interface TxData {
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  date: string
  categoryId: string
  accountId: string
}

export async function insertTransaction(userId: string, data: TxData): Promise<TransactionRow> {
  const id = uuidv4()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query<ResultSetHeader>(
      'INSERT INTO transactions (id, user_id, type, amount, note, date, category_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, data.type, data.amount, data.description, data.date, data.categoryId, data.accountId]
    )
    const delta = data.type === 'INCOME' ? data.amount : -data.amount
    await conn.query<ResultSetHeader>(
      'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
      [delta, data.accountId, userId]
    )
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
  return findTransactionById(id, userId) as Promise<TransactionRow>
}

export async function updateTransactionRow(
  id: string,
  userId: string,
  data: TxData,
  existing: TransactionRow
): Promise<TransactionRow> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query<ResultSetHeader>(
      'UPDATE transactions SET type=?, amount=?, note=?, date=?, category_id=?, account_id=? WHERE id=? AND user_id=?',
      [data.type, data.amount, data.description, data.date, data.categoryId, data.accountId, id, userId]
    )
    // Reverse old transaction's effect on the old account
    const oldDelta = existing.type === 'INCOME' ? -existing.amount : existing.amount
    await conn.query<ResultSetHeader>(
      'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
      [oldDelta, existing.account_id, userId]
    )
    // Apply new transaction's effect on the new account
    const newDelta = data.type === 'INCOME' ? data.amount : -data.amount
    await conn.query<ResultSetHeader>(
      'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
      [newDelta, data.accountId, userId]
    )
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
  return findTransactionById(id, userId) as Promise<TransactionRow>
}

export async function deleteTransactionRow(
  id: string,
  userId: string,
  existing: TransactionRow
): Promise<void> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query<ResultSetHeader>(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    )
    // Reverse the deleted transaction's effect on account balance
    const delta = existing.type === 'INCOME' ? -existing.amount : existing.amount
    await conn.query<ResultSetHeader>(
      'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
      [delta, existing.account_id, userId]
    )
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

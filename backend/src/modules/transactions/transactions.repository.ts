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
  await pool.query<ResultSetHeader>(
    'INSERT INTO transactions (id, user_id, type, amount, note, date, category_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userId, data.type, data.amount, data.description, data.date, data.categoryId, data.accountId]
  )
  return findTransactionById(id, userId) as Promise<TransactionRow>
}

export async function updateTransactionRow(id: string, userId: string, data: TxData): Promise<TransactionRow> {
  await pool.query<ResultSetHeader>(
    'UPDATE transactions SET type=?, amount=?, note=?, date=?, category_id=?, account_id=? WHERE id=? AND user_id=?',
    [data.type, data.amount, data.description, data.date, data.categoryId, data.accountId, id, userId]
  )
  return findTransactionById(id, userId) as Promise<TransactionRow>
}

export async function deleteTransactionRow(id: string, userId: string): Promise<void> {
  await pool.query<ResultSetHeader>('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId])
}

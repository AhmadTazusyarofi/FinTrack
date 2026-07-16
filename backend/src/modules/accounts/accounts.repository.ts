import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { pool } from '../../database/connection/db'
import { v4 as uuidv4 } from 'uuid'

export interface AccountRow {
  id: string
  user_id: string
  name: string
  balance: number
  created_at: Date
}

export async function findAccountsByUserId(userId: string): Promise<AccountRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, user_id, name, balance, created_at FROM accounts WHERE user_id = ? ORDER BY name',
    [userId]
  )
  return rows as AccountRow[]
}

export async function createAccount(userId: string, name: string, balance: number): Promise<AccountRow> {
  const id = uuidv4()
  await pool.query<ResultSetHeader>(
    'INSERT INTO accounts (id, user_id, name, balance) VALUES (?, ?, ?, ?)',
    [id, userId, name, balance]
  )
  return { id, user_id: userId, name, balance, created_at: new Date() }
}

export async function updateAccount(id: string, userId: string, name: string, balance: number): Promise<void> {
  await pool.query<ResultSetHeader>(
    'UPDATE accounts SET name = ?, balance = ? WHERE id = ? AND user_id = ?',
    [name, balance, id, userId]
  )
}

export async function deleteAccount(id: string, userId: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    'DELETE FROM accounts WHERE id = ? AND user_id = ?',
    [id, userId]
  )
}

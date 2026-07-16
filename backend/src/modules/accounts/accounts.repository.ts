import { RowDataPacket } from 'mysql2/promise'
import { pool } from '../../database/connection/db'

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

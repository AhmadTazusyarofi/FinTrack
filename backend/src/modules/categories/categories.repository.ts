import { RowDataPacket } from 'mysql2/promise'
import { pool } from '../../database/connection/db'

export interface CategoryRow {
  id: string
  user_id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  created_at: Date
}

export async function findCategoriesByUserId(userId: string): Promise<CategoryRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, user_id, name, type, created_at FROM categories WHERE user_id = ? ORDER BY type, name',
    [userId]
  )
  return rows as CategoryRow[]
}

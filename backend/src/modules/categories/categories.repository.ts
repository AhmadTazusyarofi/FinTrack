import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { pool } from '../../database/connection/db'
import { v4 as uuidv4 } from 'uuid'

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

export async function createCategory(userId: string, name: string, type: 'INCOME' | 'EXPENSE'): Promise<CategoryRow> {
  const id = uuidv4()
  await pool.query<ResultSetHeader>(
    'INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)',
    [id, userId, name, type]
  )
  return { id, user_id: userId, name, type, created_at: new Date() }
}

export async function updateCategory(id: string, userId: string, name: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    'UPDATE categories SET name = ? WHERE id = ? AND user_id = ?',
    [name, id, userId]
  )
}

export async function deleteCategory(id: string, userId: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    'DELETE FROM categories WHERE id = ? AND user_id = ?',
    [id, userId]
  )
}

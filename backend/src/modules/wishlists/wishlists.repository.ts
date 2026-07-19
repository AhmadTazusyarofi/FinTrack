import { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { pool } from '../../database/connection/db'
import { v4 as uuidv4 } from 'uuid'

export interface WishlistRow {
  id: string
  user_id: string
  name: string
  target_price: number
  current_savings: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  notes: string | null
  is_purchased: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface MonthlySaving {
  yr: number
  mo: number
  net_savings: number
}

export async function findWishlists(userId: string): Promise<WishlistRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM wishlists WHERE user_id = ? ORDER BY is_purchased ASC, sort_order ASC, created_at ASC',
    [userId]
  )
  return rows as WishlistRow[]
}

export async function reorderWishlists(userId: string, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    await pool.query<ResultSetHeader>(
      'UPDATE wishlists SET sort_order = ? WHERE id = ? AND user_id = ?',
      [i, ids[i], userId]
    )
  }
}

export async function findWishlistById(id: string, userId: string): Promise<WishlistRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM wishlists WHERE id = ? AND user_id = ?',
    [id, userId]
  )
  return (rows as WishlistRow[])[0] ?? null
}

export async function createWishlist(
  userId: string,
  name: string,
  targetPrice: number,
  currentSavings: number,
  priority: 'LOW' | 'MEDIUM' | 'HIGH',
  notes: string | null
): Promise<WishlistRow> {
  const id = uuidv4()
  await pool.query<ResultSetHeader>(
    `INSERT INTO wishlists (id, user_id, name, target_price, current_savings, priority, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, name, targetPrice, currentSavings, priority, notes]
  )
  return (await findWishlistById(id, userId))!
}

export async function updateWishlist(
  id: string,
  userId: string,
  name: string,
  targetPrice: number,
  currentSavings: number,
  priority: 'LOW' | 'MEDIUM' | 'HIGH',
  notes: string | null
): Promise<WishlistRow | null> {
  await pool.query<ResultSetHeader>(
    `UPDATE wishlists SET name=?, target_price=?, current_savings=?, priority=?, notes=?
     WHERE id = ? AND user_id = ?`,
    [name, targetPrice, currentSavings, priority, notes, id, userId]
  )
  return findWishlistById(id, userId)
}

export async function markPurchased(id: string, userId: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    'UPDATE wishlists SET is_purchased = 1 WHERE id = ? AND user_id = ?',
    [id, userId]
  )
}

export async function deleteWishlist(id: string, userId: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    'DELETE FROM wishlists WHERE id = ? AND user_id = ?',
    [id, userId]
  )
}

export async function getMonthlyNetSavings(userId: string, limitMonths: number): Promise<MonthlySaving[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       YEAR(date)  AS yr,
       MONTH(date) AS mo,
       SUM(CASE WHEN type = 'INCOME'  THEN amount ELSE 0 END) -
       SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS net_savings
     FROM transactions
     WHERE user_id = ?
       AND date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY YEAR(date), MONTH(date)
     ORDER BY yr DESC, mo DESC`,
    [userId, limitMonths]
  )
  return rows as MonthlySaving[]
}

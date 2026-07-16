import { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { pool } from '../../database/connection/db'
import { v4 as uuidv4 } from 'uuid'

export interface BudgetWithSpending {
  id: string
  category_id: string
  category_name: string
  amount: number
  spent: number
  month: number
  year: number
}

export async function findBudgetsWithSpending(
  userId: string, month: number, year: number
): Promise<BudgetWithSpending[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT b.id, b.category_id, c.name as category_name,
            b.amount, b.month, b.year,
            COALESCE(SUM(t.amount), 0) as spent
     FROM budgets b
     LEFT JOIN categories c ON b.category_id = c.id
     LEFT JOIN transactions t
       ON t.category_id = b.category_id AND t.user_id = b.user_id
       AND t.type = 'EXPENSE' AND MONTH(t.date) = b.month AND YEAR(t.date) = b.year
     WHERE b.user_id = ? AND b.month = ? AND b.year = ?
     GROUP BY b.id, b.category_id, c.name, b.amount, b.month, b.year`,
    [userId, month, year]
  )
  return rows as BudgetWithSpending[]
}

export async function upsertBudget(
  userId: string, categoryId: string, amount: number, month: number, year: number
): Promise<void> {
  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM budgets WHERE user_id=? AND category_id=? AND month=? AND year=?',
    [userId, categoryId, month, year]
  )
  if ((existing as RowDataPacket[]).length > 0) {
    await pool.query<ResultSetHeader>(
      'UPDATE budgets SET amount=? WHERE user_id=? AND category_id=? AND month=? AND year=?',
      [amount, userId, categoryId, month, year]
    )
  } else {
    await pool.query<ResultSetHeader>(
      'INSERT INTO budgets (id, user_id, category_id, amount, month, year) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, categoryId, amount, month, year]
    )
  }
}

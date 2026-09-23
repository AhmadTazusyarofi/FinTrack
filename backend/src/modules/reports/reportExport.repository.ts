import { RowDataPacket } from 'mysql2/promise'
import { pool } from '../../database/connection/db'
import { ReportTransaction } from './reportExport.types'

export async function findReportTransactions(userId: string, start: string, end: string): Promise<ReportTransaction[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.date, t.type, CAST(t.amount AS CHAR) AS amount,
            t.note AS description, COALESCE(c.name, 'Tanpa kategori') AS category,
            COALESCE(a.name, 'Tanpa rekening') AS account
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
     LEFT JOIN accounts a ON a.id = t.account_id AND a.user_id = t.user_id
     WHERE t.user_id = ? AND t.date >= ? AND t.date < ?
     ORDER BY t.date ASC, t.created_at ASC, t.id ASC`,
    [userId, start, end]
  )
  return rows as ReportTransaction[]
}

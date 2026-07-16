import { RowDataPacket } from 'mysql2/promise'
import { pool } from '../../database/connection/db'

export interface MonthlyChartEntry { month: string; income: number; expense: number }
export interface RecentTx { id: string; type: 'INCOME'|'EXPENSE'; amount: number; description: string; date: string; category_name: string; account_name: string }
export interface SummaryData { totalIncome: number; totalExpense: number; balance: number; monthlyChart: MonthlyChartEntry[]; recentTransactions: RecentTx[] }

export async function getSummaryData(userId: string, month: number, year: number): Promise<SummaryData> {
  const [totalsRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COALESCE(SUM(CASE WHEN type='INCOME'  THEN amount ELSE 0 END), 0) as total_income,
       COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END), 0) as total_expense
     FROM transactions WHERE user_id=? AND MONTH(date)=? AND YEAR(date)=?`,
    [userId, month, year]
  )
  const totals = totalsRows[0] as { total_income: number; total_expense: number }

  const [chartRows] = await pool.query<RowDataPacket[]>(
    `SELECT MONTH(date) as m,
            COALESCE(SUM(CASE WHEN type='INCOME'  THEN amount ELSE 0 END),0) as income,
            COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END),0) as expense
     FROM transactions WHERE user_id=? AND YEAR(date)=?
     GROUP BY MONTH(date)`,
    [userId, year]
  )
  const chartMap: Record<number, { income: number; expense: number }> = {}
  for (const r of chartRows as { m: number; income: number; expense: number }[]) {
    chartMap[r.m] = { income: Number(r.income), expense: Number(r.expense) }
  }
  const monthlyChart: MonthlyChartEntry[] = Array.from({ length: 12 }, (_, i) => ({
    month: `${year}-${String(i + 1).padStart(2, '0')}`,
    income: chartMap[i + 1]?.income ?? 0,
    expense: chartMap[i + 1]?.expense ?? 0,
  }))

  const [recentRows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.type, t.amount, t.note as description, t.date,
            c.name as category_name, a.name as account_name
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts   a ON t.account_id  = a.id
     WHERE t.user_id=? ORDER BY t.date DESC, t.created_at DESC LIMIT 5`,
    [userId]
  )

  const totalIncome  = Number(totals.total_income)
  const totalExpense = Number(totals.total_expense)
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense, monthlyChart, recentTransactions: recentRows as RecentTx[] }
}

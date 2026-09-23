import { RowDataPacket } from 'mysql2/promise'
import { pool } from '../../database/connection/db'
import { periodRange } from '../../utils/payPeriod'

export interface MonthlyChartEntry { month: string; income: number; expense: number }
export interface RecentTx { id: string; type: 'INCOME'|'EXPENSE'; amount: number; description: string; date: string; category_name: string; account_name: string }
export interface SummaryData { totalIncome: number; totalExpense: number; previousPeriodIncome: number; balance: number; monthlyChart: MonthlyChartEntry[]; recentTransactions: RecentTx[] }

export async function getSummaryData(userId: string, period: { start: string; end: string; day: number; year: number; month: number }): Promise<SummaryData> {
  const { year } = period
  const [totalsRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COALESCE(SUM(CASE WHEN type='INCOME'  THEN amount ELSE 0 END), 0) as total_income,
       COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END), 0) as total_expense
     FROM transactions WHERE user_id=? AND date >= ? AND date < ?`,
    [userId, period.start, period.end]
  )
  const totals = totalsRows[0] as { total_income: number; total_expense: number }

  const previous = periodRange(year, period.month - 1, period.day)
  const [previousRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(amount), 0) AS previous_income FROM transactions
     WHERE user_id = ? AND type = 'INCOME' AND date >= ? AND date < ?`,
    [userId, previous.start, previous.end]
  )

  const [chartRows] = await pool.query<RowDataPacket[]>(
    `SELECT MONTH(CASE WHEN DAY(date) >= LEAST(?, DAY(LAST_DAY(date)))
                       THEN date ELSE DATE_SUB(date, INTERVAL 1 MONTH) END) as m,
            COALESCE(SUM(CASE WHEN type='INCOME'  THEN amount ELSE 0 END),0) as income,
            COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END),0) as expense
     FROM transactions WHERE user_id=? AND date >= ? AND date < ?
     GROUP BY m`,
    [period.day, userId, periodRange(year, 1, period.day).start, periodRange(year + 1, 1, period.day).start]
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
     WHERE t.user_id=? AND t.date >= ? AND t.date < ? ORDER BY t.date DESC, t.created_at DESC LIMIT 5`,
    [userId, period.start, period.end]
  )

  const totalIncome  = Number(totals.total_income)
  const totalExpense = Number(totals.total_expense)
  return { totalIncome, totalExpense, previousPeriodIncome: Number(previousRows[0].previous_income), balance: totalIncome - totalExpense, monthlyChart, recentTransactions: recentRows as RecentTx[] }
}

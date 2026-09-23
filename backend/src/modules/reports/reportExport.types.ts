export type ReportMode = 'salary' | 'calendar'
export interface ReportSelection { mode: ReportMode; month: number; year: number }
export interface ReportTransaction {
  id: string
  date: string
  type: 'INCOME' | 'EXPENSE'
  amount: string
  description: string | null
  category: string
  account: string
}
export interface ReportCategory { name: string; type: 'INCOME' | 'EXPENSE'; amount: string; count: number }
export interface ExportReport {
  selection: ReportSelection
  name: string
  payday: number | null
  start: string
  end: string // exclusive
  generatedAt: Date
  transactions: ReportTransaction[]
  income: string
  expense: string
  net: string
  incomeCount: number
  expenseCount: number
  categories: ReportCategory[]
}

export type TransactionType = 'INCOME' | 'EXPENSE'

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface Category {
  id: string
  userId: string
  name: string
  type: TransactionType
  createdAt: string
}

export interface Account {
  id: string
  userId: string
  name: string
  balance: number
  createdAt: string
}

export interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  date: string
  categoryId: string
  categoryName?: string
  accountId: string
  accountName?: string
  createdAt: string
  updatedAt: string
}

export interface Budget {
  id: string
  userId: string
  categoryId: string
  category?: Category
  amount: number
  month: number
  year: number
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface TransactionFilter {
  type?: 'INCOME' | 'EXPENSE'
  month?: number
  year?: number
  search?: string
  page?: number
  limit?: number
}

export interface BudgetWithSpending {
  id: string
  categoryId: string
  categoryName: string
  amount: number
  spent: number
  month: number
  year: number
}

export interface MonthlyChartEntry {
  month: string
  income: number
  expense: number
}

export interface ReportSummary {
  totalIncome: number
  totalExpense: number
  balance: number
  monthlyChart: MonthlyChartEntry[]
  recentTransactions: Transaction[]
}

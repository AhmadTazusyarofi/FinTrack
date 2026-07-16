export type TransactionType = 'INCOME' | 'EXPENSE'

export interface JwtPayload {
  userId: string
}

export interface PaginationQuery {
  page?: number
  limit?: number
}

export interface TransactionFilter extends PaginationQuery {
  type?: TransactionType
  categoryId?: string
  accountId?: string
  startDate?: string
  endDate?: string
}

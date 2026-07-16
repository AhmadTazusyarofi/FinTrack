import api from './api'
import { ApiResponse, Transaction, TransactionFilter } from '../types'

interface PaginatedTx {
  data: Transaction[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): Transaction {
  return {
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    description: r.description,
    date: (r.date as string).split('T')[0],
    categoryId:   r.category_id   ?? r.categoryId   ?? '',
    categoryName: r.category_name ?? r.categoryName,
    accountId:    r.account_id    ?? r.accountId    ?? '',
    accountName:  r.account_name  ?? r.accountName,
    createdAt: r.created_at ?? r.createdAt ?? '',
    updatedAt: r.updated_at ?? r.updatedAt ?? '',
  }
}

export async function getTransactions(filter: TransactionFilter = {}): Promise<PaginatedTx> {
  const params = new URLSearchParams()
  if (filter.type)   params.set('type',   filter.type)
  if (filter.month)  params.set('month',  String(filter.month))
  if (filter.year)   params.set('year',   String(filter.year))
  if (filter.search) params.set('search', filter.search)
  params.set('page',  String(filter.page  ?? 1))
  params.set('limit', String(filter.limit ?? 10))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<ApiResponse<{ data: any[]; meta: PaginatedTx['meta'] }>>(`/transactions?${params}`)
  return { data: res.data.data.data.map(mapRow), meta: res.data.data.meta }
}

export interface TxPayload {
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  date: string
  categoryId: string
  accountId: string
}

export async function createTransaction(data: TxPayload): Promise<Transaction> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<ApiResponse<any>>('/transactions', data)
  return mapRow(res.data.data)
}

export async function updateTransaction(id: string, data: TxPayload): Promise<Transaction> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.put<ApiResponse<any>>(`/transactions/${id}`, data)
  return mapRow(res.data.data)
}

export async function deleteTransaction(id: string): Promise<void> {
  await api.delete(`/transactions/${id}`)
}

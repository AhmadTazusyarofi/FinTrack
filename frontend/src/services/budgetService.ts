import api from './api'
import { ApiResponse, BudgetWithSpending } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBudget(r: any): BudgetWithSpending {
  return {
    id:           r.id,
    categoryId:   r.category_id   ?? r.categoryId,
    categoryName: r.category_name ?? r.categoryName,
    amount: Number(r.amount),
    spent:  Number(r.spent),
    month:  Number(r.month),
    year:   Number(r.year),
  }
}

export async function getBudgets(month: number, year: number): Promise<BudgetWithSpending[]> {
  const res = await api.get<ApiResponse<unknown[]>>(`/budgets?month=${month}&year=${year}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data.data as any[]).map(mapBudget)
}

export async function setBudget(data: {
  categoryId: string; amount: number; month: number; year: number
}): Promise<void> {
  await api.post('/budgets', data)
}

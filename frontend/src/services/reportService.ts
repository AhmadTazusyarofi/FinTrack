import api from './api'
import { ApiResponse, ReportSummary, Transaction } from '../types'

export async function getReportSummary(month: number, year: number): Promise<ReportSummary> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<ApiResponse<any>>(`/reports/summary?month=${month}&year=${year}`)
  const d = res.data.data
  return {
    totalIncome:  Number(d.totalIncome),
    totalExpense: Number(d.totalExpense),
    balance:      Number(d.balance),
    monthlyChart: d.monthlyChart ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentTransactions: (d.recentTransactions ?? []).map((r: any): Transaction => ({
      id: r.id, type: r.type, amount: Number(r.amount),
      description: r.description, date: (r.date as string).split('T')[0],
      categoryId: r.category_id ?? '', categoryName: r.category_name,
      accountId:  r.account_id  ?? '', accountName:  r.account_name,
      createdAt: r.created_at ?? '', updatedAt: r.updated_at ?? '',
    })),
  }
}

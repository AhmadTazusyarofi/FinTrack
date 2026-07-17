import api from './api'
import { ApiResponse, Debt, DebtPayment, DebtType, DebtStatus } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPayment(r: any): DebtPayment {
  return {
    id:            r.id,
    debtId:        r.debt_id        ?? r.debtId        ?? '',
    accountId:     r.account_id     ?? r.accountId     ?? '',
    accountName:   r.account_name   ?? r.accountName   ?? '',
    transactionId: r.transaction_id ?? r.transactionId ?? null,
    amount:        Number(r.amount),
    date:          (r.date as string).split('T')[0],
    note:          r.note ?? null,
    createdAt:     r.created_at     ?? r.createdAt     ?? '',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDebt(r: any): Debt {
  return {
    id:         r.id,
    userId:     r.user_id     ?? r.userId     ?? '',
    type:       r.type,
    personName: r.person_name ?? r.personName,
    amount:     Number(r.amount),
    paidAmount: Number(r.paid_amount ?? r.paidAmount ?? 0),
    dueDate:    r.due_date ? String(r.due_date).split('T')[0] : (r.dueDate ? String(r.dueDate).split('T')[0] : null),
    note:       r.note        ?? null,
    status:     r.status,
    createdAt:  r.created_at  ?? r.createdAt  ?? '',
    updatedAt:  r.updated_at  ?? r.updatedAt  ?? '',
    payments:   Array.isArray(r.payments) ? r.payments.map(mapPayment) : undefined,
  }
}

export async function getDebts(type?: DebtType, status?: DebtStatus): Promise<Debt[]> {
  const params = new URLSearchParams()
  if (type)   params.set('type',   type)
  if (status) params.set('status', status)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<ApiResponse<any[]>>(`/debts?${params}`)
  return res.data.data.map(mapDebt)
}

export async function getDebtById(id: string): Promise<Debt> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<ApiResponse<any>>(`/debts/${id}`)
  return mapDebt(res.data.data)
}

export interface DebtPayload {
  type: DebtType
  personName: string
  amount: number
  dueDate: string | null
  note: string | null
}

export async function createDebt(data: DebtPayload): Promise<Debt> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<ApiResponse<any>>('/debts', data)
  return mapDebt(res.data.data)
}

export interface DebtEditPayload {
  personName: string
  dueDate: string | null
  note: string | null
}

export async function updateDebt(id: string, data: DebtEditPayload): Promise<Debt> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.patch<ApiResponse<any>>(`/debts/${id}`, data)
  return mapDebt(res.data.data)
}

export async function deleteDebt(id: string): Promise<void> {
  await api.delete(`/debts/${id}`)
}

export interface PaymentPayload {
  accountId: string
  amount: number
  date: string
  note: string | null
}

export async function createPayment(debtId: string, data: PaymentPayload): Promise<DebtPayment> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<ApiResponse<any>>(`/debts/${debtId}/payments`, data)
  return mapPayment(res.data.data)
}

export async function deletePayment(debtId: string, paymentId: string): Promise<void> {
  await api.delete(`/debts/${debtId}/payments/${paymentId}`)
}

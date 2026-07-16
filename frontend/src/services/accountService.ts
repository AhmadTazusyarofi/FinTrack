import api from './api'
import { ApiResponse, Account } from '../types'

export async function getAccounts(): Promise<Account[]> {
  const res = await api.get<ApiResponse<Account[]>>('/accounts')
  return res.data.data
}

export async function createAccount(name: string, balance: number): Promise<Account> {
  const res = await api.post<ApiResponse<Account>>('/accounts', { name, balance })
  return res.data.data
}

export async function updateAccount(id: string, name: string, balance: number): Promise<void> {
  await api.put(`/accounts/${id}`, { name, balance })
}

export async function deleteAccount(id: string): Promise<void> {
  await api.delete(`/accounts/${id}`)
}

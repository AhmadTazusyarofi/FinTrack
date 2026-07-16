import api from './api'
import { ApiResponse, Account } from '../types'

export async function getAccounts(): Promise<Account[]> {
  const res = await api.get<ApiResponse<Account[]>>('/accounts')
  return res.data.data
}

import api from './api'
import { ApiResponse } from '../types'

export interface ScanResult {
  amount: number
  date: string | null
  description: string
  merchant: string | null
  categoryHint: string
}

export async function scanReceipt(file: File): Promise<ScanResult> {
  const form = new FormData()
  form.append('receipt', file)
  const res = await api.post<ApiResponse<ScanResult>>('/receipts/scan', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}

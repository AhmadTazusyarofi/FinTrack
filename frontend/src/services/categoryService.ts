import api from './api'
import { ApiResponse, Category } from '../types'

export async function getCategories(): Promise<Category[]> {
  const res = await api.get<ApiResponse<Category[]>>('/categories')
  return res.data.data
}

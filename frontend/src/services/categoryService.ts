import api from './api'
import { ApiResponse, Category } from '../types'

export async function getCategories(): Promise<Category[]> {
  const res = await api.get<ApiResponse<Category[]>>('/categories')
  return res.data.data
}

export async function createCategory(name: string, type: 'INCOME' | 'EXPENSE'): Promise<Category> {
  const res = await api.post<ApiResponse<Category>>('/categories', { name, type })
  return res.data.data
}

export async function updateCategory(id: string, name: string): Promise<void> {
  await api.put(`/categories/${id}`, { name })
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${id}`)
}

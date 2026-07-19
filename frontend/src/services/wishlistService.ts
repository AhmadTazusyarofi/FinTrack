import api from './api'
import { ApiResponse, WishlistItem, WishlistPriority, WishlistResponse } from '../types'

function mapItem(r: Record<string, unknown>): WishlistItem {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    targetPrice: Number(r.target_price),
    currentSavings: Number(r.current_savings),
    priority: r.priority as WishlistPriority,
    notes: (r.notes as string | null) ?? null,
    isPurchased: Boolean(r.is_purchased),
    sortOrder: Number(r.sort_order ?? 0),
    remaining: Number(r.remaining ?? 0),
    avgMonthlySavings: Number(r.avg_monthly_savings ?? 0),
    monthsNeeded: r.months_needed != null ? Number(r.months_needed) : null,
    estimatedDate: (r.estimated_date as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export async function getWishlists(): Promise<WishlistResponse> {
  const res = await api.get<ApiResponse<{ items: unknown[]; avgMonthlySavings: number }>>('/wishlists')
  const data = res.data.data
  return {
    items: data.items.map((i) => mapItem(i as Record<string, unknown>)),
    avgMonthlySavings: Number(data.avgMonthlySavings),
  }
}

export interface WishlistPayload {
  name: string
  target_price: number
  current_savings: number
  priority: WishlistPriority
  notes: string | null
}

export async function createWishlist(payload: WishlistPayload): Promise<WishlistItem> {
  const res = await api.post<ApiResponse<unknown>>('/wishlists', payload)
  return mapItem(res.data.data as Record<string, unknown>)
}

export async function updateWishlist(id: string, payload: WishlistPayload): Promise<WishlistItem> {
  const res = await api.put<ApiResponse<unknown>>(`/wishlists/${id}`, payload)
  return mapItem(res.data.data as Record<string, unknown>)
}

export async function purchaseWishlist(id: string): Promise<WishlistItem> {
  const res = await api.patch<ApiResponse<unknown>>(`/wishlists/${id}/purchase`)
  return mapItem(res.data.data as Record<string, unknown>)
}

export async function deleteWishlist(id: string): Promise<void> {
  await api.delete(`/wishlists/${id}`)
}

export async function reorderWishlists(ids: string[]): Promise<void> {
  await api.patch('/wishlists/reorder', { ids })
}

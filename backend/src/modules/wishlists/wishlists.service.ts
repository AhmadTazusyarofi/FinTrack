import {
  findWishlists,
  findWishlistById,
  createWishlist,
  updateWishlist,
  markPurchased,
  deleteWishlist,
  reorderWishlists,
  getMonthlyNetSavings,
  WishlistRow,
} from './wishlists.repository'

export interface WishlistWithAffordability extends WishlistRow {
  remaining: number
  avg_monthly_savings: number
  months_needed: number | null
  estimated_date: string | null
}

function calcEstimatedDate(monthsNeeded: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + monthsNeeded)
  return d.toISOString().slice(0, 7) // YYYY-MM
}

export async function getWishlists(userId: string): Promise<{
  items: WishlistWithAffordability[]
  avgMonthlySavings: number
}> {
  const [items, monthlyData] = await Promise.all([
    findWishlists(userId),
    getMonthlyNetSavings(userId, 6),
  ])

  const avgMonthlySavings =
    monthlyData.length > 0
      ? monthlyData.reduce((s, m) => s + Number(m.net_savings), 0) / monthlyData.length
      : 0

  const enriched: WishlistWithAffordability[] = items.map((item) => {
    const remaining = Math.max(0, Number(item.target_price) - Number(item.current_savings))
    const monthsNeeded =
      avgMonthlySavings > 0 ? Math.ceil(remaining / avgMonthlySavings) : null
    const estimatedDate = monthsNeeded != null ? calcEstimatedDate(monthsNeeded) : null
    return { ...item, remaining, avg_monthly_savings: avgMonthlySavings, months_needed: monthsNeeded, estimated_date: estimatedDate }
  })

  return { items: enriched, avgMonthlySavings }
}

export async function createWishlistItem(
  userId: string,
  name: string,
  targetPrice: number,
  currentSavings: number,
  priority: 'LOW' | 'MEDIUM' | 'HIGH',
  notes: string | null
) {
  return createWishlist(userId, name, targetPrice, currentSavings, priority, notes)
}

export async function updateWishlistItem(
  id: string,
  userId: string,
  name: string,
  targetPrice: number,
  currentSavings: number,
  priority: 'LOW' | 'MEDIUM' | 'HIGH',
  notes: string | null
) {
  return updateWishlist(id, userId, name, targetPrice, currentSavings, priority, notes)
}

export async function purchaseWishlistItem(id: string, userId: string) {
  const item = await findWishlistById(id, userId)
  if (!item) return null
  await markPurchased(id, userId)
  return findWishlistById(id, userId)
}

export async function deleteWishlistItem(id: string, userId: string) {
  await deleteWishlist(id, userId)
}

export async function reorderWishlistItems(userId: string, ids: string[]) {
  await reorderWishlists(userId, ids)
}

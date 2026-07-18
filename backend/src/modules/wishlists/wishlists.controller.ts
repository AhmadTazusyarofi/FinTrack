import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth.middleware'
import { sendSuccess, sendError } from '../../utils/response'
import {
  getWishlists,
  createWishlistItem,
  updateWishlistItem,
  purchaseWishlistItem,
  deleteWishlistItem,
} from './wishlists.service'

const wishlistSchema = z.object({
  name: z.string().min(1, 'Nama barang wajib diisi'),
  target_price: z.number({ invalid_type_error: 'Harga target harus berupa angka' }).positive('Harga target harus lebih dari 0'),
  current_savings: z.number().min(0).default(0),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  notes: z.string().nullable().optional(),
})

export async function getWishlistsController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await getWishlists(req.userId!)
    sendSuccess(res, result)
  } catch (err) {
    sendError(res, 'Gagal memuat wishlist', 500)
  }
}

export async function createWishlistController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = wishlistSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 422)
      return
    }
    const { name, target_price, current_savings, priority, notes } = parsed.data
    const item = await createWishlistItem(req.userId!, name, target_price, current_savings, priority, notes ?? null)
    sendSuccess(res, item, undefined, 201)
  } catch (err) {
    sendError(res, 'Gagal membuat wishlist item', 500)
  }
}

export async function updateWishlistController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = wishlistSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 422)
      return
    }
    const { name, target_price, current_savings, priority, notes } = parsed.data
    const item = await updateWishlistItem(req.params.id, req.userId!, name, target_price, current_savings, priority, notes ?? null)
    if (!item) { sendError(res, 'Wishlist item tidak ditemukan', 404); return }
    sendSuccess(res, item)
  } catch (err) {
    sendError(res, 'Gagal memperbarui wishlist item', 500)
  }
}

export async function purchaseWishlistController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const item = await purchaseWishlistItem(req.params.id, req.userId!)
    if (!item) { sendError(res, 'Wishlist item tidak ditemukan', 404); return }
    sendSuccess(res, item)
  } catch (err) {
    sendError(res, 'Gagal menandai item sebagai terbeli', 500)
  }
}

export async function deleteWishlistController(req: AuthRequest, res: Response): Promise<void> {
  try {
    await deleteWishlistItem(req.params.id, req.userId!)
    sendSuccess(res, null)
  } catch (err) {
    sendError(res, 'Gagal menghapus wishlist item', 500)
  }
}

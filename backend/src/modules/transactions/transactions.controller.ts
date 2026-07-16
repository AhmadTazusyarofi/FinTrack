import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getTransactions, addTransaction, editTransaction, removeTransaction } from './transactions.service'
import { sendSuccess, sendError } from '../../utils/response'

const txSchema = z.object({
  type:        z.enum(['INCOME', 'EXPENSE']),
  amount:      z.number().positive('Jumlah harus lebih dari 0'),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  categoryId:  z.string().uuid('Category tidak valid'),
  accountId:   z.string().uuid('Account tidak valid'),
})

export async function getTransactionsController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 10)
    const result = await getTransactions(req.userId!, {
      page, limit,
      type:   req.query.type   as 'INCOME' | 'EXPENSE' | undefined,
      month:  req.query.month  ? parseInt(req.query.month  as string) : undefined,
      year:   req.query.year   ? parseInt(req.query.year   as string) : undefined,
      search: req.query.search as string | undefined,
    })
    sendSuccess(res, result)
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 500)
  }
}

export async function createTransactionController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = txSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const tx = await addTransaction(req.userId!, parsed.data)
    sendSuccess(res, tx, 'Transaksi berhasil dibuat', 201)
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function updateTransactionController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = txSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const tx = await editTransaction(req.params.id, req.userId!, parsed.data)
    sendSuccess(res, tx, 'Transaksi berhasil diupdate')
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function deleteTransactionController(req: AuthRequest, res: Response): Promise<void> {
  try {
    await removeTransaction(req.params.id, req.userId!)
    sendSuccess(res, null, 'Transaksi berhasil dihapus')
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

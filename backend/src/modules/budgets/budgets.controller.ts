import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getBudgets, setBudget } from './budgets.service'
import { sendSuccess, sendError } from '../../utils/response'

const budgetSchema = z.object({
  categoryId: z.string().uuid('Category tidak valid'),
  amount:     z.number().positive('Jumlah harus lebih dari 0'),
  month:      z.number().int().min(1).max(12),
  year:       z.number().int().min(2000).max(2100),
})

export async function getBudgetsController(req: AuthRequest, res: Response): Promise<void> {
  const now   = new Date()
  const month = parseInt(req.query.month as string) || (now.getMonth() + 1)
  const year  = parseInt(req.query.year  as string) || now.getFullYear()
  try {
    const budgets = await getBudgets(req.userId!, month, year)
    sendSuccess(res, budgets)
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 500)
  }
}

export async function setBudgetController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = budgetSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const { categoryId, amount, month, year } = parsed.data
    await setBudget(req.userId!, categoryId, amount, month, year)
    sendSuccess(res, null, 'Anggaran berhasil disimpan')
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

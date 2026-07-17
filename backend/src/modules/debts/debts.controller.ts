import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth.middleware'
import { sendSuccess, sendError } from '../../utils/response'
import { getDebts, getDebtWithPayments, createDebt, editDebt, removeDebt, addPayment, removePayment } from './debts.service'
import { DebtType, DebtStatus } from './debts.repository'

const debtSchema = z.object({
  type:       z.enum(['PAYABLE', 'RECEIVABLE']),
  personName: z.string().min(1, 'Nama wajib diisi'),
  amount:     z.number().positive('Jumlah harus lebih dari 0'),
  dueDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  note:       z.string().nullish(),
})

const editDebtSchema = z.object({
  personName: z.string().min(1, 'Nama wajib diisi'),
  dueDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  note:       z.string().nullish(),
})

const paymentSchema = z.object({
  accountId: z.string().uuid('Account tidak valid'),
  amount:    z.number().positive('Jumlah harus lebih dari 0'),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  note:      z.string().nullish(),
})

export async function getDebtsController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const type   = req.query.type   as DebtType   | undefined
    const status = req.query.status as DebtStatus | undefined
    const data = await getDebts(req.userId!, type, status)
    sendSuccess(res, data)
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 500)
  }
}

export async function getDebtByIdController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await getDebtWithPayments(req.params.id, req.userId!)
    sendSuccess(res, data)
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function createDebtController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = debtSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const debt = await createDebt(req.userId!, {
      type:       parsed.data.type,
      personName: parsed.data.personName,
      amount:     parsed.data.amount,
      dueDate:    parsed.data.dueDate ?? null,
      note:       parsed.data.note ?? null,
    })
    sendSuccess(res, debt, 'Berhasil ditambahkan', 201)
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function updateDebtController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = editDebtSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const debt = await editDebt(req.params.id, req.userId!, {
      personName: parsed.data.personName,
      dueDate:    parsed.data.dueDate ?? null,
      note:       parsed.data.note ?? null,
    })
    sendSuccess(res, debt, 'Berhasil diupdate')
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function deleteDebtController(req: AuthRequest, res: Response): Promise<void> {
  try {
    await removeDebt(req.params.id, req.userId!)
    sendSuccess(res, null, 'Berhasil dihapus')
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function createPaymentController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = paymentSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const payment = await addPayment(req.params.id, req.userId!, {
      accountId: parsed.data.accountId,
      amount:    parsed.data.amount,
      date:      parsed.data.date,
      note:      parsed.data.note ?? null,
    })
    sendSuccess(res, payment, 'Cicilan berhasil ditambahkan', 201)
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function deletePaymentController(req: AuthRequest, res: Response): Promise<void> {
  try {
    await removePayment(req.params.id, req.params.pid, req.userId!)
    sendSuccess(res, null, 'Cicilan berhasil dihapus')
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getAccounts, createAccountService, updateAccountService, deleteAccountService } from './accounts.service'
import { sendSuccess, sendError } from '../../utils/response'

const createSchema = z.object({
  name: z.string().min(1, 'Nama akun wajib diisi'),
  balance: z.number({ invalid_type_error: 'Saldo harus berupa angka' }).min(0, 'Saldo tidak boleh negatif'),
})

const updateSchema = z.object({
  name: z.string().min(1, 'Nama akun wajib diisi'),
  balance: z.number({ invalid_type_error: 'Saldo harus berupa angka' }).min(0, 'Saldo tidak boleh negatif'),
})

export async function getAccountsController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const accounts = await getAccounts(req.userId!)
    sendSuccess(res, accounts)
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 500)
  }
}

export async function createAccountController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const account = await createAccountService(req.userId!, parsed.data.name, parsed.data.balance)
    sendSuccess(res, account, 'Akun berhasil ditambahkan', 201)
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function updateAccountController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    await updateAccountService(req.params.id, req.userId!, parsed.data.name, parsed.data.balance)
    sendSuccess(res, null, 'Akun berhasil diperbarui')
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function deleteAccountController(req: AuthRequest, res: Response): Promise<void> {
  try {
    await deleteAccountService(req.params.id, req.userId!)
    sendSuccess(res, null, 'Akun berhasil dihapus')
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

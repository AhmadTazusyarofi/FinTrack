import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getAccounts } from './accounts.service'
import { sendSuccess, sendError } from '../../utils/response'

export async function getAccountsController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const accounts = await getAccounts(req.userId!)
    sendSuccess(res, accounts)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    sendError(res, message, 500)
  }
}

import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getCategories } from './categories.service'
import { sendSuccess, sendError } from '../../utils/response'

export async function getCategoriesController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const categories = await getCategories(req.userId!)
    sendSuccess(res, categories)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    sendError(res, message, 500)
  }
}

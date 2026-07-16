import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getReportSummary } from './reports.service'
import { sendSuccess, sendError } from '../../utils/response'

export async function getSummaryController(req: AuthRequest, res: Response): Promise<void> {
  const now   = new Date()
  const month = parseInt(req.query.month as string) || (now.getMonth() + 1)
  const year  = parseInt(req.query.year  as string) || now.getFullYear()
  try {
    const summary = await getReportSummary(req.userId!, month, year)
    sendSuccess(res, summary)
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 500)
  }
}

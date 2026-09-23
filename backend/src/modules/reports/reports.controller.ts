import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getReportSummary } from './reports.service'
import { sendSuccess, sendError } from '../../utils/response'

export async function getSummaryController(req: AuthRequest, res: Response): Promise<void> {
  const month = req.query.month === undefined ? undefined : Number(req.query.month)
  const year = req.query.year === undefined ? undefined : Number(req.query.year)
  try {
    const summary = await getReportSummary(req.userId!, month, year)
    sendSuccess(res, summary)
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 500)
  }
}

import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getPeriodSettings, updatePeriodSettings } from './periods.service'
import { sendSuccess, sendError } from '../../utils/response'

export async function getPeriodController(req: AuthRequest, res: Response) {
  try { sendSuccess(res, await getPeriodSettings(req.userId!)) }
  catch (err) { sendError(res, err instanceof Error ? err.message : 'Gagal memuat periode', 500) }
}

export async function updatePeriodController(req: AuthRequest, res: Response) {
  const parsed = z.object({ payday: z.number().int().min(1).max(31) }).safeParse(req.body)
  if (!parsed.success) { sendError(res, 'Pilih tanggal gajian 1–31', 422); return }
  try { sendSuccess(res, await updatePeriodSettings(req.userId!, parsed.data.payday)) }
  catch (err) { sendError(res, err instanceof Error ? err.message : 'Gagal menyimpan periode', (err as { status?: number }).status ?? 500) }
}

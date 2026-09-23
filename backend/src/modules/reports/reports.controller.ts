import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getReportSummary } from './reports.service'
import { sendSuccess, sendError } from '../../utils/response'
import { z } from 'zod'
import { getExportReport } from './reportExport.service'
import { createReportPdf } from './reportExport.pdf'

const exportSchema = z.object({
  mode: z.enum(['salary', 'calendar']),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
})

export async function exportPdfController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = exportSchema.safeParse(req.query)
  if (!parsed.success) { sendError(res, 'Pilih jenis periode, bulan, dan tahun laporan yang valid.', 422); return }
  try {
    const report = await getExportReport(req.userId!, parsed.data)
    const pdf = await createReportPdf(report)
    const filename = `BukuKasKu-${parsed.data.mode === 'salary' ? 'periode-gaji' : 'bulanan'}-${parsed.data.year}-${String(parsed.data.month).padStart(2, '0')}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.send(pdf)
  } catch (err) {
    sendError(res, 'Laporan PDF belum dapat dibuat. Silakan coba lagi.', 500)
  }
}

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

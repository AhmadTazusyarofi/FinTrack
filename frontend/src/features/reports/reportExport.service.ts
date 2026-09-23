import api from '../../services/api'

export type ReportMode = 'salary' | 'calendar'
export interface ReportSelection { mode: ReportMode; month: number; year: number }

export async function downloadReportPdf(selection: ReportSelection, signal?: AbortSignal): Promise<void> {
  try {
    const response = await api.get<Blob>('/reports/pdf', { params: selection, responseType: 'blob', signal, timeout: 120_000 })
    if (!response.data.type.includes('application/pdf')) throw new Error('Server tidak mengembalikan file PDF. Silakan coba lagi.')
    const url = URL.createObjectURL(response.data)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `BukuKasKu-${selection.mode === 'salary' ? 'periode-gaji' : 'bulanan'}-${selection.year}-${String(selection.month).padStart(2, '0')}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    if (signal?.aborted) throw err
    const response = (err as { response?: { data?: Blob; status?: number } }).response
    if (response?.data instanceof Blob) {
      let message = 'Laporan PDF belum dapat dibuat. Silakan coba lagi.'
      try { const body = JSON.parse(await response.data.text()); if (typeof body.message === 'string') message = body.message } catch { /* non-JSON errors */ }
      if (response.status === 404) message = 'Fitur laporan belum tersedia di server. Silakan coba lagi setelah aplikasi diperbarui.'
      throw new Error(message)
    }
    throw err
  }
}

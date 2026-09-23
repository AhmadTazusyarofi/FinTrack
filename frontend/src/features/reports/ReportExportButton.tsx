import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { CalendarDays, Download, FileText, Loader2, X, CheckCircle2 } from 'lucide-react'
import { usePayPeriod } from '../period/PeriodProvider'
import { periodRange } from '../period/payPeriod'
import { downloadReportPdf, ReportMode } from './reportExport.service'

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function ReportExportButton({ month: selectedMonth, year: selectedYear }: { month?: number | ''; year?: number | '' }) {
  const current = usePayPeriod()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ReportMode>('salary')
  const [month, setMonth] = useState(current.month)
  const [year, setYear] = useState(current.year)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])

  function changeOpen(next: boolean) {
    if (busy) return
    if (next) {
      setMonth(selectedMonth || current.month)
      setYear(selectedYear || current.year)
      setMode('salary'); setError(''); setSuccess(false)
    }
    setOpen(next)
  }
  function changeMode(next: ReportMode) {
    setMode(next); setSuccess(false); setError('')
    if (!selectedMonth || !selectedYear) {
      const now = new Date()
      setMonth(next === 'salary' ? current.month : now.getMonth() + 1)
      setYear(next === 'salary' ? current.year : now.getFullYear())
    }
  }
  const range = periodRange(year, month, mode === 'salary' ? current.payday ?? 1 : 1)
  const displayDate = (date: Date) => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const rangeLabel = `${displayDate(new Date(range.start + 'T00:00:00Z'))} – ${displayDate(new Date(Date.parse(range.end + 'T00:00:00Z') - 86_400_000))}`

  async function download() {
    if (busy) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true); setError(''); setSuccess(false)
    try { await downloadReportPdf({ mode, month, year }, controller.signal); if (!controller.signal.aborted) setSuccess(true) }
    catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Gagal mengunduh PDF.') }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-bg/20 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-bold text-brand-bg dark:text-white hover:bg-teal-50 dark:hover:bg-white/10 transition-colors">
          <FileText className="h-4 w-4" /> Cetak PDF
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[80] w-[calc(100%_-_2rem)] max-w-md max-h-[90dvh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white dark:bg-[#1a1f2e] p-6 shadow-2xl text-brand-stroke dark:text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-900/30"><FileText className="h-6 w-6 text-teal-700 dark:text-teal-300" /></div>
            <Dialog.Close disabled={busy} aria-label="Tutup laporan" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <Dialog.Title className="mt-4 text-xl font-bold">Cetak laporan keuangan</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Ringkasan dan seluruh transaksi pemasukan serta pengeluaran dalam satu PDF yang siap dicetak.</Dialog.Description>
          <fieldset disabled={busy} className="mt-6 space-y-4">
            <legend className="mb-2 text-sm font-semibold">Dasar perhitungan</legend>
            <div className="grid grid-cols-2 gap-2">
              {([{ value: 'salary', label: 'Periode gajian' }, { value: 'calendar', label: 'Bulan kalender' }] as const).map(option => (
                <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${mode === option.value ? 'border-teal-700 bg-teal-50 text-teal-900 dark:bg-teal-900/30 dark:text-teal-200' : 'border-slate-200 dark:border-white/10'}`}>
                  <input type="radio" name="report-mode" value={option.value} checked={mode === option.value} onChange={() => changeMode(option.value)} className="accent-teal-700" />{option.label}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2 text-sm font-semibold"><span className="block">{mode === 'salary' ? 'Bulan awal periode' : 'Bulan'}</span>
                <select value={month} onChange={e => { setMonth(Number(e.target.value)); setSuccess(false) }} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1117] p-3">
                  {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm font-semibold"><span className="block">Tahun</span>
                <select value={year} onChange={e => { setYear(Number(e.target.value)); setSuccess(false) }} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1117] p-3">
                  {Array.from({ length: Math.min(2100, new Date().getFullYear() + 1) - 1999 }, (_, i) => 2000 + i).reverse().map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            </div>
          </fieldset>
          <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-white/5 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-500"><CalendarDays className="h-4 w-4" /> Rentang laporan</p>
            <p className="mt-2 text-sm font-bold">{rangeLabel}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{mode === 'salary' ? current.payday === null ? 'Tanggal gajian belum diatur. Laporan menggunakan tanggal 1.' : `Mengikuti tanggal gajian ${current.payday} yang tersimpan di profil.` : 'Mengikuti tanggal pertama sampai terakhir bulan yang dipilih.'}</p>
          </div>
          {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {success && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-teal-700 dark:text-teal-300"><CheckCircle2 className="h-4 w-4 shrink-0" /> PDF sudah diunduh. Buka file untuk mencetak.</p>}
          <button disabled={busy} onClick={download} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-bg px-4 py-3 font-bold text-white disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{busy ? 'Menyiapkan PDF…' : 'Unduh PDF'}
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">Format A4 · Seluruh rekening · Tanpa batas halaman transaksi</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

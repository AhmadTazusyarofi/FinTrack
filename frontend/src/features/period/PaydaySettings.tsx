import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { usePayPeriod } from './PeriodProvider'

export function PaydaySettings({ initial = false }: { initial?: boolean }) {
  const { payday, save } = usePayPeriod()
  const [day, setDay] = useState<string>(payday == null ? '' : String(payday))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!day) return
    setSaving(true)
    setError('')
    setSuccess(false)
    try { await save(Number(day)); setSuccess(true) }
    catch (err) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } }).response
      setError(response?.status === 404
        ? 'Pengaturan periode belum tersedia di server. Kamu tetap bisa menggunakan aplikasi; coba simpan lagi setelah layanan diperbarui.'
        : response?.data?.message || 'Tanggal gajian belum tersimpan. Silakan coba lagi.')
    }
    finally { setSaving(false) }
  }

  return (
    <form id="periode-gaji" onSubmit={submit} className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1f2e] p-5 space-y-4 text-brand-stroke dark:text-white">
      <div className="flex items-center gap-3">
        <CalendarDays className="w-6 h-6 text-teal-600" />
        <h2 className="font-bold text-lg">{initial ? 'Pilih tanggal gajianmu' : 'Periode Gaji'}</h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">Cukup pilih tanggal gajian. Pemasukan, pengeluaran, dan anggaran akan otomatis dihitung mengikuti periode gajimu.</p>
      {payday === null && <p className="text-sm text-slate-500 dark:text-slate-400">Belum diatur. Kamu tetap bisa mencatat transaksi dengan periode mulai tanggal 1 sampai pilihanmu berhasil disimpan.</p>}
      <label className="block text-sm font-semibold" htmlFor="payday">Tanggal gajian setiap bulan</label>
      <select id="payday" required value={day} disabled={saving} onChange={e => { setDay(e.target.value); setSuccess(false) }} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1117] p-3">
        <option value="" disabled>Pilih tanggal</option>
        {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>Tanggal {i + 1}</option>)}
      </select>
      {Number(day) > 28 && <p className="text-xs text-slate-500">Jika tanggal tersebut tidak ada, periode dimulai pada hari terakhir bulan itu.</p>}
      {!initial && <p className="text-xs text-slate-500">Mengubah tanggal akan menghitung ulang pengelompokan laporan, termasuk transaksi lama. Tanggal dan nominal transaksi tetap.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {success && <p role="status" className="text-sm text-teal-600">Tanggal gajian tersimpan.</p>}
      <button type="submit" disabled={saving || !day} className="w-full rounded-xl bg-brand-bg px-4 py-3 font-bold text-white disabled:opacity-50">{saving ? 'Menyimpan…' : initial ? 'Simpan & mulai' : 'Simpan tanggal gajian'}</button>
    </form>
  )
}

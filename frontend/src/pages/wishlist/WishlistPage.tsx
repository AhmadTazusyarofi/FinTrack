import { useState, useEffect } from 'react'
import { Plus, X, Pencil, Trash2, ShoppingBag, CheckCircle2, MoreHorizontal } from 'lucide-react'
import { WishlistItem, WishlistPriority } from '../../types'
import {
  getWishlists,
  createWishlist,
  updateWishlist,
  purchaseWishlist,
  deleteWishlist,
  WishlistPayload,
} from '../../services/wishlistService'

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

const PRIORITY_CONFIG = {
  HIGH:   { label: 'Tinggi',  bg: 'bg-red-50 dark:bg-red-500/10',    text: 'text-red-600 dark:text-red-400' },
  MEDIUM: { label: 'Sedang', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  LOW:    { label: 'Rendah',  bg: 'bg-slate-100 dark:bg-white/5',     text: 'text-slate-500 dark:text-slate-400' },
}

function formatEstimatedDate(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

interface FormState {
  name: string
  target_price: string
  current_savings: string
  priority: WishlistPriority
  notes: string
}

const emptyForm: FormState = {
  name: '',
  target_price: '',
  current_savings: '',
  priority: 'MEDIUM',
  notes: '',
}

export function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [avgMonthlySavings, setAvgMonthlySavings] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await getWishlists()
      setItems(res.items)
      setAvgMonthlySavings(res.avgMonthlySavings)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditingItem(null)
    setForm(emptyForm)
    setError(null)
    setIsOpen(true)
  }

  function openEdit(item: WishlistItem) {
    setEditingItem(item)
    setForm({
      name: item.name,
      target_price: String(item.targetPrice),
      current_savings: String(item.currentSavings),
      priority: item.priority,
      notes: item.notes ?? '',
    })
    setError(null)
    setIsOpen(true)
    setActiveMenu(null)
  }

  function closeModal() {
    setIsOpen(false)
    setEditingItem(null)
    setForm(emptyForm)
    setError(null)
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Nama barang wajib diisi'); return }
    const targetPrice = Number(form.target_price)
    if (!targetPrice || targetPrice <= 0) { setError('Harga target harus lebih dari 0'); return }
    const currentSavings = Number(form.current_savings || '0')

    const payload: WishlistPayload = {
      name: form.name.trim(),
      target_price: targetPrice,
      current_savings: currentSavings,
      priority: form.priority,
      notes: form.notes.trim() || null,
    }

    setIsSubmitting(true)
    setError(null)
    try {
      if (editingItem) {
        await updateWishlist(editingItem.id, payload)
      } else {
        await createWishlist(payload)
      }
      closeModal()
      load()
    } catch {
      setError('Gagal menyimpan. Coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePurchase(id: string) {
    setActiveMenu(null)
    try {
      await purchaseWishlist(id)
      load()
    } catch { /* silent */ }
  }

  async function handleDelete(id: string) {
    setActiveMenu(null)
    try {
      await deleteWishlist(id)
      load()
    } catch { /* silent */ }
  }

  const active = items.filter((i) => !i.isPurchased)
  const purchased = items.filter((i) => i.isPurchased)

  return (
    <div className="min-h-screen dark:bg-[#0f1117]">
      {/* Header */}
      <div className=" pt-2 pb-5 mb-4">
        {/* <h1 className="text-xl font-bold text-[#001e1d] dark:text-white mb-1">Wishlist</h1> */}
        <p className="text-xs text-black dark:text-white">Rencanakan impian finansialmu</p>

        {/* Avg savings card */}
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#006b65] via-[#004643] to-[#002523] p-4 flex items-center gap-3">
          <div>
            <p className="text-[10px] font-semibold text-white/50 dark:text-white uppercase tracking-widest">
              Rata-rata tabungan / bulan
            </p>
            <p className="text-lg font-bold text-white">
              {avgMonthlySavings > 0 ? formatCurrency(avgMonthlySavings) : '—'}
            </p>
            <p className="text-[10px] text-white/50 dark:text-white mt-0.5">
              Berdasarkan 6 bulan terakhir
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 pb-28">
        {/* Active wishes */}
        <section>
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-widest mb-3">
            Impian Saya ({active.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-slate-50 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : active.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-200 dark:text-white/10 mb-3" />
              <p className="text-sm text-slate-400 dark:text-slate-500">Belum ada wishlist</p>
              <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Tambah barang impianmu!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((item) => {
                const pct = Math.min(100, (item.currentSavings / item.targetPrice) * 100)
                const cfg = PRIORITY_CONFIG[item.priority]
                return (
                  <div key={item.id} className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <h3 className="font-bold text-[#001e1d] dark:text-white text-sm leading-snug">{item.name}</h3>
                        <p className="text-base font-bold text-brand-stroke dark:text-emerald-400 mt-0.5">
                          {formatCurrency(item.targetPrice)}
                        </p>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {activeMenu === item.id && (
                          <div className="absolute right-0 top-8 z-10 bg-white dark:bg-[#252b3b] rounded-xl shadow-lg border border-slate-100 dark:border-white/5 py-1 min-w-[140px]">
                            <button onClick={() => openEdit(item)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#001e1d] dark:text-white hover:bg-slate-50 dark:hover:bg-white/5">
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button onClick={() => handlePurchase(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-white/5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Beli
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-slate-50 dark:hover:bg-white/5">
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                        <span>Terkumpul: {formatCurrency(item.currentSavings)}</span>
                        <span>{Math.round(pct)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-stroke dark:bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Affordability */}
                    <div className="mt-3 space-y-2">
                      {item.remaining <= 0 ? (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Siap dibeli! 🎉
                        </p>
                      ) : avgMonthlySavings <= 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Tambah data transaksi untuk estimasi waktu
                        </p>
                      ) : item.monthsNeeded != null ? (
                        <>
                          {/* Estimasi waktu */}
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-[#001e1d] dark:text-white">~{item.monthsNeeded} bulan lagi</span>
                            {item.estimatedDate && (
                              <span className="text-slate-400 dark:text-slate-500"> · estimasi {formatEstimatedDate(item.estimatedDate)}</span>
                            )}
                          </p>
                          {/* Sisihkan per bulan */}
                          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-3 py-2">
                            <span className="text-amber-500 dark:text-amber-400 text-base leading-none">💰</span>
                            <div>
                              <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60 font-medium uppercase tracking-wide">
                                Sisihkan per bulan
                              </p>
                              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                {formatCurrency(Math.ceil(item.remaining / item.monthsNeeded / 1000) * 1000)}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>

                    {item.notes && (
                      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 italic">{item.notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Purchased */}
        {purchased.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              Sudah Terbeli ({purchased.length})
            </h2>
            <div className="space-y-2">
              {purchased.map((item) => (
                <div key={item.id} className="bg-white dark:bg-[#1a1f2e] rounded-2xl px-4 py-3 flex items-center gap-3 opacity-60">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#001e1d] dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{formatCurrency(item.targetPrice)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-brand-bg text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Close menu on outside click */}
      {activeMenu && (
        <div className="fixed inset-0 z-[5]" onClick={() => setActiveMenu(null)} />
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 pt-4">
          <div
            className="absolute inset-0 bg-black/40"
            style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={closeModal}
          />
          <div
            className="relative w-full max-w-md bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#001e1d] dark:text-white">
                  {editingItem ? 'Edit Wishlist' : 'Tambah Wishlist'}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-0.5">
                  {editingItem ? 'Ubah detail barang impian' : 'Catat barang yang ingin dibeli'}
                </p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-5">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}

              {/* Nama */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  Nama Barang
                </label>
                <input
                  type="text"
                  placeholder="Contoh: iPhone 15, Laptop Gaming..."
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm text-[#001e1d] dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-stroke/30 dark:focus:ring-emerald-500/30"
                />
              </div>

              {/* Harga Target */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  Harga Target
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={form.target_price ? new Intl.NumberFormat('id-ID').format(Number(form.target_price)) : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      setForm((f) => ({ ...f, target_price: raw }))
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 pl-10 pr-4 py-3 text-sm text-[#001e1d] dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-stroke/30 dark:focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {/* Tabungan Saat Ini */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  Sudah Ditabung (opsional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={form.current_savings ? new Intl.NumberFormat('id-ID').format(Number(form.current_savings)) : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      setForm((f) => ({ ...f, current_savings: raw }))
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 pl-10 pr-4 py-3 text-sm text-[#001e1d] dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-stroke/30 dark:focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {/* Prioritas */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  Prioritas
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-white/10 rounded-xl p-1">
                  {(['LOW', 'MEDIUM', 'HIGH'] as WishlistPriority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm((f) => ({ ...f, priority: p }))}
                      className={`py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                        form.priority === p
                          ? p === 'HIGH'
                            ? 'bg-red-500 text-white shadow-sm'
                            : p === 'MEDIUM'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-slate-500 text-white shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                      }`}
                    >
                      {PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  Catatan (opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Alasan, spesifikasi, atau info lainnya..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm text-[#001e1d] dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-stroke/30 dark:focus:ring-emerald-500/30 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 shrink-0 flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-brand-stroke dark:bg-emerald-500 text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

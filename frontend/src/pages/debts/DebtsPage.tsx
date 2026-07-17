import { useState, useEffect, useMemo } from 'react'
import {
  Plus, MoreHorizontal, Pencil, Trash2, X,
  ChevronRight, HandCoins, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react'
import { MobilePageHeader } from '../../components/MobilePageHeader'
import { Skeleton } from '../../components/Skeleton'
import {
  getDebts, getDebtById, createDebt, updateDebt, deleteDebt,
  createPayment, deletePayment,
} from '../../services/debtService'
import { getAccounts } from '../../services/accountService'
import { Debt, Account } from '../../types'

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

function getDueDateColor(dueDate: string | null): string {
  if (!dueDate) return 'text-slate-400 dark:text-slate-500'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return 'text-red-500'
  if (diff <= 3) return 'text-amber-500'
  return 'text-emerald-600 dark:text-emerald-400'
}

function getDueDateLabel(dueDate: string | null): string {
  if (!dueDate) return 'Tanpa jatuh tempo'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0)   return `Terlambat ${Math.abs(diff)} hari`
  if (diff === 0) return 'Jatuh tempo hari ini'
  if (diff <= 3)  return `${diff} hari lagi`
  return due.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const todayStr = () => new Date().toISOString().split('T')[0]

const EMPTY_ADD = { type: 'PAYABLE' as 'PAYABLE' | 'RECEIVABLE', personName: '', amount: '', dueDate: '', note: '' }
const EMPTY_PAY = { accountId: '', amount: '', date: todayStr(), note: '' }

const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-semibold text-[#001e1d] dark:text-white outline-none focus:border-[#004643] transition-colors'
const labelCls = 'text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5'

export function DebtsPage() {
  const [tab, setTab]           = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE')
  const [debts, setDebts]       = useState<Debt[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const [showAdd, setShowAdd]       = useState(false)
  const [editDebt, setEditDebt]     = useState<Debt | null>(null)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [payDebt, setPayDebt]       = useState<Debt | null>(null)
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [addForm, setAddForm]   = useState(EMPTY_ADD)
  const [editForm, setEditForm] = useState({ personName: '', dueDate: '', note: '' })
  const [payForm, setPayForm]   = useState(EMPTY_PAY)
  const [isSaving, setIsSaving]     = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([getDebts(), getAccounts()])
      .then(([d, a]) => { setDebts(d); setAccounts(a) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey])

  const refresh = () => setRefreshKey(k => k + 1)

  const filtered = useMemo(() => debts.filter(d => d.type === tab), [debts, tab])
  const totalPayable    = useMemo(() => debts.filter(d => d.type === 'PAYABLE'    && d.status === 'ACTIVE').reduce((s, d) => s + (d.amount - d.paidAmount), 0), [debts])
  const totalReceivable = useMemo(() => debts.filter(d => d.type === 'RECEIVABLE' && d.status === 'ACTIVE').reduce((s, d) => s + (d.amount - d.paidAmount), 0), [debts])

  async function handleAdd() {
    if (!addForm.personName.trim() || !addForm.amount) return
    setIsSaving(true)
    try {
      await createDebt({
        type:       addForm.type,
        personName: addForm.personName.trim(),
        amount:     Number(addForm.amount.replace(/[^\d]/g, '')),
        dueDate:    addForm.dueDate || null,
        note:       addForm.note || null,
      })
      setShowAdd(false); setAddForm(EMPTY_ADD); refresh()
    } catch { /* noop */ } finally { setIsSaving(false) }
  }

  async function handleEdit() {
    if (!editDebt || !editForm.personName.trim()) return
    setIsSaving(true)
    try {
      await updateDebt(editDebt.id, {
        personName: editForm.personName.trim(),
        dueDate:    editForm.dueDate || null,
        note:       editForm.note   || null,
      })
      setEditDebt(null); refresh()
    } catch { /* noop */ } finally { setIsSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await deleteDebt(deleteId); setDeleteId(null); refresh()
    } catch { /* noop */ } finally { setIsDeleting(false) }
  }

  async function handlePay() {
    if (!payDebt || !payForm.accountId || !payForm.amount) return
    setIsSaving(true)
    try {
      await createPayment(payDebt.id, {
        accountId: payForm.accountId,
        amount:    Number(payForm.amount.replace(/[^\d]/g, '')),
        date:      payForm.date,
        note:      payForm.note || null,
      })
      const savedId = payDebt.id
      setPayDebt(null); setPayForm(EMPTY_PAY); refresh()
      if (detailDebt?.id === savedId) {
        const updated = await getDebtById(savedId); setDetailDebt(updated)
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg ?? 'Gagal menyimpan cicilan')
    } finally { setIsSaving(false) }
  }

  async function handleDeletePayment(debtId: string, paymentId: string) {
    try {
      await deletePayment(debtId, paymentId); refresh()
      if (detailDebt?.id === debtId) {
        const updated = await getDebtById(debtId); setDetailDebt(updated)
      }
    } catch { /* noop */ }
  }

  async function openDetail(debt: Debt) {
    setDetailDebt(debt); setDetailLoading(true)
    try { const full = await getDebtById(debt.id); setDetailDebt(full) }
    catch { /* noop */ } finally { setDetailLoading(false) }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1117] pb-32">
      <MobilePageHeader title="Hutang & Piutang" />

      <div className="px-5 pt-5 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4 text-red-500" strokeWidth={2.5} />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Hutang Aktif</span>
            </div>
            <p className="text-sm font-extrabold text-[#001e1d] dark:text-white">
              {loading ? '—' : formatCurrency(totalPayable)}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-4 h-4 text-amber-500" strokeWidth={2.5} />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Piutang Aktif</span>
            </div>
            <p className="text-sm font-extrabold text-[#001e1d] dark:text-white">
              {loading ? '—' : formatCurrency(totalReceivable)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 dark:bg-white/5 rounded-2xl p-1">
          {(['PAYABLE', 'RECEIVABLE'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                tab === t
                  ? 'bg-white dark:bg-[#1a1f2e] text-[#004643] dark:text-white shadow-sm'
                  : 'text-slate-400 dark:text-slate-500'
              }`}>
              {t === 'PAYABLE' ? 'Hutang Saya' : 'Piutang Saya'}
            </button>
          ))}
        </div>

        {/* Add button */}
        <button
          onClick={() => { setAddForm({ ...EMPTY_ADD, type: tab }); setShowAdd(true) }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#004643] text-white text-sm font-bold active:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {tab === 'PAYABLE' ? 'Catat Hutang Baru' : 'Catat Piutang Baru'}
        </button>

        {/* Skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <HandCoins className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
              {tab === 'PAYABLE' ? 'Belum ada hutang tercatat' : 'Belum ada piutang tercatat'}
            </p>
          </div>
        )}

        {/* Debt cards */}
        {!loading && filtered.map(debt => {
          const remaining = debt.amount - debt.paidAmount
          const pct = debt.amount > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.amount) * 100)) : 0
          return (
            <div key={debt.id} className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-100 dark:border-white/5 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-[#001e1d] dark:text-white truncate">{debt.personName}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      debt.status === 'SETTLED'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                        : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                    }`}>
                      {debt.status === 'SETTLED' ? 'Lunas' : 'Aktif'}
                    </span>
                  </div>
                  <p className={`text-[11px] font-semibold mt-0.5 ${getDueDateColor(debt.dueDate)}`}>
                    {getDueDateLabel(debt.dueDate)}
                  </p>
                </div>
                <div className="relative shrink-0">
                  <button
                    onClick={() => setActiveMenu(activeMenu === debt.id ? null : debt.id)}
                    className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {activeMenu === debt.id && (
                    <div className="absolute right-0 top-8 z-10 bg-white dark:bg-[#1a1f2e] rounded-xl shadow-lg border border-slate-100 dark:border-white/5 py-1 w-40 text-xs font-semibold">
                      {debt.status === 'ACTIVE' && (
                        <button
                          onClick={() => { setPayDebt(debt); setPayForm({ ...EMPTY_PAY, accountId: accounts[0]?.id ?? '', date: todayStr() }); setActiveMenu(null) }}
                          className={`flex items-center gap-2 w-full px-3 py-2 transition-colors ${
                            debt.type === 'PAYABLE'
                              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
                              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                          }`}
                        >
                          <HandCoins className="w-3.5 h-3.5" />
                          {debt.type === 'PAYABLE' ? 'Bayar Cicilan' : 'Terima Cicilan'}
                        </button>
                      )}
                      <button
                        onClick={() => { openDetail(debt); setActiveMenu(null) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-[#001e1d] dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" /> Riwayat
                      </button>
                      <button
                        onClick={() => { setEditDebt(debt); setEditForm({ personName: debt.personName, dueDate: debt.dueDate ?? '', note: debt.note ?? '' }); setActiveMenu(null) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-[#001e1d] dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => { setDeleteId(debt.id); setActiveMenu(null) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-400 dark:text-slate-500">Terbayar {formatCurrency(debt.paidAmount)}</span>
                  <span className={debt.type === 'PAYABLE' ? 'text-red-500' : 'text-amber-500'}>
                    Sisa {formatCurrency(remaining)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${debt.type === 'PAYABLE' ? 'bg-red-400' : 'bg-amber-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium text-right">
                  {pct}% dari {formatCurrency(debt.amount)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Overlay to close active menu */}
      {activeMenu && <div className="fixed inset-0 z-[5]" onClick={() => setActiveMenu(null)} />}

      {/* ── Add Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setShowAdd(false)} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-base font-bold text-[#001e1d] dark:text-white">
                {addForm.type === 'PAYABLE' ? 'Catat Hutang' : 'Catat Piutang'}
              </h3>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex bg-slate-100 dark:bg-white/5 rounded-xl p-1">
                {(['PAYABLE', 'RECEIVABLE'] as const).map(t => (
                  <button key={t} onClick={() => setAddForm(f => ({ ...f, type: t }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      addForm.type === t ? 'bg-white dark:bg-[#0f1117] text-[#004643] dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                    {t === 'PAYABLE' ? 'Hutang Saya' : 'Piutang Saya'}
                  </button>
                ))}
              </div>
              <div>
                <label className={labelCls}>Nama</label>
                <input type="text" className={inputCls}
                  placeholder={addForm.type === 'PAYABLE' ? 'Nama pemberi hutang' : 'Nama peminjam'}
                  value={addForm.personName}
                  onChange={e => setAddForm(f => ({ ...f, personName: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Jumlah</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                  <input type="text" inputMode="numeric" className={`${inputCls} pl-10`} placeholder="0"
                    value={addForm.amount ? new Intl.NumberFormat('id-ID').format(Number(addForm.amount)) : ''}
                    onChange={e => setAddForm(f => ({ ...f, amount: e.target.value.replace(/[^\d]/g, '') }))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Jatuh Tempo <span className="font-normal opacity-60">(opsional)</span></label>
                <input type="date" className={inputCls} value={addForm.dueDate}
                  onChange={e => setAddForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Catatan <span className="font-normal opacity-60">(opsional)</span></label>
                <input type="text" className={inputCls} value={addForm.note}
                  onChange={e => setAddForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-500">
                  Batal
                </button>
                <button onClick={handleAdd} disabled={isSaving || !addForm.personName.trim() || !addForm.amount}
                  className="flex-1 py-3 rounded-xl bg-[#004643] text-white text-sm font-bold disabled:opacity-50 transition-opacity">
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pay/Receive Modal ── */}
      {payDebt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setPayDebt(null)} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-base font-bold text-[#001e1d] dark:text-white">
                  {payDebt.type === 'PAYABLE' ? 'Bayar Cicilan' : 'Terima Cicilan'}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Sisa {formatCurrency(payDebt.amount - payDebt.paidAmount)}
                </p>
              </div>
              <button onClick={() => setPayDebt(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Jumlah</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                  <input type="text" inputMode="numeric" className={`${inputCls} pl-10`} placeholder="0"
                    value={payForm.amount ? new Intl.NumberFormat('id-ID').format(Number(payForm.amount)) : ''}
                    onChange={e => setPayForm(f => ({ ...f, amount: e.target.value.replace(/[^\d]/g, '') }))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Rekening</label>
                <select className={inputCls} value={payForm.accountId}
                  onChange={e => setPayForm(f => ({ ...f, accountId: e.target.value }))}>
                  <option value="">Pilih rekening</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tanggal</label>
                <input type="date" className={inputCls} value={payForm.date}
                  onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Catatan <span className="font-normal opacity-60">(opsional)</span></label>
                <input type="text" className={inputCls} value={payForm.note}
                  onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setPayDebt(null)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-500">
                  Batal
                </button>
                <button onClick={handlePay} disabled={isSaving || !payForm.accountId || !payForm.amount}
                  className="flex-1 py-3 rounded-xl bg-[#004643] text-white text-sm font-bold disabled:opacity-50">
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editDebt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setEditDebt(null)} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-base font-bold text-[#001e1d] dark:text-white">Edit</h3>
              <button onClick={() => setEditDebt(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Nama</label>
                <input type="text" className={inputCls} value={editForm.personName}
                  onChange={e => setEditForm(f => ({ ...f, personName: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Jatuh Tempo</label>
                <input type="date" className={inputCls} value={editForm.dueDate}
                  onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Catatan</label>
                <input type="text" className={inputCls} value={editForm.note}
                  onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditDebt(null)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-500">
                  Batal
                </button>
                <button onClick={handleEdit} disabled={isSaving || !editForm.personName.trim()}
                  className="flex-1 py-3 rounded-xl bg-[#004643] text-white text-sm font-bold disabled:opacity-50">
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setDeleteId(null)} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-[#001e1d] dark:text-white mb-2">Hapus Catatan?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Semua riwayat cicilan dan transaksi terkait akan ikut dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-500">
                Batal
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50">
                {isDeleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail / History Modal ── */}
      {detailDebt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setDetailDebt(null)} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: 'calc(100vh - 80px)' }}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5 shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#001e1d] dark:text-white">{detailDebt.personName}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Riwayat Cicilan</p>
              </div>
              <button onClick={() => setDetailDebt(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {detailLoading && <Skeleton className="h-20 w-full rounded-xl" />}
              {!detailLoading && (!detailDebt.payments || detailDebt.payments.length === 0) && (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">Belum ada cicilan</p>
              )}
              {!detailLoading && detailDebt.payments?.map(p => (
                <div key={p.id} className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-white/5 last:border-0">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-bold text-[#001e1d] dark:text-white">{formatCurrency(p.amount)}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {p.accountName} · {new Date(p.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {p.note && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{p.note}</p>}
                  </div>
                  <button
                    onClick={() => handleDeletePayment(detailDebt.id, p.id)}
                    className="p-1.5 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DebtsPage

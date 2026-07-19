import { useState, useEffect, useMemo } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import {
  TrendingUp, ArrowDownLeft, Wallet, Target,
  Pencil, Check, X, Trash2, Search, MoreHorizontal, ChevronLeft, ChevronRight,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell,
} from 'recharts'
import { Transaction, MonthlyChartEntry, Category, Account } from '../../types'
import { getReportSummary } from '../../services/reportService'
import { getTransactions, updateTransaction, deleteTransaction } from '../../services/transactionService'
import { getCategories } from '../../services/categoryService'
import { getAccounts } from '../../services/accountService'
import { MonthYearPicker } from '../../components/MonthYearPicker'
import { Skeleton } from '../../components/Skeleton'

const CHART_COLORS = ['#004643', '#abd1c6', '#f9bc60', '#e16162', '#9333ea', '#3b82f6']
const DEFAULT_TARGET = 20_000_000
const ITEMS_PER_PAGE = 5

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)

const formatShort = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return `${value}`
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-brand-stroke rounded-2xl px-4 py-3 shadow-xl">
      <p className="text-[10px] font-bold text-brand-paragraph/70 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-extrabold text-white">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export function IncomePage() {
  const { isDark } = useTheme()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [chartData, setChartData] = useState<{ month: string; amount: number; rawMonth: string }[]>([])
  const [currentMonthIncome, setCurrentMonthIncome] = useState(0)
  const [incomeTransactions, setIncomeTransactions] = useState<Transaction[]>([])
  const [txTotal, setTxTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [refreshKey, setRefreshKey] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [txPage, setTxPage] = useState(1)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null)
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([])
  const [txAccounts, setTxAccounts] = useState<Account[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({ amount: '', description: '', categoryId: '', accountId: '', date: '' })

  // Income target — stored in localStorage
  const [incomeTarget, setIncomeTarget] = useState(() => {
    const saved = localStorage.getItem('ft-income-target')
    return saved ? Number(saved) : DEFAULT_TARGET
  })
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getReportSummary(month, year),
      getTransactions({ type: 'INCOME', month, year, limit: 100 }),
    ]).then(([report, txResult]) => {
      setCurrentMonthIncome(report.totalIncome)
      setChartData(
        report.monthlyChart.map((m: MonthlyChartEntry) => ({
          month: new Date(m.month + '-01').toLocaleDateString('id-ID', { month: 'short' }),
          amount: m.income,
          rawMonth: m.month,
        }))
      )
      setIncomeTransactions(txResult.data)
      setTxTotal(txResult.meta.total)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [month, year, refreshKey])

  useEffect(() => {
    getCategories().then(cats => setIncomeCategories(cats.filter((c: Category) => c.type === 'INCOME')))
    getAccounts().then(setTxAccounts)
  }, [])

  function saveTarget() {
    const val = Number(targetInput.replace(/\D/g, ''))
    if (val > 0) {
      setIncomeTarget(val)
      localStorage.setItem('ft-income-target', String(val))
    }
    setEditingTarget(false)
  }

  const yearTotal = useMemo(() => chartData.reduce((s, d) => s + d.amount, 0), [chartData])
  const average = useMemo(() =>
    chartData.length > 0 ? Math.round(yearTotal / chartData.length) : 0,
    [chartData, yearTotal])

  const growthInfo = useMemo(() => {
    if (chartData.length < 2) return null
    const last = chartData[chartData.length - 1]
    const prev = chartData[chartData.length - 2]
    if (prev.amount === 0) return null
    return Number((((last.amount - prev.amount) / prev.amount) * 100).toFixed(1))
  }, [chartData])

  const sources = useMemo(() => {
    const totals: Record<string, { amount: number; name: string }> = {}
    let total = 0
    for (const tx of incomeTransactions) {
      const name = tx.categoryName ?? 'Lainnya'
      if (!totals[name]) totals[name] = { amount: 0, name }
      totals[name].amount += tx.amount
      total += tx.amount
    }
    return Object.values(totals)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
      .map((s, i) => ({
        ...s,
        percent: total > 0 ? Math.round((s.amount / total) * 100) : 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
  }, [incomeTransactions])

  const filteredTransactions = useMemo(() => {
    if (!searchTerm.trim()) return incomeTransactions
    const t = searchTerm.toLowerCase()
    return incomeTransactions.filter(tx =>
      tx.description?.toLowerCase().includes(t) ||
      tx.categoryName?.toLowerCase().includes(t)
    )
  }, [incomeTransactions, searchTerm])

  const txTotalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE))
  const paginatedTransactions = filteredTransactions.slice((txPage - 1) * ITEMS_PER_PAGE, txPage * ITEMS_PER_PAGE)

  useEffect(() => { setTxPage(1) }, [month, year, refreshKey, searchTerm])

  function openEdit(tx: Transaction) {
    setActiveMenu(null)
    setEditTx(tx)
    setEditForm({
      amount: String(tx.amount),
      description: tx.description || '',
      categoryId: tx.categoryId || '',
      accountId: tx.accountId || '',
      date: tx.date.split('T')[0],
    })
  }

  async function saveEdit() {
    if (!editTx) return
    setIsSaving(true)
    try {
      await updateTransaction(editTx.id, {
        type: 'INCOME',
        amount: Number(editForm.amount.replace(/[^\d]/g, '')),
        description: editForm.description,
        categoryId: editForm.categoryId,
        accountId: editForm.accountId,
        date: editForm.date,
      })
      setEditTx(null)
      setRefreshKey(k => k + 1)
    } catch {} finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTxId) return
    try {
      await deleteTransaction(deleteTxId)
      setDeleteTxId(null)
      setRefreshKey(k => k + 1)
    } catch {}
  }

  const targetPercent = Math.min((currentMonthIncome / incomeTarget) * 100, 100)
  const currentMonthStr = new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
  const currentRawMonth = `${year}-${String(month).padStart(2, '0')}`

  return (
    <div className="space-y-6 pb-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Total Pemasukan (chart period) */}
        <div className="bg-gradient-to-br from-[#006b65] via-[#004643] to-[#002523] text-brand-headline rounded-3xl p-6 shadow-md flex flex-col justify-between min-h-[140px] relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/[0.04]" />
          <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full bg-white/[0.06]" />
          <div className="absolute right-12 -bottom-10 w-32 h-32 rounded-full bg-white/[0.03]" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-bold text-brand-paragraph/70 uppercase tracking-widest">Total Pemasukan</span>
            <div className="w-8 h-8 rounded-xl  flex items-center justify-center">
              <Wallet className="w-4 h-4 text-brand-paragraph" />
            </div>
          </div>
          <div className="relative z-10">
            {loading
              ? <Skeleton className="h-7 w-36 mt-1 bg-white/20 dark:bg-white/20" />
              : <h3 className="text-2xl font-bold tracking-tight text-white">{formatCurrency(yearTotal)}</h3>
            }
            {!loading && growthInfo !== null && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <TrendingUp className="w-3 h-3 text-brand-highlight" />
                <span className="text-[11px] font-bold text-brand-paragraph/70">
                  {growthInfo >= 0 ? '+' : ''}{growthInfo}% vs bulan lalu
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bulan Ini */}
        <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-6 shadow-sm border border-brand-stroke/5 dark:border-white/5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest">Bulan Ini</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            </div>
          </div>
          <div>
            {loading
              ? <Skeleton className="h-7 w-36 mt-1" />
              : <h3 className="text-2xl font-bold tracking-tight text-brand-stroke dark:text-white">{formatCurrency(currentMonthIncome)}</h3>
            }
            <p className="text-xs font-semibold text-brand-stroke/40 dark:text-slate-400 mt-1">dari {txTotal} transaksi pemasukan</p>
          </div>
        </div>

        {/* Target Bulanan */}
        <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-6 shadow-sm border border-brand-stroke/5 dark:border-white/5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest">Target Bulanan</span>
            <div className="flex items-center gap-1.5">
              {!editingTarget && (
                <button
                  onClick={() => { setTargetInput(String(incomeTarget)); setEditingTarget(true) }}
                  className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-white/10 flex items-center justify-center text-brand-stroke/40 dark:text-slate-500 hover:text-brand-stroke dark:hover:text-white transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <Target className="w-4 h-4 text-amber-500" />
              </div>
            </div>
          </div>

          {editingTarget ? (
            <div className="mt-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-bold text-brand-stroke/40 dark:text-slate-500">Rp</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  value={targetInput ? new Intl.NumberFormat('id-ID').format(Number(targetInput.replace(/\D/g, ''))) : ''}
                  onChange={(e) => setTargetInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveTarget(); if (e.key === 'Escape') setEditingTarget(false) }}
                  className="flex-1 bg-slate-50 dark:bg-white/10 border border-brand-stroke/10 dark:border-white/10 rounded-lg px-2 py-1 text-sm font-bold text-brand-stroke dark:text-white outline-none focus:ring-2 focus:ring-brand-bg/20"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingTarget(false)} className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/10 text-brand-stroke/60 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white transition-colors flex items-center justify-center gap-1">
                  <X className="w-3 h-3" /> Batal
                </button>
                <button onClick={saveTarget} className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-brand-bg text-brand-headline hover:opacity-90 transition-colors flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" /> Simpan
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-brand-stroke dark:text-white">{formatCurrency(incomeTarget)}</h3>
              <div className="mt-3">
                <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-highlight rounded-full transition-all duration-700"
                    style={{ width: `${targetPercent.toFixed(0)}%` }}
                  />
                </div>
                <p className="text-xs font-bold text-brand-stroke/40 dark:text-slate-400 mt-1">{targetPercent.toFixed(0)}% tercapai</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Bar Chart */}
        <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-6 shadow-sm border border-brand-stroke/5 dark:border-white/5 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-brand-stroke dark:text-white">Tren Pemasukan Bulanan</h3>
              <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">12 bulan terakhir</p>
            </div>
            <div className="flex items-center gap-2">
              <MonthYearPicker
                month={month}
                year={year}
                onChange={(m, y) => { if (m !== '') setMonth(m); if (y !== '') setYear(y) }}
                align="right"
              />
            </div>
          </div>
          <div className="flex-1 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: isDark ? '#ffffff' : '#001e1d', opacity: isDark ? 0.5 : 0.4, fontSize: 11, fontWeight: 700 }} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={formatShort} tick={{ fill: isDark ? '#ffffff' : '#001e1d', opacity: isDark ? 0.5 : 0.4, fontSize: 11, fontWeight: 600 }} />
                {average > 0 && (
                  <ReferenceLine
                    y={average}
                    stroke="#f9bc60"
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    label={{ value: 'Rata-rata', position: 'right', fontSize: 9, fill: '#f9bc60', fontWeight: 700 }}
                  />
                )}
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={18}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.rawMonth === currentRawMonth ? '#f9bc60' : '#004643'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {average > 0 && (
            <p className="text-[10px] text-brand-stroke/30 dark:text-slate-500 font-semibold mt-3 text-center">
              Rata-rata bulanan: {formatCurrency(average)}
            </p>
          )}
        </div>

        {/* Income Sources */}
        <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-6 shadow-sm border border-brand-stroke/5 dark:border-white/5 flex flex-col">
          <div className="mb-5">
            <h3 className="text-base font-bold text-brand-stroke dark:text-white">Sumber Pemasukan</h3>
            <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">{currentMonthStr}</p>
          </div>
          {loading ? (
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <Skeleton className="h-2.5 w-20 mt-1" />
                </div>
              ))}
            </div>
          ) : sources.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-brand-stroke/40 dark:text-slate-500 font-medium">
              Belum ada data
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {sources.map((source, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: source.color }} />
                      <span className="text-xs font-semibold text-brand-stroke/80 dark:text-slate-300 leading-tight">{source.name}</span>
                    </div>
                    <span className="text-xs font-extrabold text-brand-stroke dark:text-white">{source.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${source.percent}%`, backgroundColor: source.color }}
                    />
                  </div>
                  <p className="text-[10px] font-semibold text-brand-stroke/35 dark:text-slate-500 mt-1">{formatCurrency(source.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Income Transactions Table */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-sm border border-brand-stroke/5 dark:border-white/5 overflow-hidden">
        <div className="px-6 py-5 border-b border-brand-stroke/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-brand-stroke dark:text-white">Riwayat Pemasukan</h3>
              <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">{txTotal} transaksi bulan ini</p>
            </div>
            <span className="px-3 py-1.5 bg-slate-50 dark:bg-white/5 text-brand-stroke/60 dark:text-slate-400 text-xs font-bold rounded-lg border border-brand-stroke/5 dark:border-white/5 shrink-0">
              {currentMonthStr}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-stroke/30 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari transaksi..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/5 dark:border-white/10 text-sm font-medium text-brand-stroke dark:text-white placeholder-brand-stroke/30 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-bg/20 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-stroke/30 hover:text-brand-stroke dark:hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-stroke/5 dark:border-white/5 text-[10px] uppercase font-bold text-brand-stroke/35 dark:text-slate-500 tracking-widest">
                <th className="px-6 pb-3 pt-4">Keterangan</th>
                <th className="px-3 pb-3 pt-4">Kategori</th>
                <th className="px-3 pb-3 pt-4">Rekening</th>
                <th className="px-3 pb-3 pt-4">Tanggal</th>
                <th className="px-6 pb-3 pt-4 text-right">Jumlah</th>
                <th className="px-3 pb-3 pt-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-stroke/5 dark:divide-white/5">
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-brand-stroke/5 dark:border-white/5 last:border-0">
                  <td className="px-6 py-4">
                    <Skeleton className="h-3.5 w-32" />
                  </td>
                  <td className="px-3 py-4"><Skeleton className="h-5 w-16 rounded-lg" /></td>
                  <td className="px-3 py-4"><Skeleton className="h-3.5 w-20" /></td>
                  <td className="px-3 py-4"><Skeleton className="h-3.5 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-3.5 w-24 ml-auto" /></td>
                  <td className="px-3 py-4"></td>
                </tr>
              ))}
              {!loading && filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-brand-stroke/40 dark:text-slate-500 font-medium">
                    {searchTerm ? 'Tidak ada hasil pencarian' : 'Belum ada transaksi pemasukan bulan ini'}
                  </td>
                </tr>
              )}
              {!loading && paginatedTransactions.map((tx) => (
                <tr key={tx.id} className="group hover:bg-emerald-50/30 dark:hover:bg-white/5 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-brand-stroke dark:text-white group-hover:text-brand-bg transition-colors">
                      {tx.description}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <span className="inline-flex px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                      {tx.categoryName ?? '-'}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-xs font-semibold text-brand-stroke/50 dark:text-slate-400">{tx.accountName ?? '-'}</td>
                  <td className="px-3 py-4 text-xs font-semibold text-brand-stroke/50 dark:text-slate-400">
                    {new Date(tx.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-extrabold text-emerald-600">
                    + {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-6 py-4 relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === tx.id ? null : tx.id)}
                      className="p-1.5 rounded-lg text-brand-stroke/30 dark:text-slate-500 hover:text-brand-stroke dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {activeMenu === tx.id && (
                      <div className="absolute right-6 top-10 z-10 bg-white dark:bg-[#1a1f2e] rounded-xl shadow-lg border border-brand-stroke/5 dark:border-white/5 py-1 w-36 text-xs font-semibold">
                        <button
                          onClick={() => openEdit(tx)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-brand-stroke dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => { setActiveMenu(null); setDeleteTxId(tx.id) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-brand-tertiary hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {txTotalPages > 1 && (
          <div className="px-6 py-4 border-t border-brand-stroke/5 dark:border-white/5 flex items-center justify-between">
            <span className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium">
              Halaman {txPage} dari {txTotalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTxPage(p => Math.max(1, p - 1))}
                disabled={txPage === 1}
                className="p-2 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke/50 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white hover:border-brand-stroke/20 dark:hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: txTotalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setTxPage(p)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                    txPage === p
                      ? 'bg-brand-bg text-brand-headline shadow-sm'
                      : 'text-brand-stroke/50 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setTxPage(p => Math.min(txTotalPages, p + 1))}
                disabled={txPage === txTotalPages}
                className="p-2 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke/50 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white hover:border-brand-stroke/20 dark:hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
    {editTx && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 pt-4">
        <div
          className="absolute inset-0 bg-black/40"
          style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={() => setEditTx(null)}
        />
        <div className="relative bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <div className="flex items-center justify-between px-6 py-5 border-b border-brand-stroke/5 dark:border-white/5 shrink-0">
            <div>
              <h3 className="text-base font-bold text-brand-stroke dark:text-white">Ubah Pemasukan</h3>
              <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">Perbarui detail transaksi</p>
            </div>
            <button onClick={() => setEditTx(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-brand-stroke/40 hover:text-brand-stroke dark:hover:text-white transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-brand-stroke/60 dark:text-slate-400 block mb-1.5">Jumlah</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-brand-stroke/40 dark:text-slate-500">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editForm.amount ? new Intl.NumberFormat('id-ID').format(Number(editForm.amount)) : ''}
                  onChange={e => setEditForm(f => ({ ...f, amount: e.target.value.replace(/[^\d]/g, '') }))}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-bg/20 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-brand-stroke/60 dark:text-slate-400 block mb-1.5">Keterangan</label>
              <input
                type="text"
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-bg/20 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-brand-stroke/60 dark:text-slate-400 block mb-1.5">Kategori</label>
              <select
                value={editForm.categoryId}
                onChange={e => setEditForm(f => ({ ...f, categoryId: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-bg/20 appearance-none transition-all"
              >
                <option value="">Pilih kategori</option>
                {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-brand-stroke/60 dark:text-slate-400 block mb-1.5">Rekening</label>
              <select
                value={editForm.accountId}
                onChange={e => setEditForm(f => ({ ...f, accountId: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-bg/20 appearance-none transition-all"
              >
                <option value="">Pilih rekening</option>
                {txAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-brand-stroke/60 dark:text-slate-400 block mb-1.5">Tanggal</label>
              <input
                type="date"
                value={editForm.date}
                onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-bg/20 transition-all"
              />
            </div>
          </div>
          <div className="px-6 py-5 border-t border-brand-stroke/5 dark:border-white/5 shrink-0 flex gap-3">
            <button
              onClick={() => setEditTx(null)}
              className="flex-1 py-3 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke/60 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white text-sm font-bold transition-all"
            >
              Batal
            </button>
            <button
              onClick={saveEdit}
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl bg-brand-bg text-brand-headline text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Delete Confirm */}
    {deleteTxId && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
        <div
          className="absolute inset-0 bg-black/40"
          style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={() => setDeleteTxId(null)}
        />
        <div className="relative bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-sm p-6">
          <h3 className="text-base font-bold text-brand-stroke dark:text-white mb-2">Hapus Transaksi?</h3>
          <p className="text-sm text-brand-stroke/50 dark:text-slate-400 font-medium mb-6">Tindakan ini tidak dapat dibatalkan.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteTxId(null)}
              className="flex-1 py-3 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke/60 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white text-sm font-bold transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 py-3 rounded-xl bg-brand-tertiary text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}

export default IncomePage

import { useState, useEffect, useMemo } from 'react'
import {
  TrendingDown, ArrowUpRight, ShieldAlert, BarChart2,
  Settings2, X, Trash2, Search, Pencil, Copy, MoreHorizontal, ChevronLeft, ChevronRight, ScanLine,
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { Transaction, Category, BudgetWithSpending, Account } from '../../types'
import { getReportSummary } from '../../services/reportService'
import { getTransactions, updateTransaction, deleteTransaction } from '../../services/transactionService'
import { getBudgets, setBudget } from '../../services/budgetService'
import { getCategories } from '../../services/categoryService'
import { getAccounts } from '../../services/accountService'
import { MonthYearPicker } from '../../components/MonthYearPicker'
import { Skeleton } from '../../components/Skeleton'
import { ScanReceiptModal } from '../../components/ScanReceiptModal'

const CHART_COLORS = ['#004643', '#abd1c6', '#f9bc60', '#e16162', '#6366f1', '#14b8a6', '#f97316', '#8b5cf6']
const ITEMS_PER_PAGE = 5

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)

interface DonutTooltipProps {
  active?: boolean
  payload?: { payload: { name: string; amount: number; color: string } }[]
  totalExpense: number
}

function DonutTooltip({ active, payload, totalExpense }: DonutTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-brand-stroke rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[10px] font-bold text-brand-paragraph/60 uppercase tracking-wide mb-0.5">{d.name}</p>
      <p className="text-sm font-extrabold text-white">{formatCurrency(d.amount)}</p>
      {totalExpense > 0 && (
        <p className="text-[10px] text-brand-paragraph/50 font-semibold">
          {((d.amount / totalExpense) * 100).toFixed(1)}%
        </p>
      )}
    </div>
  )
}

export function ExpensesPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [loading, setLoading] = useState(false)
  const [totalExpense, setTotalExpense] = useState(0)
  const [expenseTransactions, setExpenseTransactions] = useState<Transaction[]>([])
  const [txTotal, setTxTotal] = useState(0)
  const [budgetList, setBudgetList] = useState<BudgetWithSpending[]>([])
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({})
  const [isSavingBudget, setIsSavingBudget] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [isCopyingBudget, setIsCopyingBudget] = useState(false)

  const [refreshKey, setRefreshKey] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [txPage, setTxPage] = useState(1)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null)
  const [txAccounts, setTxAccounts] = useState<Account[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({ amount: '', description: '', categoryId: '', accountId: '', date: '' })
  const [scanModalOpen, setScanModalOpen] = useState(false)

  const refreshBudgets = () => {
    getBudgets(month, year).then(setBudgetList).catch(() => {})
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getReportSummary(month, year),
      getTransactions({ type: 'EXPENSE', month, year, limit: 100 }),
      getBudgets(month, year),
      getCategories(),
    ]).then(([report, txResult, budgets, categories]) => {
      setTotalExpense(report.totalExpense)
      setExpenseTransactions(txResult.data)
      setTxTotal(txResult.meta.total)
      setBudgetList(budgets)
      setExpenseCategories(categories.filter(c => c.type === 'EXPENSE'))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [month, year, refreshKey])

  useEffect(() => {
    getAccounts().then(setTxAccounts)
  }, [])

  const filteredTransactions = useMemo(() => {
    if (!searchTerm.trim()) return expenseTransactions
    const t = searchTerm.toLowerCase()
    return expenseTransactions.filter(tx =>
      tx.description?.toLowerCase().includes(t) ||
      tx.categoryName?.toLowerCase().includes(t)
    )
  }, [expenseTransactions, searchTerm])

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
        type: 'EXPENSE',
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

  async function copyFromPrevMonth() {
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    setIsCopyingBudget(true)
    try {
      const prevBudgets = await getBudgets(prevMonth, prevYear)
      const newInputs: Record<string, string> = { ...budgetInputs }
      for (const b of prevBudgets) {
        if (b.amount > 0) newInputs[b.categoryId] = String(b.amount)
      }
      setBudgetInputs(newInputs)
    } catch {} finally {
      setIsCopyingBudget(false)
    }
  }

  const donutData = useMemo(() => {
    const totals: Record<string, { name: string; amount: number }> = {}
    for (const tx of expenseTransactions) {
      const name = tx.categoryName ?? 'Lainnya'
      if (!totals[name]) totals[name] = { name, amount: 0 }
      totals[name].amount += tx.amount
    }
    return Object.values(totals)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
      .map((d, i) => ({ ...d, color: CHART_COLORS[i % CHART_COLORS.length] }))
  }, [expenseTransactions])

  const totalBudgetAmount = useMemo(() => budgetList.reduce((s, b) => s + b.amount, 0), [budgetList])
  const budgetUsedPercent = totalBudgetAmount > 0 ? Math.round((totalExpense / totalBudgetAmount) * 100) : 0

  const daysInMonth = new Date(year, month, 0).getDate()
  const dailyAverage = daysInMonth > 0 ? Math.round(totalExpense / daysInMonth) : 0

  const currentMonthStr = new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })

  const openBudgetModal = () => {
    const inputs: Record<string, string> = {}
    for (const cat of expenseCategories) {
      const existing = budgetList.find(b => b.categoryId === cat.id)
      inputs[cat.id] = existing && existing.amount > 0 ? String(existing.amount) : ''
    }
    setBudgetInputs(inputs)
    setBudgetError(null)
    setBudgetModalOpen(true)
  }

  const saveBudgets = async () => {
    const entries = Object.entries(budgetInputs).filter(([, v]) => v !== '' && Number(v) > 0)
    if (entries.length === 0) { setBudgetError('Masukkan minimal satu anggaran'); return }
    setIsSavingBudget(true)
    setBudgetError(null)
    try {
      await Promise.all(
        entries.map(([categoryId, amount]) =>
          setBudget({ categoryId, amount: Number(amount), month, year })
        )
      )
      setBudgetModalOpen(false)
      refreshBudgets()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setBudgetError(err?.response?.data?.message ?? 'Gagal menyimpan anggaran')
    } finally {
      setIsSavingBudget(false)
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Total Pengeluaran */}
        <div className="bg-brand-tertiary text-white rounded-3xl p-6 shadow-md flex flex-col justify-between min-h-[140px] relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white/10 -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Total Pengeluaran</span>
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white/80" />
            </div>
          </div>
          <div className="relative z-10">
            {loading
              ? <Skeleton className="h-7 w-36 mt-1 bg-white/20 dark:bg-white/20" />
              : <h3 className="text-2xl font-bold tracking-tight text-white">{formatCurrency(totalExpense)}</h3>
            }
            <div className="flex items-center gap-1.5 mt-1.5">
              <TrendingDown className="w-3 h-3 text-white/70" />
              <span className="text-[11px] font-bold text-white/60">{currentMonthStr}</span>
            </div>
          </div>
        </div>

        {/* Rata-rata Harian */}
        <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-6 shadow-sm border border-brand-stroke/5 dark:border-white/5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest">Rata-rata Harian</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-brand-tertiary stroke-[2.5]" />
            </div>
          </div>
          <div>
            {loading
              ? <Skeleton className="h-7 w-36 mt-1" />
              : <h3 className="text-2xl font-bold tracking-tight text-brand-stroke dark:text-white">{formatCurrency(dailyAverage)}</h3>
            }
            <p className="text-xs font-semibold text-brand-stroke/40 dark:text-slate-400 mt-1">per hari (rata-rata {currentMonthStr})</p>
          </div>
        </div>

        {/* Penggunaan Budget */}
        <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-6 shadow-sm border border-brand-stroke/5 dark:border-white/5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest">Penggunaan Budget</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${budgetUsedPercent >= 80 ? 'bg-red-50' : 'bg-amber-50'}`}>
              <ShieldAlert className={`w-4 h-4 ${budgetUsedPercent >= 80 ? 'text-brand-tertiary' : 'text-amber-500'}`} />
            </div>
          </div>
          <div>
            {totalBudgetAmount > 0 ? (
              <>
                <h3 className={`text-2xl font-bold tracking-tight ${budgetUsedPercent >= 80 ? 'text-brand-tertiary' : 'text-brand-stroke dark:text-white'}`}>
                  {budgetUsedPercent}%
                </h3>
                <div className="mt-3">
                  <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${budgetUsedPercent >= 80 ? 'bg-brand-tertiary' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs font-bold text-brand-stroke/40 dark:text-slate-400 mt-1">
                    Sisa: {formatCurrency(Math.max(totalBudgetAmount - totalExpense, 0))}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight text-brand-stroke/30 dark:text-slate-500">—</h3>
                <p className="text-xs font-semibold text-brand-stroke/40 dark:text-slate-400 mt-1">
                  <button onClick={openBudgetModal} className="text-brand-bg hover:underline font-bold">
                    Atur anggaran
                  </button>{' '}untuk memantau budget
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Donut Chart + Budget Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Donut Chart */}
        <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-6 shadow-sm border border-brand-stroke/5 dark:border-white/5 flex flex-col items-center justify-center">
          <div className="w-full mb-4">
            <h3 className="text-base font-bold text-brand-stroke dark:text-white">Distribusi Pengeluaran</h3>
            <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">Berdasarkan kategori — {currentMonthStr}</p>
          </div>

          {donutData.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-brand-stroke/40 dark:text-slate-500 font-medium w-full">
              Belum ada data
            </div>
          ) : (
            <>
              <div className="relative w-full" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={110}
                      dataKey="amount"
                      paddingAngle={3}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      strokeWidth={0}
                    >
                      {donutData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.color}
                          opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip totalExpense={totalExpense} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest">Total</span>
                  <span className="text-xl font-extrabold text-brand-stroke dark:text-white tracking-tight leading-tight">
                    {totalExpense >= 1_000_000 ? `${(totalExpense / 1_000_000).toFixed(1)}jt` : formatCurrency(totalExpense)}
                  </span>
                  <span className="text-[10px] font-semibold text-brand-stroke/30 dark:text-slate-500 mt-0.5">{currentMonthStr}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-2">
                {donutData.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-[10px] font-semibold text-brand-stroke/60 dark:text-slate-400 truncate">{c.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Budget Progress Breakdown */}
        <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-6 shadow-sm border border-brand-stroke/5 dark:border-white/5 lg:col-span-2 flex flex-col">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-brand-stroke dark:text-white">Progress Budget per Kategori</h3>
              <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">Pantau penggunaan anggaran bulanan</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={openBudgetModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-bg/10 hover:bg-brand-bg/20 text-brand-bg text-xs font-bold rounded-lg transition-all border border-brand-bg/20"
              >
                <Settings2 className="w-3 h-3" /> Atur Anggaran
              </button>
              <MonthYearPicker
                month={month}
                year={year}
                onChange={(m, y) => { if (m !== '') setMonth(m); if (y !== '') setYear(y) }}
                align="right"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-5 flex-1 flex flex-col justify-center">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
                      <Skeleton className="h-3.5 w-28" />
                    </div>
                    <Skeleton className="h-3.5 w-8" />
                  </div>
                  <Skeleton className="h-2.5 w-full rounded-full" />
                  <div className="flex justify-between mt-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : budgetList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-brand-stroke/40 dark:text-slate-400 font-medium">Belum ada anggaran yang ditetapkan</p>
              <button
                onClick={openBudgetModal}
                className="px-4 py-2 bg-brand-bg text-brand-headline text-sm font-bold rounded-xl hover:opacity-90 transition-all"
              >
                Atur Anggaran Sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-5 flex-1 flex flex-col justify-center">
              {budgetList.map((cat, i) => {
                const pct = cat.amount > 0 ? Math.min((cat.spent / cat.amount) * 100, 100) : 0
                const isOver = pct >= 90
                const color = CHART_COLORS[i % CHART_COLORS.length]
                return (
                  <div key={cat.categoryId}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-semibold text-brand-stroke/80 dark:text-slate-300">{cat.categoryName}</span>
                        {isOver && (
                          <span className="text-[9px] font-bold text-brand-tertiary bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Hampir Penuh
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-extrabold ${isOver ? 'text-brand-tertiary' : 'text-brand-stroke dark:text-white'}`}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-brand-stroke/40 dark:text-slate-500 font-semibold">
                      <span>Terpakai: {formatCurrency(cat.spent)}</span>
                      <span>Limit: {formatCurrency(cat.amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Expense Transactions Table */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-sm border border-brand-stroke/5 dark:border-white/5 overflow-hidden">
        <div className="px-6 py-5 border-b border-brand-stroke/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-brand-stroke dark:text-white">Riwayat Pengeluaran</h3>
              <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">{txTotal} transaksi bulan ini</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScanModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-tertiary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity shrink-0"
              >
                <ScanLine className="w-3.5 h-3.5" />
                Scan Struk
              </button>
              <span className="px-3 py-1.5 bg-slate-50 dark:bg-white/5 text-brand-stroke/60 dark:text-slate-400 text-xs font-bold rounded-lg border border-brand-stroke/5 dark:border-white/5 shrink-0">
                {currentMonthStr}
              </span>
            </div>
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
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                      <Skeleton className="h-3.5 w-32" />
                    </div>
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
                    {searchTerm ? 'Tidak ada hasil pencarian' : 'Belum ada transaksi pengeluaran bulan ini'}
                  </td>
                </tr>
              )}
              {!loading && paginatedTransactions.map((tx) => (
                <tr key={tx.id} className="group hover:bg-red-50/20 dark:hover:bg-white/5 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-50 text-brand-tertiary flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <span className="text-sm font-semibold text-brand-stroke dark:text-white group-hover:text-brand-tertiary transition-colors">
                        {tx.description}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span className="inline-flex px-2.5 py-1 bg-red-50 text-brand-tertiary text-[10px] font-bold rounded-lg uppercase tracking-wide">
                      {tx.categoryName ?? '-'}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-xs font-semibold text-brand-stroke/50 dark:text-slate-400">{tx.accountName ?? '-'}</td>
                  <td className="px-3 py-4 text-xs font-semibold text-brand-stroke/50 dark:text-slate-400">
                    {new Date(tx.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-extrabold text-brand-tertiary">
                    - {formatCurrency(tx.amount)}
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
                <h3 className="text-base font-bold text-brand-stroke dark:text-white">Ubah Pengeluaran</h3>
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
                  {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

      {/* Budget Modal */}
      {budgetModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 pt-4">
          <div
            className="absolute inset-0 bg-black/40"
            style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={() => setBudgetModalOpen(false)}
          />
          <div
            className="relative bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-md flex flex-col"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          >
            <div className="px-6 py-5 border-b border-brand-stroke/5 dark:border-white/5 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-brand-stroke dark:text-white">Atur Anggaran</h3>
                  <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">Tetapkan limit per kategori — {currentMonthStr}</p>
                </div>
                <button
                  onClick={() => setBudgetModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-brand-stroke/40 dark:text-slate-500 hover:text-brand-stroke dark:hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={copyFromPrevMonth}
                disabled={isCopyingBudget}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-brand-stroke/5 dark:border-white/10 text-xs font-bold text-brand-stroke/60 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                {isCopyingBudget ? 'Menyalin...' : 'Salin dari bulan lalu'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-4">
              {budgetError && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 font-medium">
                  {budgetError}
                </div>
              )}
              {expenseCategories.length === 0 ? (
                <p className="text-sm text-brand-stroke/40 dark:text-slate-400 text-center py-8">Belum ada kategori pengeluaran</p>
              ) : (
                expenseCategories.map((cat) => (
                  <div key={cat.id}>
                    <label className="text-xs font-bold text-brand-stroke/60 dark:text-slate-400 block mb-1.5">{cat.name}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-brand-stroke/40 dark:text-slate-500">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0 (tidak diatur)"
                        value={budgetInputs[cat.id] ? new Intl.NumberFormat('id-ID').format(Number(budgetInputs[cat.id])) : ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setBudgetInputs(prev => ({ ...prev, [cat.id]: raw }))
                        }}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-bg/20 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-5 border-t border-brand-stroke/5 dark:border-white/5 shrink-0 flex gap-3">
              <button
                onClick={() => setBudgetModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke/60 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white hover:border-brand-stroke/20 dark:hover:border-white/20 text-sm font-bold transition-all"
              >
                Batal
              </button>
              <button
                onClick={saveBudgets}
                disabled={isSavingBudget}
                className="flex-1 py-3 rounded-xl bg-brand-bg text-brand-headline text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
              >
                {isSavingBudget ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {scanModalOpen && (
        <ScanReceiptModal
          categories={expenseCategories}
          accounts={txAccounts}
          onClose={() => setScanModalOpen(false)}
          onSaved={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  )
}

export default ExpensesPage

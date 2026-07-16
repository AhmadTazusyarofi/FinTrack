import { useState, useEffect, useMemo } from 'react'
import {
  TrendingDown, ArrowUpRight, ShieldAlert, BarChart2, ChevronDown,
  Settings2, X,
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { Transaction, Category, BudgetWithSpending } from '../../types'
import { getReportSummary } from '../../services/reportService'
import { getTransactions } from '../../services/transactionService'
import { getBudgets, setBudget } from '../../services/budgetService'
import { getCategories } from '../../services/categoryService'

const CHART_COLORS = ['#004643', '#abd1c6', '#f9bc60', '#e16162', '#6366f1', '#14b8a6', '#f97316', '#8b5cf6']

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
  const [month] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())

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
  }, [month, year])

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
            <h3 className="text-2xl font-extrabold tracking-tight text-white">
              {loading ? '...' : formatCurrency(totalExpense)}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <TrendingDown className="w-3 h-3 text-white/70" />
              <span className="text-[11px] font-bold text-white/60">bulan ini</span>
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
            <h3 className="text-2xl font-extrabold tracking-tight text-brand-stroke dark:text-white">
              {loading ? '...' : formatCurrency(dailyAverage)}
            </h3>
            <p className="text-xs font-semibold text-brand-stroke/40 dark:text-slate-400 mt-1">per hari (rata-rata bulan ini)</p>
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
                <h3 className={`text-2xl font-extrabold tracking-tight ${budgetUsedPercent >= 80 ? 'text-brand-tertiary' : 'text-brand-stroke dark:text-white'}`}>
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
            <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">Berdasarkan kategori bulan ini</p>
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
                  <span className="text-[10px] font-semibold text-brand-stroke/30 dark:text-slate-500 mt-0.5">bulan ini</span>
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-brand-stroke dark:text-white">Progress Budget per Kategori</h3>
              <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">Pantau penggunaan anggaran bulanan</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openBudgetModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-bg/10 hover:bg-brand-bg/20 text-brand-bg text-xs font-bold rounded-lg transition-all border border-brand-bg/20"
              >
                <Settings2 className="w-3 h-3" /> Atur Anggaran
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-brand-stroke/60 dark:text-slate-400 text-xs font-bold rounded-lg transition-all border border-brand-stroke/5 dark:border-white/5">
                {currentMonthStr} <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {budgetList.length === 0 ? (
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
        <div className="px-6 py-5 border-b border-brand-stroke/5 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-brand-stroke dark:text-white">Riwayat Pengeluaran</h3>
            <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">{txTotal} transaksi bulan ini</p>
          </div>
          <span className="px-3 py-1.5 bg-slate-50 dark:bg-white/5 text-brand-stroke/60 dark:text-slate-400 text-xs font-bold rounded-lg border border-brand-stroke/5 dark:border-white/5">
            {currentMonthStr}
          </span>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-stroke/5 dark:divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-brand-stroke/40 dark:text-slate-500 font-medium">Memuat...</td>
                </tr>
              )}
              {!loading && expenseTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-brand-stroke/40 dark:text-slate-500 font-medium">
                    Belum ada transaksi pengeluaran bulan ini
                  </td>
                </tr>
              )}
              {!loading && expenseTransactions.map((tx) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-brand-stroke/5 dark:border-white/5 shrink-0">
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

            {/* Modal Body */}
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

            {/* Modal Footer */}
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
    </div>
  )
}

export default ExpensesPage

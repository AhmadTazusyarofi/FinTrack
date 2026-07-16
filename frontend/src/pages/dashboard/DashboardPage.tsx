import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight, ArrowDownLeft, ArrowRight,
  Sun, Moon, LogOut,
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { ReportSummary, BudgetWithSpending, MonthlyChartEntry } from '../../types'
import { getReportSummary } from '../../services/reportService'
import { getBudgets } from '../../services/budgetService'
import { getAccounts } from '../../services/accountService'
import { getStoredUser, clearAuth } from '../../services/auth.service'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)

export function DashboardPage() {
  const navigate = useNavigate()
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [report, setReport] = useState<ReportSummary | null>(null)
  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)

  const { isDark, toggleTheme } = useTheme()
  const user = getStoredUser()
  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  function handleLogout() {
    clearAuth()
    navigate('/auth/login', { replace: true })
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getReportSummary(month, year),
      getBudgets(month, year),
      getAccounts(),
    ]).then(([rep, budgetList, accounts]) => {
      setReport(rep)
      setBudgets(budgetList)
      setTotalBalance(accounts.reduce((s, a) => s + a.balance, 0))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [month, year])

  const chartData = useMemo(() => {
    if (!report) return []
    return report.monthlyChart.map((m: MonthlyChartEntry) => ({
      month: new Date(m.month + '-01').toLocaleDateString('id-ID', { month: 'short' }),
      pemasukan: m.income,
      pengeluaran: m.expense,
    }))
  }, [report])

  const totalBudget = useMemo(() => budgets.reduce((s, b) => s + b.amount, 0), [budgets])
  const totalSpent = useMemo(() => budgets.reduce((s, b) => s + b.spent, 0), [budgets])
  const budgetUsedPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  return (
    <div className="bg-white dark:bg-[#0f1117] min-h-screen">

      {/* ── Greeting bar ── */}
      <div className="px-5 pb-5 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}>
        <div>
          <p className="text-xs text-slate-400 font-medium">Hi, Selamat Datang!</p>
          <h1 className="text-lg font-extrabold text-[#001e1d] dark:text-white leading-tight mt-0.5">
            {user?.name ?? 'Pengguna'}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/10 flex items-center justify-center transition-colors"
          >
            {isDark
              ? <Sun className="w-5 h-5 text-[#f9bc60]" strokeWidth={2} />
              : <Moon className="w-5 h-5 text-[#004643]" strokeWidth={2} />
            }
          </button>
          <div className="relative">
            <button
              onClick={() => setAvatarOpen(!avatarOpen)}
              className="w-10 h-10 rounded-full bg-[#004643] flex items-center justify-center ring-2 ring-[#004643]/20"
            >
              <span className="text-[11px] font-extrabold text-[#f9bc60]">{initials}</span>
            </button>
            {avatarOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAvatarOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-xl border border-slate-100 dark:border-white/5 z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-50 dark:border-white/5">
                    <p className="text-xs font-bold text-[#001e1d] dark:text-white truncate">{user?.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-[#e16162] hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── BukuKas Balance Card ── */}
      <div className="px-5 mb-6">
        <div className="bg-gradient-to-br from-[#006b65] via-[#004643] to-[#002523] rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[148px]">
          {/* Decorative circles */}
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/[0.04]" />
          <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full bg-white/[0.06]" />
          <div className="absolute right-12 -bottom-10 w-32 h-32 rounded-full bg-white/[0.03]" />

          <div className="flex items-start justify-between relative z-10">
            <div>
              <h3 className="text-white font-bold text-base tracking-tight">BukuKas</h3>
              <p className="text-[#abd1c6] text-[11px] font-medium mt-0.5">Keuangan Pribadi</p>
            </div>
            {/* SIM chip icon */}
            <div className="relative w-10 h-7 bg-gradient-to-br from-yellow-200 to-amber-400 rounded overflow-hidden shadow-sm flex-shrink-0">
              <div className="absolute top-[30%] left-0 right-0 h-[1px] bg-amber-700/25" />
              <div className="absolute top-[60%] left-0 right-0 h-[1px] bg-amber-700/25" />
              <div className="absolute top-0 bottom-0 left-[33%] w-[1px] bg-amber-700/25" />
              <div className="absolute top-0 bottom-0 left-[66%] w-[1px] bg-amber-700/25" />
            </div>
          </div>

          <div className="relative z-10 mt-5">
            <p className="text-[#abd1c6]/70 text-[10px] font-semibold uppercase tracking-widest mb-1">Total Saldo</p>
            <h2 className="text-white text-2xl font-extrabold tracking-tight">
              {loading ? '—' : formatCurrency(totalBalance)}
            </h2>
          </div>
        </div>
      </div>

      {/* ── Ringkasan ── */}
      <div className="px-5 mb-6">
        <h2 className="text-sm font-bold text-[#001e1d] dark:text-white mb-3">Ringkasan</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Pemasukan</span>
            </div>
            <p className="text-sm font-extrabold text-[#001e1d] dark:text-white leading-tight">
              {loading ? '—' : formatCurrency(report?.totalIncome ?? 0)}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4 text-red-500" strokeWidth={2.5} />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Pengeluaran</span>
            </div>
            <p className="text-sm font-extrabold text-[#001e1d] dark:text-white leading-tight">
              {loading ? '—' : formatCurrency(report?.totalExpense ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Budget progress (if any) ── */}
      {!loading && budgets.length > 0 && (
        <div className="px-5 mb-6">
          <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-[#001e1d] dark:text-white">Anggaran Bulan Ini</p>
              <button
                onClick={() => navigate('/expenses')}
                className="text-[10px] font-bold text-[#004643] flex items-center gap-0.5"
              >
                Atur <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(budgetUsedPct, 100)}%`,
                  backgroundColor: budgetUsedPct >= 90 ? '#e16162' : budgetUsedPct >= 70 ? '#f9bc60' : '#004643',
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-semibold">
              <span className="text-slate-500">Terpakai {budgetUsedPct}%</span>
              <span className="text-slate-500">Sisa {Math.max(100 - budgetUsedPct, 0)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Analisis Arus Kas Chart ── */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#001e1d] dark:text-white">Analisis Arus Kas</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#abd1c6] inline-block" />
              <span className="text-[10px] text-slate-400 font-semibold">Masuk</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#e16162] inline-block" />
              <span className="text-[10px] text-slate-400 font-semibold">Keluar</span>
            </div>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="dashGradIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#abd1c6" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#abd1c6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dashGradOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e16162" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#e16162" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v / 1000000}jt`}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              />
              <Tooltip
                formatter={(value: number | string) => [formatCurrency(Number(value)), '']}
                contentStyle={{
                  backgroundColor: '#001e1d',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fffffe',
                  fontSize: '11px',
                  fontWeight: 600,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}
                itemStyle={{ color: '#fffffe' }}
                labelStyle={{ color: '#abd1c6', fontWeight: 700 }}
              />
              <Area
                type="monotone"
                dataKey="pemasukan"
                stroke="#abd1c6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#dashGradIn)"
              />
              <Area
                type="monotone"
                dataKey="pengeluaran"
                stroke="#e16162"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#dashGradOut)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Transaksi Terakhir ── */}
      <div className="px-5 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#001e1d] dark:text-white">Transaksi Terakhir</h2>
          <button
            onClick={() => navigate('/transactions')}
            className="text-[10px] font-bold text-[#004643] flex items-center gap-0.5"
          >
            Lihat Semua <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {loading && (
          <div className="py-10 text-center text-sm text-slate-400 font-medium">Memuat...</div>
        )}
        {!loading && !report?.recentTransactions?.length && (
          <div className="py-10 text-center text-sm text-slate-400 font-medium">Belum ada transaksi</div>
        )}
        {!loading && report?.recentTransactions?.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 py-3 border-b border-slate-50 dark:border-white/5 last:border-0"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              tx.type === 'INCOME' ? 'bg-emerald-50' : 'bg-red-50'
            }`}>
              {tx.type === 'INCOME'
                ? <ArrowDownLeft className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                : <ArrowUpRight className="w-5 h-5 text-red-500" strokeWidth={2.5} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#001e1d] dark:text-white truncate">{tx.description}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {tx.categoryName ?? '—'} &middot;{' '}
                {new Date(tx.date + 'T00:00:00').toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
            <span className={`text-xs font-extrabold shrink-0 ${
              tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DashboardPage

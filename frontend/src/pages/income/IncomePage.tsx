import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, ArrowDownLeft, Wallet, Target, ChevronDown } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell,
} from 'recharts'
import { Transaction, MonthlyChartEntry } from '../../types'
import { getReportSummary } from '../../services/reportService'
import { getTransactions } from '../../services/transactionService'

const CHART_COLORS = ['#004643', '#abd1c6', '#f9bc60', '#e16162', '#9333ea', '#3b82f6']
const INCOME_TARGET = 20_000_000

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
  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())

  const [chartData, setChartData] = useState<{ month: string; amount: number; rawMonth: string }[]>([])
  const [currentMonthIncome, setCurrentMonthIncome] = useState(0)
  const [incomeTransactions, setIncomeTransactions] = useState<Transaction[]>([])
  const [txTotal, setTxTotal] = useState(0)
  const [loading, setLoading] = useState(false)

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
  }, [month, year])

  const yearTotal = useMemo(() => chartData.reduce((s, d) => s + d.amount, 0), [chartData])

  const average = useMemo(() =>
    chartData.length > 0 ? Math.round(yearTotal / chartData.length) : 0,
    [chartData, yearTotal])

  const growthInfo = useMemo(() => {
    if (chartData.length < 2) return null
    const last = chartData[chartData.length - 1]
    const prev = chartData[chartData.length - 2]
    if (prev.amount === 0) return null
    const pct = (((last.amount - prev.amount) / prev.amount) * 100).toFixed(1)
    return Number(pct)
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

  const targetPercent = Math.min((currentMonthIncome / INCOME_TARGET) * 100, 100)
  const currentMonthStr = new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
  const currentRawMonth = `${year}-${String(month).padStart(2, '0')}`

  return (
    <div className="space-y-6 pb-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Total Pemasukan (Year-to-Date) */}
        <div className="bg-brand-bg text-brand-headline rounded-3xl p-6 shadow-md flex flex-col justify-between min-h-[140px] relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white/5 -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-bold text-brand-paragraph/70 uppercase tracking-widest">Total Pemasukan</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-brand-paragraph" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-extrabold tracking-tight text-white">
              {loading ? '...' : formatCurrency(yearTotal)}
            </h3>
            {growthInfo !== null && (
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
            <h3 className="text-2xl font-extrabold tracking-tight text-brand-stroke dark:text-white">
              {loading ? '...' : formatCurrency(currentMonthIncome)}
            </h3>
            <p className="text-xs font-semibold text-brand-stroke/40 dark:text-slate-400 mt-1">dari {txTotal} transaksi pemasukan</p>
          </div>
        </div>

        {/* Target */}
        <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-6 shadow-sm border border-brand-stroke/5 dark:border-white/5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest">Target Bulanan</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Target className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight text-brand-stroke dark:text-white">{formatCurrency(INCOME_TARGET)}</h3>
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
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-brand-stroke/60 dark:text-slate-400 text-xs font-bold rounded-lg transition-all border border-brand-stroke/5 dark:border-white/5">
              {year} <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#001e1d', opacity: 0.4, fontSize: 11, fontWeight: 700 }} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={formatShort} tick={{ fill: '#001e1d', opacity: 0.4, fontSize: 11, fontWeight: 600 }} />
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
          {sources.length === 0 ? (
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
        <div className="px-6 py-5 border-b border-brand-stroke/5 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-brand-stroke dark:text-white">Riwayat Pemasukan</h3>
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
              {!loading && incomeTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-brand-stroke/40 dark:text-slate-500 font-medium">
                    Belum ada transaksi pemasukan bulan ini
                  </td>
                </tr>
              )}
              {!loading && incomeTransactions.map((tx) => (
                <tr key={tx.id} className="group hover:bg-emerald-50/30 dark:hover:bg-white/5 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <span className="text-sm font-semibold text-brand-stroke dark:text-white group-hover:text-brand-bg transition-colors">
                        {tx.description}
                      </span>
                    </div>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default IncomePage

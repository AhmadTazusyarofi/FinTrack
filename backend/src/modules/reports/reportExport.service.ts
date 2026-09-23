import { findReportTransactions } from './reportExport.repository'
import { findUserById } from '../auth/auth.repository'
import { findPayday } from '../periods/periods.repository'
import { periodRange } from '../../utils/payPeriod'
import { ExportReport, ReportSelection, ReportTransaction } from './reportExport.types'

// Monetary values remain exact, including amounts above Number.MAX_SAFE_INTEGER.
export function toCents(value: string): bigint {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Nominal transaksi tidak valid')
  const negative = value.startsWith('-')
  const [whole, fraction = ''] = value.replace(/^-/, '').split('.')
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  return negative ? -cents : cents
}

export function decimal(cents: bigint): string {
  const abs = cents < 0n ? -cents : cents
  return `${cents < 0n ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`
}

export function summarizeTransactions(rows: ReportTransaction[]) {
  let income = 0n, expense = 0n, incomeCount = 0, expenseCount = 0
  const groups = new Map<string, { name: string; type: 'INCOME' | 'EXPENSE'; cents: bigint; count: number }>()
  for (const row of rows) {
    const cents = toCents(row.amount)
    if (row.type === 'INCOME') { income += cents; incomeCount++ }
    else { expense += cents; expenseCount++ }
    const key = JSON.stringify([row.type, row.category])
    const group = groups.get(key) ?? { name: row.category, type: row.type, cents: 0n, count: 0 }
    group.cents += cents
    group.count++
    groups.set(key, group)
  }
  const categories = [...groups.values()].sort((a, b) => a.cents > b.cents ? -1 : a.cents < b.cents ? 1 : a.name.localeCompare(b.name))
    .map(({ cents, ...group }) => ({ ...group, amount: decimal(cents) }))
  return { income: decimal(income), expense: decimal(expense), net: decimal(income - expense), incomeCount, expenseCount, categories }
}

export async function getExportReport(userId: string, selection: ReportSelection): Promise<ExportReport> {
  const [user, payday] = await Promise.all([findUserById(userId), findPayday(userId)])
  if (!user) throw new Error('Pengguna tidak ditemukan')
  const range = periodRange(selection.year, selection.month, selection.mode === 'salary' ? payday ?? 1 : 1)
  const transactions = await findReportTransactions(userId, range.start, range.end)
  return { selection, name: user.name, payday, ...range, generatedAt: new Date(), transactions, ...summarizeTransactions(transactions) }
}

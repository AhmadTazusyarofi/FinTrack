import {
  findTransactions, findTransactionById,
  insertTransaction, updateTransactionRow, deleteTransactionRow,
  TransactionRow, TxFilter, TxMeta, TxData,
} from './transactions.repository'
import { resolvePeriod } from '../periods/periods.service'
import { periodRange } from '../../utils/payPeriod'

export async function getTransactions(
  userId: string, filter: TxFilter
): Promise<{ data: TransactionRow[]; meta: TxMeta }> {
  let range: { start: string; end: string } | undefined
  if (filter.month !== undefined || filter.year !== undefined) {
    const period = await resolvePeriod(userId, filter.month, filter.year)
    range = filter.month !== undefined ? period : {
      start: periodRange(period.year, 1, period.day).start,
      end: periodRange(period.year + 1, 1, period.day).start,
    }
  }
  return findTransactions(userId, filter, range)
}

export async function addTransaction(userId: string, data: TxData): Promise<TransactionRow> {
  return insertTransaction(userId, data)
}

export async function editTransaction(id: string, userId: string, data: TxData): Promise<TransactionRow> {
  const existing = await findTransactionById(id, userId)
  if (!existing) throw new Error('Transaksi tidak ditemukan')
  return updateTransactionRow(id, userId, data, existing)
}

export async function removeTransaction(id: string, userId: string): Promise<void> {
  const existing = await findTransactionById(id, userId)
  if (!existing) throw new Error('Transaksi tidak ditemukan')
  return deleteTransactionRow(id, userId, existing)
}

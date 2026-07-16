import {
  findTransactions, findTransactionById,
  insertTransaction, updateTransactionRow, deleteTransactionRow,
  TransactionRow, TxFilter, TxMeta, TxData,
} from './transactions.repository'

export async function getTransactions(
  userId: string, filter: TxFilter
): Promise<{ data: TransactionRow[]; meta: TxMeta }> {
  return findTransactions(userId, filter)
}

export async function addTransaction(userId: string, data: TxData): Promise<TransactionRow> {
  return insertTransaction(userId, data)
}

export async function editTransaction(id: string, userId: string, data: TxData): Promise<TransactionRow> {
  const existing = await findTransactionById(id, userId)
  if (!existing) throw new Error('Transaksi tidak ditemukan')
  return updateTransactionRow(id, userId, data)
}

export async function removeTransaction(id: string, userId: string): Promise<void> {
  const existing = await findTransactionById(id, userId)
  if (!existing) throw new Error('Transaksi tidak ditemukan')
  return deleteTransactionRow(id, userId)
}

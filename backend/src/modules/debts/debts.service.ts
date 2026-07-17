import {
  DebtRow, DebtPaymentRow, DebtData, DebtUpdateData, PaymentData, DebtType, DebtStatus,
  findDebts, findDebtById, findPaymentsByDebtId,
  insertDebt, updateDebtRow, deleteDebtRow, insertPayment, deletePaymentRow,
} from './debts.repository'

export async function getDebts(userId: string, type?: DebtType, status?: DebtStatus): Promise<DebtRow[]> {
  return findDebts(userId, type, status)
}

export async function getDebtWithPayments(id: string, userId: string) {
  const debt = await findDebtById(id, userId)
  if (!debt) throw new Error('Hutang tidak ditemukan')
  const payments = await findPaymentsByDebtId(id)
  return { ...debt, payments }
}

export async function createDebt(userId: string, data: DebtData): Promise<DebtRow> {
  return insertDebt(userId, data)
}

export async function editDebt(id: string, userId: string, data: DebtUpdateData): Promise<DebtRow> {
  const existing = await findDebtById(id, userId)
  if (!existing) throw new Error('Hutang tidak ditemukan')
  return updateDebtRow(id, userId, data)
}

export async function removeDebt(id: string, userId: string): Promise<void> {
  const existing = await findDebtById(id, userId)
  if (!existing) throw new Error('Hutang tidak ditemukan')
  return deleteDebtRow(id, userId)
}

export async function addPayment(debtId: string, userId: string, data: PaymentData): Promise<DebtPaymentRow> {
  const debt = await findDebtById(debtId, userId)
  if (!debt) throw new Error('Hutang tidak ditemukan')
  if (debt.status === 'SETTLED') throw new Error('Hutang sudah lunas')
  const remaining = debt.amount - debt.paid_amount
  if (data.amount > remaining + 0.001) throw new Error(`Jumlah melebihi sisa hutang (${remaining})`)
  return insertPayment(userId, debt, data)
}

export async function removePayment(debtId: string, paymentId: string, userId: string): Promise<void> {
  const debt = await findDebtById(debtId, userId)
  if (!debt) throw new Error('Hutang tidak ditemukan')
  return deletePaymentRow(userId, debt, paymentId)
}

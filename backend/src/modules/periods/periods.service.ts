import { findPayday, savePayday } from './periods.repository'
import { activePeriod, periodRange } from '../../utils/payPeriod'

export async function getPeriodSettings(userId: string) {
  return { payday: await findPayday(userId) }
}

export async function updatePeriodSettings(userId: string, payday: number) {
  if (!Number.isInteger(payday) || payday < 1 || payday > 31) throw new Error('Tanggal gajian harus 1–31')
  await savePayday(userId, payday)
  return { payday }
}

export async function resolvePeriod(userId: string, month?: number, year?: number) {
  const day = (await findPayday(userId)) ?? 1
  const current = activePeriod(day)
  month ??= current.month
  year ??= current.year
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('Periode tidak valid')
  }
  return { day, month, year, ...periodRange(year, month, day) }
}

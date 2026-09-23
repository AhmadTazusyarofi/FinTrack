/** Periods are named by their START month; the end is exclusive. Dates are date-only. */
export function periodBoundary(year: number, month: number, day: number): string {
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('Tanggal gajian harus 1–31')
  const first = new Date(Date.UTC(year, month - 1, 1))
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

export function periodRange(year: number, month: number, day: number) {
  return { start: periodBoundary(year, month, day), end: periodBoundary(year, month + 1, day) }
}

export function activePeriod(day: number, today = new Date()) {
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const boundaryDay = Number(periodBoundary(year, month, day).slice(-2))
  const start = new Date(year, month - 1 - (today.getDate() < boundaryDay ? 1 : 0), 1)
  return { month: start.getMonth() + 1, year: start.getFullYear() }
}

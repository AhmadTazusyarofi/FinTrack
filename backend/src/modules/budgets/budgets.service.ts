import { BudgetWithSpending, findBudgetsWithSpending, upsertBudget } from './budgets.repository'
import { resolvePeriod } from '../periods/periods.service'

export async function getBudgets(userId: string, month?: number, year?: number): Promise<BudgetWithSpending[]> {
  const period = await resolvePeriod(userId, month, year)
  return findBudgetsWithSpending(userId, period.month, period.year, period)
}

export async function setBudget(
  userId: string, categoryId: string, amount: number, month: number, year: number
): Promise<void> {
  return upsertBudget(userId, categoryId, amount, month, year)
}

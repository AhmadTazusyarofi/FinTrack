import { BudgetWithSpending, findBudgetsWithSpending, upsertBudget } from './budgets.repository'

export async function getBudgets(userId: string, month: number, year: number): Promise<BudgetWithSpending[]> {
  return findBudgetsWithSpending(userId, month, year)
}

export async function setBudget(
  userId: string, categoryId: string, amount: number, month: number, year: number
): Promise<void> {
  return upsertBudget(userId, categoryId, amount, month, year)
}

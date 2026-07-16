import { CategoryRow, findCategoriesByUserId } from './categories.repository'

export async function getCategories(userId: string): Promise<CategoryRow[]> {
  return findCategoriesByUserId(userId)
}

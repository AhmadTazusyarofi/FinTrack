import { CategoryRow, findCategoriesByUserId, createCategory, updateCategory, deleteCategory } from './categories.repository'

export async function getCategories(userId: string): Promise<CategoryRow[]> {
  return findCategoriesByUserId(userId)
}

export async function createCategoryService(userId: string, name: string, type: 'INCOME' | 'EXPENSE'): Promise<CategoryRow> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Nama kategori wajib diisi')
  try {
    return await createCategory(userId, trimmed, type)
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') throw new Error('Kategori dengan nama ini sudah ada')
    throw err
  }
}

export async function updateCategoryService(id: string, userId: string, name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Nama kategori wajib diisi')
  try {
    await updateCategory(id, userId, trimmed)
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') throw new Error('Kategori dengan nama ini sudah ada')
    throw err
  }
}

export async function deleteCategoryService(id: string, userId: string): Promise<void> {
  try {
    await deleteCategory(id, userId)
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'ER_ROW_IS_REFERENCED_2') {
      throw new Error('Kategori ini masih digunakan dalam transaksi atau anggaran')
    }
    throw err
  }
}

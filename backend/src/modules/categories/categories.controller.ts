import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getCategories, createCategoryService, updateCategoryService, deleteCategoryService } from './categories.service'
import { sendSuccess, sendError } from '../../utils/response'

const createSchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi'),
  type: z.enum(['INCOME', 'EXPENSE'], { errorMap: () => ({ message: 'Tipe harus INCOME atau EXPENSE' }) }),
})

const updateSchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi'),
})

export async function getCategoriesController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const categories = await getCategories(req.userId!)
    sendSuccess(res, categories)
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 500)
  }
}

export async function createCategoryController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const category = await createCategoryService(req.userId!, parsed.data.name, parsed.data.type)
    sendSuccess(res, category, 'Kategori berhasil ditambahkan', 201)
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function updateCategoryController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    await updateCategoryService(req.params.id, req.userId!, parsed.data.name)
    sendSuccess(res, null, 'Kategori berhasil diperbarui')
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function deleteCategoryController(req: AuthRequest, res: Response): Promise<void> {
  try {
    await deleteCategoryService(req.params.id, req.userId!)
    sendSuccess(res, null, 'Kategori berhasil dihapus')
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

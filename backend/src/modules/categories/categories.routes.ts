import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { getCategoriesController, createCategoryController, updateCategoryController, deleteCategoryController } from './categories.controller'

const router = Router()
router.get('/', authenticate, getCategoriesController)
router.post('/', authenticate, createCategoryController)
router.put('/:id', authenticate, updateCategoryController)
router.delete('/:id', authenticate, deleteCategoryController)
export default router

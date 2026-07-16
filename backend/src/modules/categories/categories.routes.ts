import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { getCategoriesController } from './categories.controller'

const router = Router()
router.get('/', authenticate, getCategoriesController)
export default router

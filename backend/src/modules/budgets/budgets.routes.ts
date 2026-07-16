import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { getBudgetsController, setBudgetController } from './budgets.controller'

const router = Router()
router.get('/',  authenticate, getBudgetsController)
router.post('/', authenticate, setBudgetController)
export default router

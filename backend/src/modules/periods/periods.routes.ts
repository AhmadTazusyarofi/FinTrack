import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { getPeriodController, updatePeriodController } from './periods.controller'

const router = Router()
router.use(authenticate)
router.get('/', getPeriodController)
router.put('/', updatePeriodController)
export default router

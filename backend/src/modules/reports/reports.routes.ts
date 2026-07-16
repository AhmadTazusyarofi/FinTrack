import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { getSummaryController } from './reports.controller'

const router = Router()
router.get('/summary', authenticate, getSummaryController)
export default router

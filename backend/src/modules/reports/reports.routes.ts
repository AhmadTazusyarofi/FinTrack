import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { getSummaryController, exportPdfController } from './reports.controller'

const router = Router()
router.get('/summary', authenticate, getSummaryController)
router.get('/pdf', authenticate, exportPdfController)
export default router

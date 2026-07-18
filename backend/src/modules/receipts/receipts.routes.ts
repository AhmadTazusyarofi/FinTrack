import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { uploadMiddleware, scanReceipt } from './receipts.controller'

const router = Router()

router.post('/scan', authenticate, uploadMiddleware, scanReceipt)

export default router

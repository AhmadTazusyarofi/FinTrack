import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { getAccountsController } from './accounts.controller'

const router = Router()
router.get('/', authenticate, getAccountsController)
export default router

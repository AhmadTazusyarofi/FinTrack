import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { getAccountsController, createAccountController, updateAccountController, deleteAccountController } from './accounts.controller'

const router = Router()
router.get('/', authenticate, getAccountsController)
router.post('/', authenticate, createAccountController)
router.put('/:id', authenticate, updateAccountController)
router.delete('/:id', authenticate, deleteAccountController)
export default router

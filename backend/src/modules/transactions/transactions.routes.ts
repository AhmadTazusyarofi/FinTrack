import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import {
  getTransactionsController, createTransactionController,
  updateTransactionController, deleteTransactionController,
} from './transactions.controller'

const router = Router()
router.get('/',       authenticate, getTransactionsController)
router.post('/',      authenticate, createTransactionController)
router.put('/:id',    authenticate, updateTransactionController)
router.delete('/:id', authenticate, deleteTransactionController)
export default router

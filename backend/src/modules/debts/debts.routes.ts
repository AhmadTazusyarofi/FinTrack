import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import {
  getDebtsController,
  getDebtByIdController,
  createDebtController,
  updateDebtController,
  deleteDebtController,
  createPaymentController,
  deletePaymentController,
} from './debts.controller'

const router = Router()

router.get('/',                     authenticate, getDebtsController)
router.post('/',                    authenticate, createDebtController)
router.get('/:id',                  authenticate, getDebtByIdController)
router.patch('/:id',                authenticate, updateDebtController)
router.delete('/:id',               authenticate, deleteDebtController)
router.post('/:id/payments',        authenticate, createPaymentController)
router.delete('/:id/payments/:pid', authenticate, deletePaymentController)

export default router

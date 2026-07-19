import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import {
  getWishlistsController,
  createWishlistController,
  updateWishlistController,
  purchaseWishlistController,
  deleteWishlistController,
  reorderWishlistController,
} from './wishlists.controller'

const router = Router()

router.get('/',               authenticate, getWishlistsController)
router.post('/',              authenticate, createWishlistController)
router.patch('/reorder',      authenticate, reorderWishlistController)
router.put('/:id',            authenticate, updateWishlistController)
router.patch('/:id/purchase', authenticate, purchaseWishlistController)
router.delete('/:id',         authenticate, deleteWishlistController)

export default router

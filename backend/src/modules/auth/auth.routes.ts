import { Router } from 'express'
import { registerController, loginController, getMeController, updateProfileController, changePasswordController, uploadAvatarController, uploadAvatarMiddleware, updateEmailController, deleteAccountController } from './auth.controller'
import { authenticate } from '../../middleware/auth.middleware'

const router = Router()

router.post('/register', registerController)
router.post('/login', loginController)
router.get('/me', authenticate, getMeController)
router.put('/profile', authenticate, updateProfileController)
router.put('/password', authenticate, changePasswordController)
router.post('/avatar', authenticate, uploadAvatarMiddleware, uploadAvatarController)
router.put('/email', authenticate, updateEmailController)
router.delete('/account', authenticate, deleteAccountController)

export default router

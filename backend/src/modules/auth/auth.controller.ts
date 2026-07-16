import { Request, Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import path from 'path'
import { register, login, getMe, updateProfile, changePassword, uploadAvatar, updateEmail, deleteAccount } from './auth.service'
import { sendSuccess, sendError } from '../../utils/response'
import { AuthRequest } from '../../middleware/auth.middleware'

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../../public/uploads/avatars'))
  },
  filename: (req: AuthRequest | Request, _file, cb) => {
    const userId = (req as AuthRequest).userId ?? 'unknown'
    cb(null, `${userId}_${Date.now()}${path.extname((_file as Express.Multer.File).originalname)}`)
  },
})

export const uploadAvatarMiddleware = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Hanya file gambar yang diperbolehkan'))
  },
}).single('foto')

const registerSchema = z.object({
  name:     z.string().min(2, 'Nama minimal 2 karakter'),
  email:    z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

const loginSchema = z.object({
  email:    z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export async function registerController(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422)
    return
  }
  try {
    const { name, email, password } = parsed.data
    const result = await register(name, email, password)
    sendSuccess(res, result, 'Registrasi berhasil', 201)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    sendError(res, message, 400)
  }
}

export async function loginController(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422)
    return
  }
  try {
    const { email, password } = parsed.data
    const result = await login(email, password)
    sendSuccess(res, result, 'Login berhasil')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    sendError(res, message, 400)
  }
}

export async function getMeController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await getMe(req.userId!)
    sendSuccess(res, user)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    sendError(res, message, 404)
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password lama wajib diisi'),
  newPassword:     z.string().min(6, 'Password baru minimal 6 karakter'),
})

export async function updateProfileController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = updateProfileSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422)
    return
  }
  try {
    const result = await updateProfile(req.userId!, parsed.data.name)
    sendSuccess(res, result, 'Profil berhasil diperbarui')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    sendError(res, message, 400)
  }
}

export async function uploadAvatarController(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      sendError(res, 'File gambar wajib diunggah', 422)
      return
    }
    const result = await uploadAvatar(req.userId!, req.file.path)
    sendSuccess(res, result, 'Foto profil berhasil diperbarui')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    sendError(res, message, 400)
  }
}

export async function changePasswordController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422)
    return
  }
  try {
    await changePassword(req.userId!, parsed.data.currentPassword, parsed.data.newPassword)
    sendSuccess(res, null, 'Password berhasil diubah')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    sendError(res, message, 400)
  }
}

const updateEmailSchema = z.object({
  newEmail: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export async function updateEmailController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = updateEmailSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422)
    return
  }
  try {
    const result = await updateEmail(req.userId!, parsed.data.newEmail, parsed.data.password)
    sendSuccess(res, result, 'Email berhasil diperbarui')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    sendError(res, message, 400)
  }
}

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password wajib diisi'),
})

export async function deleteAccountController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = deleteAccountSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422)
    return
  }
  try {
    await deleteAccount(req.userId!, parsed.data.password)
    sendSuccess(res, null, 'Akun berhasil dihapus')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    sendError(res, message, 400)
  }
}

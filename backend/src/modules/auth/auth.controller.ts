import { Request, Response } from 'express'
import { z } from 'zod'
import { register, login, getMe } from './auth.service'
import { sendSuccess, sendError } from '../../utils/response'
import { AuthRequest } from '../../middleware/auth.middleware'

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

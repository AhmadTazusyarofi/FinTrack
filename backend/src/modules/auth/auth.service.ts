import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../../config'
import { pool } from '../../database/connection/db'
import { findUserByEmail, createUser, findUserById, findUserByIdWithPassword, createDefaultData, updateUserName, updateUserPassword, updateUserAvatar, updateUserEmail, deleteUserById } from './auth.repository'
import fs from 'fs'
import path from 'path'

export interface AuthPayload {
  token: string
  user: {
    id: string
    name: string
    email: string
    foto_profil: string | null
  }
}

export async function register(name: string, email: string, password: string): Promise<AuthPayload> {
  const existing = await findUserByEmail(email)
  if (existing) throw new Error('Email sudah terdaftar')

  const hashedPassword = await bcrypt.hash(password, config.bcryptRounds)
  const id = uuidv4()

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(
      'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
      [id, name, email, hashedPassword]
    )
    await createDefaultData(conn, id)
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  const token = jwt.sign({ userId: id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  })
  return { token, user: { id, name, email, foto_profil: null } }
}

export async function login(email: string, password: string): Promise<AuthPayload> {
  const user = await findUserByEmail(email)
  if (!user) throw new Error('Email atau password salah')

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw new Error('Email atau password salah')

  const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  })

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, foto_profil: user.foto_profil ?? null },
  }
}

export async function getMe(userId: string) {
  const user = await findUserById(userId)
  if (!user) throw new Error('User tidak ditemukan')
  return { id: user.id, name: user.name, email: user.email, foto_profil: user.foto_profil ?? null }
}

export async function uploadAvatar(userId: string, filePath: string) {
  const user = await findUserById(userId)
  if (!user) throw new Error('User tidak ditemukan')

  if (user.foto_profil) {
    const oldPath = path.join(__dirname, '../../../public', user.foto_profil)
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  }

  const relativePath = `/uploads/avatars/${path.basename(filePath)}`
  await updateUserAvatar(userId, relativePath)
  return { foto_profil: relativePath }
}

export async function updateProfile(userId: string, name: string) {
  const trimmed = name.trim()
  if (trimmed.length < 2) throw new Error('Nama minimal 2 karakter')
  await updateUserName(userId, trimmed)
  return { name: trimmed }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await findUserByIdWithPassword(userId)
  if (!user) throw new Error('User tidak ditemukan')

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) throw new Error('Password lama tidak sesuai')

  if (newPassword.length < 6) throw new Error('Password baru minimal 6 karakter')

  const hashed = await bcrypt.hash(newPassword, config.bcryptRounds)
  await updateUserPassword(userId, hashed)
}

export async function updateEmail(userId: string, newEmail: string, password: string) {
  const user = await findUserByIdWithPassword(userId)
  if (!user) throw new Error('User tidak ditemukan')

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw new Error('Password tidak sesuai')

  const existing = await findUserByEmail(newEmail)
  if (existing && existing.id !== userId) throw new Error('Email sudah digunakan akun lain')

  await updateUserEmail(userId, newEmail.trim())
  return { email: newEmail.trim() }
}

export async function deleteAccount(userId: string, password: string) {
  const user = await findUserByIdWithPassword(userId)
  if (!user) throw new Error('User tidak ditemukan')

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw new Error('Password tidak sesuai')

  if (user.foto_profil) {
    const oldPath = path.join(__dirname, '../../../public', user.foto_profil)
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  }

  await deleteUserById(userId)
}

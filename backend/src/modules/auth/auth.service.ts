import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../../config'
import { pool } from '../../database/connection/db'
import { findUserByEmail, createUser, findUserById, createDefaultData } from './auth.repository'

export interface AuthPayload {
  token: string
  user: {
    id: string
    name: string
    email: string
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
  return { token, user: { id, name, email } }
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
    user: { id: user.id, name: user.name, email: user.email },
  }
}

export async function getMe(userId: string) {
  const user = await findUserById(userId)
  if (!user) throw new Error('User tidak ditemukan')
  return { id: user.id, name: user.name, email: user.email }
}

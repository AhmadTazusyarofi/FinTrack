import { pool } from '../../database/connection/db'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { PoolConnection } from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'

export interface UserRow {
  id: string
  name: string
  email: string
  password: string
  foto_profil: string | null
  created_at: Date
  updated_at: Date
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, email, password, foto_profil, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
    [email]
  )
  return (rows[0] as UserRow) ?? null
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, email, foto_profil, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
    [id]
  )
  return (rows[0] as UserRow) ?? null
}

export async function findUserByIdWithPassword(id: string): Promise<UserRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, email, password, foto_profil, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
    [id]
  )
  return (rows[0] as UserRow) ?? null
}

export async function updateUserAvatar(id: string, fotoProfil: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    'UPDATE users SET foto_profil = ?, updated_at = NOW() WHERE id = ?',
    [fotoProfil, id]
  )
}

export async function createUser(
  id: string,
  name: string,
  email: string,
  hashedPassword: string
): Promise<void> {
  await pool.query<ResultSetHeader>(
    'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
    [id, name, email, hashedPassword]
  )
}

const DEFAULT_CATEGORIES: { name: string; type: 'INCOME' | 'EXPENSE' }[] = [
  { name: 'Gaji', type: 'INCOME' },
  { name: 'Freelance', type: 'INCOME' },
  { name: 'Bisnis', type: 'INCOME' },
  { name: 'Investasi', type: 'INCOME' },
  { name: 'Hadiah', type: 'INCOME' },
  { name: 'Lainnya', type: 'INCOME' },
  { name: 'Makanan & Minuman', type: 'EXPENSE' },
  { name: 'Transport', type: 'EXPENSE' },
  { name: 'Hiburan', type: 'EXPENSE' },
  { name: 'Kesehatan', type: 'EXPENSE' },
  { name: 'Belanja', type: 'EXPENSE' },
  { name: 'Tagihan', type: 'EXPENSE' },
  { name: 'Pendidikan', type: 'EXPENSE' },
  { name: 'Lainnya', type: 'EXPENSE' },
]

export async function updateUserName(id: string, name: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    'UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?',
    [name, id]
  )
}

export async function updateUserPassword(id: string, hashedPassword: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
    [hashedPassword, id]
  )
}

export async function updateUserEmail(id: string, email: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    'UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?',
    [email, id]
  )
}

export async function deleteUserById(id: string): Promise<void> {
  await pool.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id])
}

export async function createDefaultData(conn: PoolConnection, userId: string): Promise<void> {
  for (const cat of DEFAULT_CATEGORIES) {
    await conn.query<ResultSetHeader>(
      'INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)',
      [uuidv4(), userId, cat.name, cat.type]
    )
  }
  await conn.query<ResultSetHeader>(
    'INSERT INTO accounts (id, user_id, name, balance) VALUES (?, ?, ?, ?)',
    [uuidv4(), userId, 'Rekening Utama', 0]
  )
}

import { RowDataPacket } from 'mysql2/promise'
import { pool } from '../../database/connection/db'

export async function findPayday(userId: string): Promise<number | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT payday FROM users WHERE id = ?', [userId])
    if (!rows[0]) throw new Error('Pengguna tidak ditemukan')
    return rows[0].payday == null ? null : Number(rows[0].payday)
  } catch (err) {
    // During an incremental deployment, old schemas retain calendar-month behavior.
    if ((err as { code?: string }).code !== 'ER_BAD_FIELD_ERROR') throw err
    const [users] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [userId])
    if (!users[0]) throw new Error('Pengguna tidak ditemukan')
    return null
  }
}

export async function savePayday(userId: string, payday: number): Promise<void> {
  try {
    await pool.query('UPDATE users SET payday = ? WHERE id = ?', [payday, userId])
  } catch (err) {
    if ((err as { code?: string }).code !== 'ER_BAD_FIELD_ERROR') throw err
    throw Object.assign(new Error('Pengaturan periode belum siap di server. Kamu tetap bisa mencatat transaksi. Silakan hubungi pengelola aplikasi.'), { status: 503 })
  }
}

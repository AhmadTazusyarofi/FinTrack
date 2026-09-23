import { RowDataPacket } from 'mysql2/promise'
import { pool } from '../connection/db'

async function migrate() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'payday'"
    )
    if (!rows.length) {
      await pool.query('ALTER TABLE users ADD COLUMN payday TINYINT UNSIGNED NULL DEFAULT NULL')
    }
    console.log('Migrasi tanggal gajian selesai. Data transaksi tetap utuh.')
  } finally { await pool.end() }
}
migrate().catch(err => { console.error(err.message); process.exitCode = 1 })

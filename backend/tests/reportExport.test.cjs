const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { summarizeTransactions, getExportReport, toCents, decimal } = require('../src/modules/reports/reportExport.service')
const { createReportPdf, rupiah } = require('../src/modules/reports/reportExport.pdf')
const { pool } = require('../src/database/connection/db')

const row = (id, date, amount, type = 'EXPENSE', description = 'Belanja kebutuhan harian') => ({ id, date, amount, type, description, category: type === 'INCOME' ? 'Gaji' : 'Belanja', account: 'Rekening Utama' })

test('exact decimal totals, cents, negative cash flow and huge values', () => {
  const summary = summarizeTransactions([row('a', '2026-09-08', '0.10', 'INCOME'), row('b', '2026-09-09', '0.20', 'INCOME'), row('c', '2026-09-09', '1.01')])
  assert.equal(summary.income, '0.30')
  assert.equal(summary.expense, '1.01')
  assert.equal(summary.net, '-0.71')
  assert.equal(summary.categories.find(c => c.type === 'INCOME').amount, '0.30')
  assert.equal(decimal(toCents('999999999999999.99') + toCents('0.01')), '1000000000000000.00')
  assert.equal(rupiah('-1234567.05'), '-Rp 1.234.567,05')
  assert.throws(() => toCents('1.234'))
})

test('salary and calendar exports select different ranges and all rows are scoped to authenticated user', async () => {
  const original = pool.query
  const calls = []
  const data = [row('before', '2026-09-07', '99.00'), row('start', '2026-09-08', '200.00', 'INCOME'), row('last', '2026-10-07', '15.00'), row('next', '2026-10-08', '900.00')]
  let payday = 8
  pool.query = async (sql, params) => {
    calls.push({ sql, params })
    if (sql.startsWith('SELECT payday')) return [[{ payday }]]
    if (sql.includes('FROM users')) return [[{ name: 'Pengguna Uji' }]]
    assert.equal(params[0], 'owner')
    assert.match(sql, /c.user_id = t.user_id/)
    assert.match(sql, /a.user_id = t.user_id/)
    assert.doesNotMatch(sql, /LIMIT/i)
    assert.match(sql, /CAST\(t.amount AS CHAR\)/)
    return [data.filter(r => r.date >= params[1] && r.date < params[2])]
  }
  try {
    const salary = await getExportReport('owner', { mode: 'salary', month: 9, year: 2026 })
    assert.deepEqual(salary.transactions.map(r => r.id), ['start', 'last'])
    assert.equal(salary.income, '200.00'); assert.equal(salary.expense, '15.00')
    const calendar = await getExportReport('owner', { mode: 'calendar', month: 9, year: 2026 })
    assert.deepEqual(calendar.transactions.map(r => r.id), ['before', 'start'])
    payday = null
    const fallback = await getExportReport('owner', { mode: 'salary', month: 9, year: 2026 })
    assert.equal(fallback.start, calendar.start)
    payday = 31
    const short = await getExportReport('owner', { mode: 'salary', month: 2, year: 2028 })
    assert.equal(short.start, '2028-02-29'); assert.equal(short.end, '2028-03-31')
    const december = await getExportReport('owner', { mode: 'calendar', month: 12, year: 2026 })
    assert.equal(december.end, '2027-01-01')
    const { exportPdfController } = require('../src/modules/reports/reports.controller')
    const res = { status(code) { this.code = code; return this }, json(body) { this.body = body } }
    const previousCalls = calls.length
    for (const query of [{}, { mode: 'bad', month: 1, year: 2026 }, { mode: 'calendar', month: 13, year: 2026 }, { mode: 'salary', month: 1, year: 0 }]) {
      await exportPdfController({ userId: 'owner', query }, res)
      assert.equal(res.code, 422)
    }
    assert.equal(calls.length, previousCalls)
  } finally { pool.query = original }
})

function fixture(transactions, selection = { mode: 'salary', month: 9, year: 2026 }) {
  return { selection, name: 'Nadia Putri', payday: 8, start: '2026-09-08', end: '2026-10-08', generatedAt: new Date('2026-10-07T09:30:00Z'), transactions, ...summarizeTransactions(transactions) }
}

test('PDF generation handles empty data, more than 100 transactions, long notes and large amounts', async () => {
  const dir = path.resolve(__dirname, '../../tmp/pdfs')
  fs.mkdirSync(dir, { recursive: true })
  const examples = {
    empty: fixture([]),
    many: fixture(Array.from({ length: 125 }, (_, i) => row(`id-${i}`, `2026-09-${String(8 + i % 22).padStart(2, '0')}`, '1000.25', i % 4 === 0 ? 'INCOME' : 'EXPENSE', `Transaksi lengkap nomor ${i + 1}`))),
    long: fixture([row('long', '2026-09-08', '9999999999999.99', 'EXPENSE', 'Catatan sangat panjang untuk memastikan pergantian halaman tetap utuh. '.repeat(70) + ' AKHIR-CATATAN'), row('last', '2026-09-09', '0.01', 'INCOME', 'TRANSAKSI-TERAKHIR')]),
  }
  for (const [name, report] of Object.entries(examples)) {
    const pdf = await createReportPdf(report)
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
    const pages = (pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length
    assert.ok(pages >= 1)
    if (name === 'empty') assert.equal(pages, 1, 'Empty report must not create extra footer-only pages')
    if (name === 'many' || name === 'long') assert.ok(pages > 1)
    fs.writeFileSync(path.join(dir, `report-${name}.pdf`), pdf)
  }
})

test('generate a representative report for visual review', async () => {
  const transactions = [
    row('1', '2026-09-08', '7500000.00', 'INCOME', 'Gaji bulanan September'),
    { ...row('2', '2026-09-09', '1750000.00', 'EXPENSE', 'Sewa tempat tinggal dan biaya layanan bulanan'), category: 'Tempat Tinggal' },
    { ...row('3', '2026-09-11', '325000.50'), category: 'Makanan & Minuman', account: 'Dompet Digital' },
    { ...row('4', '2026-09-14', '1500000.00', 'INCOME', 'Pelunasan proyek desain kemasan'), category: 'Freelance' },
    { ...row('5', '2026-09-18', '280000.00', 'EXPENSE', 'Transportasi selama satu minggu'), category: 'Transportasi' },
    { ...row('6', '2026-09-22', '450000.00', 'EXPENSE', 'Pembayaran listrik dan internet'), category: 'Tagihan' },
    row('7', '2026-10-02', '235000.75', 'EXPENSE', 'Belanja kebutuhan dapur'),
    { ...row('8', '2026-10-07', '185000.00', 'EXPENSE', 'Makan bersama keluarga'), category: 'Makanan & Minuman', account: 'Tunai' },
  ]
  const dir = path.resolve(__dirname, '../../output/pdf')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'contoh-laporan-bukukasku.pdf'), await createReportPdf(fixture(transactions)))
})

test.after(async () => pool.end())

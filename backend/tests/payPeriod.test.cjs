const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { periodRange, activePeriod, periodBoundary } = require('../src/utils/payPeriod')

test('payday is the first day of the new period, not the last day of the old period', () => {
  assert.deepEqual(periodRange(2026, 9, 8), { start: '2026-09-08', end: '2026-10-08' })
  assert.deepEqual(activePeriod(8, new Date(2026, 9, 1)), { month: 9, year: 2026 })
  assert.deepEqual(activePeriod(8, new Date(2026, 9, 7, 23, 59)), { month: 9, year: 2026 })
  assert.deepEqual(activePeriod(8, new Date(2026, 9, 8)), { month: 10, year: 2026 })
})

test('January before payday belongs to the previous year', () => {
  assert.deepEqual(activePeriod(8, new Date(2027, 0, 7)), { month: 12, year: 2026 })
  assert.deepEqual(periodRange(2026, 12, 8), { start: '2026-12-08', end: '2027-01-08' })
})

test('short months clamp payday independently, including leap years', () => {
  assert.deepEqual(periodRange(2026, 2, 31), { start: '2026-02-28', end: '2026-03-31' })
  assert.deepEqual(periodRange(2028, 2, 30), { start: '2028-02-29', end: '2028-03-30' })
  assert.deepEqual(activePeriod(31, new Date(2026, 1, 28)), { month: 2, year: 2026 })
  assert.deepEqual(activePeriod(31, new Date(2028, 1, 28)), { month: 1, year: 2028 })
})

test('day 1 retains calendar-month behavior and invalid days are rejected', () => {
  assert.deepEqual(periodRange(2026, 9, 1), { start: '2026-09-01', end: '2026-10-01' })
  for (const day of [0, 32, 8.5, NaN]) assert.throws(() => periodBoundary(2026, 9, day))
})

test('every date belongs to exactly its active period for all 31 payday choices', () => {
  for (const year of [2026, 2028]) {
    for (let month = 1; month <= 12; month++) {
      const last = new Date(year, month, 0).getDate()
      for (let date = 1; date <= last; date++) {
        const today = new Date(year, month - 1, date)
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`
        for (let payday = 1; payday <= 31; payday++) {
          const active = activePeriod(payday, today)
          const range = periodRange(active.year, active.month, payday)
          assert.ok(range.start <= iso && iso < range.end, `${iso}, payday ${payday}`)
          assert.equal(range.end, periodRange(active.year, active.month + 1, payday).start)
        }
      }
    }
  }
})

test('frontend and backend produce identical boundaries and active periods', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/features/period/payPeriod.ts'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const context = { exports: {} }
  vm.runInNewContext(compiled, context)
  for (let day = 1; day <= 31; day++) {
    for (let month = 1; month <= 12; month++) {
      assert.equal(JSON.stringify(context.exports.periodRange(2028, month, day)), JSON.stringify(periodRange(2028, month, day)))
      const date = new Date(2028, month - 1, 7)
      assert.equal(JSON.stringify(context.exports.activePeriod(day, date)), JSON.stringify(activePeriod(day, date)))
    }
  }
})

test('transaction, report and budget queries use the same exclusive range and user scope', async () => {
  const { pool } = require('../src/database/connection/db')
  const original = pool.query
  const calls = []
  pool.query = async (sql, params) => {
    calls.push({ sql, params })
    if (sql.includes('SELECT payday')) return [[{ payday: 8 }]]
    if (sql.includes('COUNT(*)')) return [[{ total: 150, totalIncome: '1000000.00', totalExpense: '250000.00' }]]
    if (sql.includes('as total_income')) return [[{ total_income: 1000000, total_expense: 250000 }]]
    if (sql.includes('AS previous_income')) return [[{ previous_income: 800000 }]]
    return [[]]
  }
  try {
    const transactions = require('../src/modules/transactions/transactions.service')
    const reports = require('../src/modules/reports/reports.service')
    const budgets = require('../src/modules/budgets/budgets.service')
    const result = await transactions.getTransactions('user-a', { month: 9, year: 2026, page: 1, limit: 5 })
    assert.equal(result.meta.total, 150)
    assert.equal(result.meta.totalExpense, '250000.00')
    assert.equal(result.meta.totalPages, 30)
    const summary = await reports.getReportSummary('user-a', 9, 2026)
    assert.equal(summary.previousPeriodIncome, 800000)
    await budgets.getBudgets('user-a', 9, 2026)
    const txCalls = calls.filter(c => c.sql.includes('FROM transactions t'))
    assert.ok(txCalls.length >= 3)
    for (const call of txCalls) {
      assert.ok(call.params.includes('user-a'))
      assert.ok(call.params.includes('2026-09-08'))
      assert.ok(call.params.includes('2026-10-08'))
    }
    const budget = calls.find(c => c.sql.includes('FROM budgets b'))
    assert.deepEqual(budget.params, ['2026-09-08', '2026-10-08', 'user-a', 9, 2026])
    const chart = calls.find(c => c.sql.includes('GROUP BY m'))
    assert.deepEqual(chart.params, [8, 'user-a', '2026-01-08', '2027-01-08'])
    const previous = calls.find(c => c.sql.includes('AS previous_income'))
    assert.deepEqual(previous.params, ['user-a', '2026-08-08', '2026-09-08'])
    const { updatePeriodController } = require('../src/modules/periods/periods.controller')
    const res = { code: 200, status(code) { this.code = code; return this }, json(body) { this.body = body; return this } }
    for (const payday of [0, 32, 8.5, '8', null]) {
      const before = calls.length
      await updatePeriodController({ userId: 'user-a', body: { payday } }, res)
      assert.equal(res.code, 422)
      assert.equal(calls.length, before)
    }
    await updatePeriodController({ userId: 'user-a', body: { payday: 31, userId: 'user-b' } }, res)
    assert.deepEqual(calls.at(-1).params, [31, 'user-a'])
    assert.equal(res.code, 200)
    const periods = require('../src/modules/periods/periods.service')
    const missingColumn = Object.assign(new Error('Unknown column payday'), { code: 'ER_BAD_FIELD_ERROR' })
    pool.query = async (sql, params) => {
      if (sql.includes('payday')) throw missingColumn
      assert.equal(sql, 'SELECT id FROM users WHERE id = ?')
      assert.deepEqual(params, ['user-a'])
      return [[{ id: 'user-a' }]]
    }
    assert.deepEqual(await periods.getPeriodSettings('user-a'), { payday: null })
    const legacy = await periods.resolvePeriod('user-a', 9, 2026)
    assert.equal(legacy.start, '2026-09-01')
    assert.equal(legacy.end, '2026-10-01')
    await updatePeriodController({ userId: 'user-a', body: { payday: 8 } }, res)
    assert.equal(res.code, 503)
    assert.match(res.body.message, /belum siap di server/)
    pool.query = async () => { throw new Error('Database unavailable') }
    await assert.rejects(periods.getPeriodSettings('user-a'), /Database unavailable/)
    pool.query = async () => [[{ payday: null }]]
    assert.deepEqual(await periods.getPeriodSettings('user-a'), { payday: null })
  } finally { pool.query = original; await pool.end() }
})

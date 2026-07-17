# Utang Piutang Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun fitur pencatatan hutang & piutang lengkap dengan cicilan bertahap, integrasi saldo rekening, dan akses dari Dashboard.

**Architecture:** Module baru `debts` di backend mengikuti pola repository → service → controller → routes yang sudah ada. Frontend punya halaman `/debts` tersendiri, diakses via widget di Dashboard dan item di avatar dropdown.

**Tech Stack:** Node.js + Express + mysql2/promise + Zod (backend); React + TypeScript + Tailwind + lucide-react (frontend)

## Global Constraints

- Raw SQL dengan `mysql2/promise` pool — tidak ada ORM/Prisma
- ID menggunakan `uuidv4()` dari package `uuid`
- Semua query harus scoped ke `userId` dari JWT — tidak pernah dari request body
- Operasi multi-tabel menggunakan `pool.getConnection()` + `beginTransaction()`/`commit()`/`rollback()`
- Controller hanya parse req → call service → sendSuccess/sendError
- Repository hanya berisi query SQL — tidak ada business logic
- `sendSuccess` dan `sendError` dari `../../utils/response`
- Auth middleware: `authenticate` dari `../../middleware/auth.middleware`, userId via `req.userId!`
- Frontend: axios instance dari `../../services/api`, snake_case dari API → camelCase di frontend via mapper

---

## File Map

**Backend — baru:**
- `backend/src/modules/debts/debts.repository.ts` — semua raw SQL queries
- `backend/src/modules/debts/debts.service.ts` — business logic & validasi
- `backend/src/modules/debts/debts.controller.ts` — HTTP layer + Zod schemas
- `backend/src/modules/debts/debts.routes.ts` — Express router

**Backend — modifikasi:**
- `backend/src/app.ts` — mount `/api/debts`

**Frontend — baru:**
- `frontend/src/services/debtService.ts` — semua API calls + mapper
- `frontend/src/pages/debts/DebtsPage.tsx` — halaman utama

**Frontend — modifikasi:**
- `frontend/src/types/index.ts` — tambah tipe Debt, DebtPayment, DebtType, DebtStatus
- `frontend/src/App.tsx` — tambah route `/debts`
- `frontend/src/pages/dashboard/DashboardPage.tsx` — widget + avatar dropdown item

---

## Task 1: Backend — debts.repository.ts

**Files:**
- Create: `backend/src/modules/debts/debts.repository.ts`

**Interfaces:**
- Produces: `DebtType`, `DebtStatus`, `DebtRow`, `DebtPaymentRow`, `DebtData`, `DebtUpdateData`, `PaymentData`
- Produces functions: `findDebts`, `findDebtById`, `findPaymentsByDebtId`, `insertDebt`, `updateDebtRow`, `deleteDebtRow`, `insertPayment`, `deletePaymentRow`

- [ ] **Step 1: Buat file repository**

```typescript
// backend/src/modules/debts/debts.repository.ts
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { pool } from '../../database/connection/db'
import { v4 as uuidv4 } from 'uuid'

export type DebtType = 'PAYABLE' | 'RECEIVABLE'
export type DebtStatus = 'ACTIVE' | 'SETTLED'

export interface DebtRow {
  id: string
  user_id: string
  type: DebtType
  person_name: string
  amount: number
  paid_amount: number
  due_date: string | null
  note: string | null
  status: DebtStatus
  created_at: Date
  updated_at: Date
}

export interface DebtPaymentRow {
  id: string
  debt_id: string
  account_id: string
  account_name: string
  transaction_id: string | null
  amount: number
  date: string
  note: string | null
  created_at: Date
}

export interface DebtData {
  type: DebtType
  personName: string
  amount: number
  dueDate: string | null
  note: string | null
}

export interface DebtUpdateData {
  personName: string
  dueDate: string | null
  note: string | null
}

export interface PaymentData {
  accountId: string
  amount: number
  date: string
  note: string | null
}

async function getOrCreateDebtCategory(conn: Awaited<ReturnType<typeof pool.getConnection>>, userId: string, debtType: DebtType): Promise<string> {
  const name = debtType === 'PAYABLE' ? 'Hutang' : 'Piutang'
  const txType = debtType === 'PAYABLE' ? 'EXPENSE' : 'INCOME'
  const newId = uuidv4()
  await conn.query<ResultSetHeader>(
    'INSERT IGNORE INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)',
    [newId, userId, name, txType]
  )
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ?',
    [userId, name, txType]
  )
  return (rows[0] as { id: string }).id
}

function castDebt(r: RowDataPacket): DebtRow {
  return { ...r, amount: Number(r.amount), paid_amount: Number(r.paid_amount) } as DebtRow
}

function castPayment(r: RowDataPacket): DebtPaymentRow {
  return { ...r, amount: Number(r.amount) } as DebtPaymentRow
}

export async function findDebts(userId: string, type?: DebtType, status?: DebtStatus): Promise<DebtRow[]> {
  const conds: string[] = ['user_id = ?']
  const params: unknown[] = [userId]
  if (type)   { conds.push('type = ?');   params.push(type) }
  if (status) { conds.push('status = ?'); params.push(status) }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM debts WHERE ${conds.join(' AND ')} ORDER BY created_at DESC`, params
  )
  return (rows as RowDataPacket[]).map(castDebt)
}

export async function findDebtById(id: string, userId: string): Promise<DebtRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM debts WHERE id = ? AND user_id = ?', [id, userId]
  )
  return rows[0] ? castDebt(rows[0]) : null
}

export async function findPaymentsByDebtId(debtId: string): Promise<DebtPaymentRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT dp.*, a.name as account_name
     FROM debt_payments dp
     LEFT JOIN accounts a ON dp.account_id = a.id
     WHERE dp.debt_id = ?
     ORDER BY dp.date DESC, dp.created_at DESC`,
    [debtId]
  )
  return (rows as RowDataPacket[]).map(castPayment)
}

export async function insertDebt(userId: string, data: DebtData): Promise<DebtRow> {
  const id = uuidv4()
  await pool.query<ResultSetHeader>(
    'INSERT INTO debts (id, user_id, type, person_name, amount, due_date, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, userId, data.type, data.personName, data.amount, data.dueDate ?? null, data.note ?? null]
  )
  return findDebtById(id, userId) as Promise<DebtRow>
}

export async function updateDebtRow(id: string, userId: string, data: DebtUpdateData): Promise<DebtRow> {
  await pool.query<ResultSetHeader>(
    'UPDATE debts SET person_name = ?, due_date = ?, note = ? WHERE id = ? AND user_id = ?',
    [data.personName, data.dueDate ?? null, data.note ?? null, id, userId]
  )
  return findDebtById(id, userId) as Promise<DebtRow>
}

export async function insertPayment(userId: string, debt: DebtRow, data: PaymentData): Promise<DebtPaymentRow> {
  const paymentId = uuidv4()
  const txId = uuidv4()
  const txType = debt.type === 'PAYABLE' ? 'EXPENSE' : 'INCOME'
  const balanceDelta = debt.type === 'PAYABLE' ? -data.amount : data.amount
  const newPaidAmount = debt.paid_amount + data.amount
  const newStatus: DebtStatus = newPaidAmount >= debt.amount ? 'SETTLED' : 'ACTIVE'
  const autoNote = data.note ?? `Cicilan ${debt.type === 'PAYABLE' ? 'hutang' : 'piutang'} - ${debt.person_name}`

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const categoryId = await getOrCreateDebtCategory(conn, userId, debt.type)
    await conn.query<ResultSetHeader>(
      'INSERT INTO transactions (id, user_id, type, amount, note, date, category_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [txId, userId, txType, data.amount, autoNote, data.date, categoryId, data.accountId]
    )
    await conn.query<ResultSetHeader>(
      'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
      [balanceDelta, data.accountId, userId]
    )
    await conn.query<ResultSetHeader>(
      'INSERT INTO debt_payments (id, debt_id, account_id, transaction_id, amount, date, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [paymentId, debt.id, data.accountId, txId, data.amount, data.date, data.note ?? null]
    )
    await conn.query<ResultSetHeader>(
      'UPDATE debts SET paid_amount = ?, status = ? WHERE id = ?',
      [newPaidAmount, newStatus, debt.id]
    )
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT dp.*, a.name as account_name FROM debt_payments dp LEFT JOIN accounts a ON dp.account_id = a.id WHERE dp.id = ?`,
    [paymentId]
  )
  return castPayment(rows[0])
}

export async function deletePaymentRow(userId: string, debt: DebtRow, paymentId: string): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM debt_payments WHERE id = ? AND debt_id = ?', [paymentId, debt.id]
  )
  if (!rows[0]) throw new Error('Cicilan tidak ditemukan')
  const p = castPayment(rows[0])
  const balanceDelta = debt.type === 'PAYABLE' ? p.amount : -p.amount
  const newPaidAmount = Math.max(0, debt.paid_amount - p.amount)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query<ResultSetHeader>('DELETE FROM debt_payments WHERE id = ?', [paymentId])
    if (p.transaction_id) {
      await conn.query<ResultSetHeader>('DELETE FROM transactions WHERE id = ? AND user_id = ?', [p.transaction_id, userId])
    }
    await conn.query<ResultSetHeader>(
      'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
      [balanceDelta, p.account_id, userId]
    )
    await conn.query<ResultSetHeader>(
      'UPDATE debts SET paid_amount = ?, status = ? WHERE id = ?',
      [newPaidAmount, 'ACTIVE', debt.id]
    )
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export async function deleteDebtRow(id: string, userId: string): Promise<void> {
  const debt = await findDebtById(id, userId)
  if (!debt) throw new Error('Hutang tidak ditemukan')
  const payments = await findPaymentsByDebtId(id)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    for (const p of payments) {
      const balanceDelta = debt.type === 'PAYABLE' ? p.amount : -p.amount
      if (p.transaction_id) {
        await conn.query<ResultSetHeader>('DELETE FROM transactions WHERE id = ? AND user_id = ?', [p.transaction_id, userId])
      }
      await conn.query<ResultSetHeader>(
        'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
        [balanceDelta, p.account_id, userId]
      )
    }
    await conn.query<ResultSetHeader>('DELETE FROM debts WHERE id = ? AND user_id = ?', [id, userId])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
```

- [ ] **Step 2: Restart backend dan pastikan tidak ada TS error**

```bash
cd backend && npx tsc --noEmit
```
Expected: tidak ada error di debts.repository.ts

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/debts/debts.repository.ts
git commit -m "feat: add debts repository with raw SQL queries"
```

---

## Task 2: Backend — Service + Controller + Routes + app.ts

**Files:**
- Create: `backend/src/modules/debts/debts.service.ts`
- Create: `backend/src/modules/debts/debts.controller.ts`
- Create: `backend/src/modules/debts/debts.routes.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: semua exports dari `debts.repository.ts`
- Produces: REST endpoints `GET/POST/PATCH/DELETE /api/debts`, `POST/DELETE /api/debts/:id/payments/:pid`

- [ ] **Step 1: Buat debts.service.ts**

```typescript
// backend/src/modules/debts/debts.service.ts
import {
  DebtRow, DebtPaymentRow, DebtData, DebtUpdateData, PaymentData, DebtType, DebtStatus,
  findDebts, findDebtById, findPaymentsByDebtId,
  insertDebt, updateDebtRow, deleteDebtRow, insertPayment, deletePaymentRow,
} from './debts.repository'

export async function getDebts(userId: string, type?: DebtType, status?: DebtStatus): Promise<DebtRow[]> {
  return findDebts(userId, type, status)
}

export async function getDebtWithPayments(id: string, userId: string) {
  const debt = await findDebtById(id, userId)
  if (!debt) throw new Error('Hutang tidak ditemukan')
  const payments = await findPaymentsByDebtId(id)
  return { ...debt, payments }
}

export async function createDebt(userId: string, data: DebtData): Promise<DebtRow> {
  return insertDebt(userId, data)
}

export async function editDebt(id: string, userId: string, data: DebtUpdateData): Promise<DebtRow> {
  const existing = await findDebtById(id, userId)
  if (!existing) throw new Error('Hutang tidak ditemukan')
  return updateDebtRow(id, userId, data)
}

export async function removeDebt(id: string, userId: string): Promise<void> {
  const existing = await findDebtById(id, userId)
  if (!existing) throw new Error('Hutang tidak ditemukan')
  return deleteDebtRow(id, userId)
}

export async function addPayment(debtId: string, userId: string, data: PaymentData): Promise<DebtPaymentRow> {
  const debt = await findDebtById(debtId, userId)
  if (!debt) throw new Error('Hutang tidak ditemukan')
  if (debt.status === 'SETTLED') throw new Error('Hutang sudah lunas')
  const remaining = debt.amount - debt.paid_amount
  if (data.amount > remaining + 0.001) throw new Error(`Jumlah melebihi sisa hutang (${remaining})`)
  return insertPayment(userId, debt, data)
}

export async function removePayment(debtId: string, paymentId: string, userId: string): Promise<void> {
  const debt = await findDebtById(debtId, userId)
  if (!debt) throw new Error('Hutang tidak ditemukan')
  return deletePaymentRow(userId, debt, paymentId)
}
```

- [ ] **Step 2: Buat debts.controller.ts**

```typescript
// backend/src/modules/debts/debts.controller.ts
import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth.middleware'
import { sendSuccess, sendError } from '../../utils/response'
import { getDebts, getDebtWithPayments, createDebt, editDebt, removeDebt, addPayment, removePayment } from './debts.service'
import { DebtType, DebtStatus } from './debts.repository'

const debtSchema = z.object({
  type:       z.enum(['PAYABLE', 'RECEIVABLE']),
  personName: z.string().min(1, 'Nama wajib diisi'),
  amount:     z.number().positive('Jumlah harus lebih dari 0'),
  dueDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  note:       z.string().nullish(),
})

const editDebtSchema = z.object({
  personName: z.string().min(1, 'Nama wajib diisi'),
  dueDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  note:       z.string().nullish(),
})

const paymentSchema = z.object({
  accountId: z.string().uuid('Account tidak valid'),
  amount:    z.number().positive('Jumlah harus lebih dari 0'),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  note:      z.string().nullish(),
})

export async function getDebtsController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const type   = req.query.type   as DebtType   | undefined
    const status = req.query.status as DebtStatus | undefined
    const data = await getDebts(req.userId!, type, status)
    sendSuccess(res, data)
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 500)
  }
}

export async function getDebtByIdController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await getDebtWithPayments(req.params.id, req.userId!)
    sendSuccess(res, data)
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function createDebtController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = debtSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const debt = await createDebt(req.userId!, {
      type: parsed.data.type,
      personName: parsed.data.personName,
      amount: parsed.data.amount,
      dueDate: parsed.data.dueDate ?? null,
      note: parsed.data.note ?? null,
    })
    sendSuccess(res, debt, 'Berhasil ditambahkan', 201)
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function updateDebtController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = editDebtSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const debt = await editDebt(req.params.id, req.userId!, {
      personName: parsed.data.personName,
      dueDate: parsed.data.dueDate ?? null,
      note: parsed.data.note ?? null,
    })
    sendSuccess(res, debt, 'Berhasil diupdate')
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function deleteDebtController(req: AuthRequest, res: Response): Promise<void> {
  try {
    await removeDebt(req.params.id, req.userId!)
    sendSuccess(res, null, 'Berhasil dihapus')
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function createPaymentController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = paymentSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const payment = await addPayment(req.params.id, req.userId!, {
      accountId: parsed.data.accountId,
      amount: parsed.data.amount,
      date: parsed.data.date,
      note: parsed.data.note ?? null,
    })
    sendSuccess(res, payment, 'Cicilan berhasil ditambahkan', 201)
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function deletePaymentController(req: AuthRequest, res: Response): Promise<void> {
  try {
    await removePayment(req.params.id, req.params.pid, req.userId!)
    sendSuccess(res, null, 'Cicilan berhasil dihapus')
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}
```

- [ ] **Step 3: Buat debts.routes.ts**

```typescript
// backend/src/modules/debts/debts.routes.ts
import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import {
  getDebtsController, getDebtByIdController,
  createDebtController, updateDebtController, deleteDebtController,
  createPaymentController, deletePaymentController,
} from './debts.controller'

const router = Router()
router.get('/',                     authenticate, getDebtsController)
router.post('/',                    authenticate, createDebtController)
router.get('/:id',                  authenticate, getDebtByIdController)
router.patch('/:id',                authenticate, updateDebtController)
router.delete('/:id',               authenticate, deleteDebtController)
router.post('/:id/payments',        authenticate, createPaymentController)
router.delete('/:id/payments/:pid', authenticate, deletePaymentController)
export default router
```

- [ ] **Step 4: Mount router di app.ts**

Tambahkan dua baris ini di `backend/src/app.ts`:

```typescript
// Setelah baris: import reportRouter from './modules/reports/reports.routes'
import debtRouter from './modules/debts/debts.routes'

// Setelah baris: app.use('/api/reports', reportRouter)
app.use('/api/debts', debtRouter)
```

- [ ] **Step 5: Type check**

```bash
cd backend && npx tsc --noEmit
```
Expected: tidak ada error baru

- [ ] **Step 6: Test endpoint manual**

Pastikan backend berjalan, lalu test:
```
GET  http://localhost:5000/api/debts          → 401 (belum auth)
POST http://localhost:5000/api/debts          → 401 (belum auth)
```
Kedua endpoint return 401 artinya router sudah terpasang dan middleware berjalan.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/debts/ backend/src/app.ts
git commit -m "feat: add debts module (service, controller, routes) and mount to app"
```

---

## Task 3: Frontend — Types + debtService.ts

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/debtService.ts`

**Interfaces:**
- Produces: `Debt`, `DebtPayment`, `DebtType`, `DebtStatus` types
- Produces functions: `getDebts`, `getDebtById`, `createDebt`, `updateDebt`, `deleteDebt`, `createPayment`, `deletePayment`

- [ ] **Step 1: Tambah tipe ke types/index.ts**

Tambahkan di bawah `export interface ReportSummary { ... }` (akhir file):

```typescript
export type DebtType = 'PAYABLE' | 'RECEIVABLE'
export type DebtStatus = 'ACTIVE' | 'SETTLED'

export interface DebtPayment {
  id: string
  debtId: string
  accountId: string
  accountName: string
  transactionId: string | null
  amount: number
  date: string
  note: string | null
  createdAt: string
}

export interface Debt {
  id: string
  userId: string
  type: DebtType
  personName: string
  amount: number
  paidAmount: number
  dueDate: string | null
  note: string | null
  status: DebtStatus
  createdAt: string
  updatedAt: string
  payments?: DebtPayment[]
}
```

- [ ] **Step 2: Buat debtService.ts**

```typescript
// frontend/src/services/debtService.ts
import api from './api'
import { ApiResponse, Debt, DebtPayment, DebtType, DebtStatus } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPayment(r: any): DebtPayment {
  return {
    id: r.id,
    debtId:        r.debt_id        ?? r.debtId        ?? '',
    accountId:     r.account_id     ?? r.accountId     ?? '',
    accountName:   r.account_name   ?? r.accountName   ?? '',
    transactionId: r.transaction_id ?? r.transactionId ?? null,
    amount:    Number(r.amount),
    date:      (r.date as string).split('T')[0],
    note:      r.note ?? null,
    createdAt: r.created_at ?? r.createdAt ?? '',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDebt(r: any): Debt {
  return {
    id:         r.id,
    userId:     r.user_id     ?? r.userId ?? '',
    type:       r.type,
    personName: r.person_name ?? r.personName,
    amount:     Number(r.amount),
    paidAmount: Number(r.paid_amount ?? r.paidAmount ?? 0),
    dueDate:    r.due_date    ?? r.dueDate ?? null,
    note:       r.note ?? null,
    status:     r.status,
    createdAt:  r.created_at  ?? r.createdAt ?? '',
    updatedAt:  r.updated_at  ?? r.updatedAt ?? '',
    payments:   Array.isArray(r.payments) ? r.payments.map(mapPayment) : undefined,
  }
}

export async function getDebts(type?: DebtType, status?: DebtStatus): Promise<Debt[]> {
  const params = new URLSearchParams()
  if (type)   params.set('type',   type)
  if (status) params.set('status', status)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<ApiResponse<any[]>>(`/debts?${params}`)
  return res.data.data.map(mapDebt)
}

export async function getDebtById(id: string): Promise<Debt> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<ApiResponse<any>>(`/debts/${id}`)
  return mapDebt(res.data.data)
}

export interface DebtPayload {
  type: DebtType
  personName: string
  amount: number
  dueDate: string | null
  note: string | null
}

export async function createDebt(data: DebtPayload): Promise<Debt> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<ApiResponse<any>>('/debts', data)
  return mapDebt(res.data.data)
}

export interface DebtEditPayload {
  personName: string
  dueDate: string | null
  note: string | null
}

export async function updateDebt(id: string, data: DebtEditPayload): Promise<Debt> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.patch<ApiResponse<any>>(`/debts/${id}`, data)
  return mapDebt(res.data.data)
}

export async function deleteDebt(id: string): Promise<void> {
  await api.delete(`/debts/${id}`)
}

export interface PaymentPayload {
  accountId: string
  amount: number
  date: string
  note: string | null
}

export async function createPayment(debtId: string, data: PaymentPayload): Promise<DebtPayment> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<ApiResponse<any>>(`/debts/${debtId}/payments`, data)
  return mapPayment(res.data.data)
}

export async function deletePayment(debtId: string, paymentId: string): Promise<void> {
  await api.delete(`/debts/${debtId}/payments/${paymentId}`)
}
```

- [ ] **Step 3: Type check frontend**

```bash
cd frontend && npx tsc --noEmit
```
Expected: tidak ada error baru dari file yang diubah

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/debtService.ts
git commit -m "feat: add Debt/DebtPayment types and debtService API client"
```

---

## Task 4: Frontend — DebtsPage.tsx

**Files:**
- Create: `frontend/src/pages/debts/DebtsPage.tsx`

**Interfaces:**
- Consumes: `getDebts`, `getDebtById`, `createDebt`, `updateDebt`, `deleteDebt`, `createPayment`, `deletePayment` dari `debtService.ts`
- Consumes: `getAccounts` dari `accountService.ts`
- Consumes: `Debt`, `DebtPayment`, `Account` dari `types/index.ts`
- Consumes: `MobilePageHeader` dari `../../components/MobilePageHeader`
- Consumes: `Skeleton` dari `../../components/Skeleton`

- [ ] **Step 1: Buat file DebtsPage.tsx**

```tsx
// frontend/src/pages/debts/DebtsPage.tsx
import { useState, useEffect, useMemo } from 'react'
import {
  Plus, MoreHorizontal, Pencil, Trash2, X,
  ChevronRight, HandCoins, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react'
import { MobilePageHeader } from '../../components/MobilePageHeader'
import { Skeleton } from '../../components/Skeleton'
import {
  getDebts, getDebtById, createDebt, updateDebt, deleteDebt,
  createPayment, deletePayment,
} from '../../services/debtService'
import { getAccounts } from '../../services/accountService'
import { Debt, Account } from '../../types'

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

function getDueDateColor(dueDate: string | null): string {
  if (!dueDate) return 'text-slate-400 dark:text-slate-500'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return 'text-red-500'
  if (diff <= 3) return 'text-amber-500'
  return 'text-emerald-600 dark:text-emerald-400'
}

function getDueDateLabel(dueDate: string | null): string {
  if (!dueDate) return 'Tanpa jatuh tempo'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0)   return `Terlambat ${Math.abs(diff)} hari`
  if (diff === 0) return 'Jatuh tempo hari ini'
  if (diff <= 3)  return `${diff} hari lagi`
  return due.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const todayStr = () => new Date().toISOString().split('T')[0]

const EMPTY_ADD = { type: 'PAYABLE' as 'PAYABLE' | 'RECEIVABLE', personName: '', amount: '', dueDate: '', note: '' }
const EMPTY_PAY = { accountId: '', amount: '', date: todayStr(), note: '' }

export function DebtsPage() {
  const [tab, setTab]         = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE')
  const [debts, setDebts]     = useState<Debt[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const [showAdd, setShowAdd]       = useState(false)
  const [editDebt, setEditDebt]     = useState<Debt | null>(null)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [payDebt, setPayDebt]       = useState<Debt | null>(null)
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [addForm, setAddForm]   = useState(EMPTY_ADD)
  const [editForm, setEditForm] = useState({ personName: '', dueDate: '', note: '' })
  const [payForm, setPayForm]   = useState(EMPTY_PAY)
  const [isSaving, setIsSaving]   = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([getDebts(), getAccounts()])
      .then(([d, a]) => { setDebts(d); setAccounts(a) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey])

  const refresh = () => setRefreshKey(k => k + 1)

  const filtered = useMemo(() => debts.filter(d => d.type === tab), [debts, tab])
  const totalPayable    = useMemo(() => debts.filter(d => d.type === 'PAYABLE'    && d.status === 'ACTIVE').reduce((s, d) => s + (d.amount - d.paidAmount), 0), [debts])
  const totalReceivable = useMemo(() => debts.filter(d => d.type === 'RECEIVABLE' && d.status === 'ACTIVE').reduce((s, d) => s + (d.amount - d.paidAmount), 0), [debts])

  async function handleAdd() {
    if (!addForm.personName.trim() || !addForm.amount) return
    setIsSaving(true)
    try {
      await createDebt({
        type: addForm.type,
        personName: addForm.personName.trim(),
        amount: Number(addForm.amount.replace(/[^\d]/g, '')),
        dueDate: addForm.dueDate || null,
        note: addForm.note || null,
      })
      setShowAdd(false); setAddForm(EMPTY_ADD); refresh()
    } catch { /* noop */ } finally { setIsSaving(false) }
  }

  async function handleEdit() {
    if (!editDebt || !editForm.personName.trim()) return
    setIsSaving(true)
    try {
      await updateDebt(editDebt.id, { personName: editForm.personName.trim(), dueDate: editForm.dueDate || null, note: editForm.note || null })
      setEditDebt(null); refresh()
    } catch { /* noop */ } finally { setIsSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await deleteDebt(deleteId); setDeleteId(null); refresh()
    } catch { /* noop */ } finally { setIsDeleting(false) }
  }

  async function handlePay() {
    if (!payDebt || !payForm.accountId || !payForm.amount) return
    setIsSaving(true)
    try {
      await createPayment(payDebt.id, {
        accountId: payForm.accountId,
        amount: Number(payForm.amount.replace(/[^\d]/g, '')),
        date: payForm.date,
        note: payForm.note || null,
      })
      setPayDebt(null); setPayForm(EMPTY_PAY); refresh()
      if (detailDebt?.id === payDebt.id) {
        const updated = await getDebtById(payDebt.id)
        setDetailDebt(updated)
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg ?? 'Gagal menyimpan cicilan')
    } finally { setIsSaving(false) }
  }

  async function handleDeletePayment(debtId: string, paymentId: string) {
    try {
      await deletePayment(debtId, paymentId); refresh()
      if (detailDebt?.id === debtId) {
        const updated = await getDebtById(debtId); setDetailDebt(updated)
      }
    } catch { /* noop */ }
  }

  async function openDetail(debt: Debt) {
    setDetailDebt(debt); setDetailLoading(true)
    try { const full = await getDebtById(debt.id); setDetailDebt(full) }
    catch { /* noop */ } finally { setDetailLoading(false) }
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-semibold text-[#001e1d] dark:text-white outline-none focus:border-[#004643] transition-colors'
  const labelCls = 'text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5'

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1117] pb-32">
      <MobilePageHeader title="Hutang & Piutang" />

      <div className="px-5 pt-5 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4 text-red-500" strokeWidth={2.5} />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Hutang Aktif</span>
            </div>
            <p className="text-sm font-extrabold text-[#001e1d] dark:text-white">
              {loading ? '—' : formatCurrency(totalPayable)}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-4 h-4 text-amber-500" strokeWidth={2.5} />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Piutang Aktif</span>
            </div>
            <p className="text-sm font-extrabold text-[#001e1d] dark:text-white">
              {loading ? '—' : formatCurrency(totalReceivable)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 dark:bg-white/5 rounded-2xl p-1">
          {(['PAYABLE', 'RECEIVABLE'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                tab === t
                  ? 'bg-white dark:bg-[#1a1f2e] text-[#004643] dark:text-white shadow-sm'
                  : 'text-slate-400 dark:text-slate-500'
              }`}>
              {t === 'PAYABLE' ? 'Hutang Saya' : 'Piutang Saya'}
            </button>
          ))}
        </div>

        {/* Add button */}
        <button
          onClick={() => { setAddForm({ ...EMPTY_ADD, type: tab }); setShowAdd(true) }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#004643] text-white text-sm font-bold active:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {tab === 'PAYABLE' ? 'Catat Hutang Baru' : 'Catat Piutang Baru'}
        </button>

        {/* Skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <HandCoins className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
              {tab === 'PAYABLE' ? 'Belum ada hutang tercatat' : 'Belum ada piutang tercatat'}
            </p>
          </div>
        )}

        {/* Debt cards */}
        {!loading && filtered.map(debt => {
          const remaining = debt.amount - debt.paidAmount
          const pct = debt.amount > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.amount) * 100)) : 0
          return (
            <div key={debt.id} className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-100 dark:border-white/5 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-[#001e1d] dark:text-white truncate">{debt.personName}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      debt.status === 'SETTLED'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                        : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                    }`}>
                      {debt.status === 'SETTLED' ? 'Lunas' : 'Aktif'}
                    </span>
                  </div>
                  <p className={`text-[11px] font-semibold mt-0.5 ${getDueDateColor(debt.dueDate)}`}>
                    {getDueDateLabel(debt.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {debt.status === 'ACTIVE' && (
                    <button
                      onClick={() => { setPayDebt(debt); setPayForm({ ...EMPTY_PAY, accountId: accounts[0]?.id ?? '' }) }}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-xl ${
                        debt.type === 'PAYABLE'
                          ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      }`}
                    >
                      {debt.type === 'PAYABLE' ? 'Bayar' : 'Terima'}
                    </button>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === debt.id ? null : debt.id)}
                      className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {activeMenu === debt.id && (
                      <div className="absolute right-0 top-8 z-10 bg-white dark:bg-[#1a1f2e] rounded-xl shadow-lg border border-slate-100 dark:border-white/5 py-1 w-36 text-xs font-semibold">
                        <button
                          onClick={() => { openDetail(debt); setActiveMenu(null) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-[#001e1d] dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" /> Riwayat
                        </button>
                        <button
                          onClick={() => { setEditDebt(debt); setEditForm({ personName: debt.personName, dueDate: debt.dueDate ?? '', note: debt.note ?? '' }); setActiveMenu(null) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-[#001e1d] dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => { setDeleteId(debt.id); setActiveMenu(null) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-400 dark:text-slate-500">Terbayar {formatCurrency(debt.paidAmount)}</span>
                  <span className={debt.type === 'PAYABLE' ? 'text-red-500' : 'text-amber-500'}>
                    Sisa {formatCurrency(remaining)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${debt.type === 'PAYABLE' ? 'bg-red-400' : 'bg-amber-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium text-right">
                  {pct}% dari {formatCurrency(debt.amount)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Overlay close active menu ── */}
      {activeMenu && <div className="fixed inset-0 z-[5]" onClick={() => setActiveMenu(null)} />}

      {/* ── Add Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center px-4 pb-4">
          <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setShowAdd(false)} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-base font-bold text-[#001e1d] dark:text-white">
                {addForm.type === 'PAYABLE' ? 'Catat Hutang' : 'Catat Piutang'}
              </h3>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex bg-slate-100 dark:bg-white/5 rounded-xl p-1">
                {(['PAYABLE', 'RECEIVABLE'] as const).map(t => (
                  <button key={t} onClick={() => setAddForm(f => ({ ...f, type: t }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      addForm.type === t ? 'bg-white dark:bg-[#0f1117] text-[#004643] dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                    {t === 'PAYABLE' ? 'Hutang Saya' : 'Piutang Saya'}
                  </button>
                ))}
              </div>
              <div>
                <label className={labelCls}>Nama</label>
                <input type="text" className={inputCls}
                  placeholder={addForm.type === 'PAYABLE' ? 'Nama pemberi hutang' : 'Nama peminjam'}
                  value={addForm.personName}
                  onChange={e => setAddForm(f => ({ ...f, personName: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Jumlah</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                  <input type="text" inputMode="numeric" className={`${inputCls} pl-10`} placeholder="0"
                    value={addForm.amount ? new Intl.NumberFormat('id-ID').format(Number(addForm.amount)) : ''}
                    onChange={e => setAddForm(f => ({ ...f, amount: e.target.value.replace(/[^\d]/g, '') }))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Jatuh Tempo <span className="font-normal opacity-60">(opsional)</span></label>
                <input type="date" className={inputCls} value={addForm.dueDate}
                  onChange={e => setAddForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Catatan <span className="font-normal opacity-60">(opsional)</span></label>
                <input type="text" className={inputCls} value={addForm.note}
                  onChange={e => setAddForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-500">
                  Batal
                </button>
                <button onClick={handleAdd} disabled={isSaving || !addForm.personName.trim() || !addForm.amount}
                  className="flex-1 py-3 rounded-xl bg-[#004643] text-white text-sm font-bold disabled:opacity-50 transition-opacity">
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pay/Receive Modal ── */}
      {payDebt && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center px-4 pb-4">
          <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setPayDebt(null)} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-base font-bold text-[#001e1d] dark:text-white">
                  {payDebt.type === 'PAYABLE' ? 'Bayar Cicilan' : 'Terima Cicilan'}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Sisa {formatCurrency(payDebt.amount - payDebt.paidAmount)}
                </p>
              </div>
              <button onClick={() => setPayDebt(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Jumlah</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                  <input type="text" inputMode="numeric" className={`${inputCls} pl-10`} placeholder="0"
                    value={payForm.amount ? new Intl.NumberFormat('id-ID').format(Number(payForm.amount)) : ''}
                    onChange={e => setPayForm(f => ({ ...f, amount: e.target.value.replace(/[^\d]/g, '') }))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Rekening</label>
                <select className={inputCls} value={payForm.accountId}
                  onChange={e => setPayForm(f => ({ ...f, accountId: e.target.value }))}>
                  <option value="">Pilih rekening</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tanggal</label>
                <input type="date" className={inputCls} value={payForm.date}
                  onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Catatan <span className="font-normal opacity-60">(opsional)</span></label>
                <input type="text" className={inputCls} value={payForm.note}
                  onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setPayDebt(null)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-500">
                  Batal
                </button>
                <button onClick={handlePay} disabled={isSaving || !payForm.accountId || !payForm.amount}
                  className="flex-1 py-3 rounded-xl bg-[#004643] text-white text-sm font-bold disabled:opacity-50">
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editDebt && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center px-4 pb-4">
          <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setEditDebt(null)} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-base font-bold text-[#001e1d] dark:text-white">Edit</h3>
              <button onClick={() => setEditDebt(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Nama</label>
                <input type="text" className={inputCls} value={editForm.personName}
                  onChange={e => setEditForm(f => ({ ...f, personName: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Jatuh Tempo</label>
                <input type="date" className={inputCls} value={editForm.dueDate}
                  onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Catatan</label>
                <input type="text" className={inputCls} value={editForm.note}
                  onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditDebt(null)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-500">
                  Batal
                </button>
                <button onClick={handleEdit} disabled={isSaving || !editForm.personName.trim()}
                  className="flex-1 py-3 rounded-xl bg-[#004643] text-white text-sm font-bold disabled:opacity-50">
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center px-4 pb-4">
          <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setDeleteId(null)} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-[#001e1d] dark:text-white mb-2">Hapus Catatan?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Semua riwayat cicilan dan transaksi terkait akan ikut dihapus. Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-500">
                Batal
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50">
                {isDeleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail / History Modal ── */}
      {detailDebt && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center px-4 pb-4">
          <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setDetailDebt(null)} />
          <div className="relative bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: 'calc(100vh - 80px)' }}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5 shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#001e1d] dark:text-white">{detailDebt.personName}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Riwayat Cicilan</p>
              </div>
              <button onClick={() => setDetailDebt(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {detailLoading && <Skeleton className="h-20 w-full rounded-xl" />}
              {!detailLoading && (!detailDebt.payments || detailDebt.payments.length === 0) && (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">Belum ada cicilan</p>
              )}
              {!detailLoading && detailDebt.payments?.map(p => (
                <div key={p.id} className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-white/5 last:border-0">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-bold text-[#001e1d] dark:text-white">{formatCurrency(p.amount)}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {p.accountName} · {new Date(p.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {p.note && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{p.note}</p>}
                  </div>
                  <button onClick={() => handleDeletePayment(detailDebt.id, p.id)}
                    className="p-1.5 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DebtsPage
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: tidak ada error di DebtsPage.tsx

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/debts/DebtsPage.tsx
git commit -m "feat: add DebtsPage with tabs, cards, cicilan modals"
```

---

## Task 5: Frontend — Route + Dashboard Widget + Avatar Dropdown

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`

**Interfaces:**
- Consumes: `DebtsPage` dari `./pages/debts/DebtsPage`
- Consumes: `getDebts` dari `./services/debtService`
- Consumes: `Debt` dari `./types`

- [ ] **Step 1: Tambah route /debts di App.tsx**

Di `frontend/src/App.tsx`, tambahkan import:
```typescript
import { DebtsPage } from './pages/debts/DebtsPage'
```

Tambahkan route di dalam `<Route element={<DashboardLayout />}>`:
```tsx
<Route path="/debts" element={<DebtsPage />} />
```

- [ ] **Step 2: Update DashboardPage.tsx — import tambahan**

Di bagian import DashboardPage.tsx, tambahkan:
```typescript
// tambahkan HandCoins ke import lucide-react yang sudah ada
import {
  ArrowUpRight, ArrowDownLeft, ArrowRight,
  Sun, Moon, LogOut, UserCircle, HandCoins,
} from 'lucide-react'

// tambahkan import getDebts dan Debt
import { getDebts } from '../../services/debtService'
import { Debt } from '../../types'
```

- [ ] **Step 3: Tambah state debts di DashboardPage**

Tambahkan state baru setelah `const [avatarOpen, setAvatarOpen] = useState(false)`:
```typescript
const [debtSummary, setDebtSummary] = useState<{ totalPayable: number; totalReceivable: number } | null>(null)
```

Di dalam `useEffect`, tambahkan `getDebts()` ke `Promise.all`:
```typescript
useEffect(() => {
  setLoading(true)
  Promise.all([
    getReportSummary(month, year),
    getBudgets(month, year),
    getAccounts(),
    getDebts(),
  ]).then(([rep, budgetList, accounts, debts]) => {
    setReport(rep)
    setBudgets(budgetList)
    setTotalBalance(accounts.reduce((s, a) => s + a.balance, 0))
    const activeDebts = (debts as Debt[]).filter(d => d.status === 'ACTIVE')
    setDebtSummary({
      totalPayable:    activeDebts.filter(d => d.type === 'PAYABLE').reduce((s, d) => s + (d.amount - d.paidAmount), 0),
      totalReceivable: activeDebts.filter(d => d.type === 'RECEIVABLE').reduce((s, d) => s + (d.amount - d.paidAmount), 0),
    })
  }).catch(() => {}).finally(() => setLoading(false))
}, [month, year])
```

- [ ] **Step 4: Tambah item "Hutang & Piutang" di avatar dropdown DashboardPage**

Cari blok dropdown avatar di DashboardPage (setelah `<UserCircle ... /> Profil Saya`), tambahkan button baru di antara "Profil Saya" dan "Keluar":

```tsx
<button
  onClick={() => { setAvatarOpen(false); navigate('/debts') }}
  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-[#001e1d] dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
>
  <HandCoins className="w-4 h-4 text-slate-400" />
  Hutang & Piutang
</button>
```

- [ ] **Step 5: Tambah widget Hutang & Piutang di Dashboard**

Tambahkan section baru di JSX DashboardPage, setelah section `{/* ── Ringkasan ── */}` dan sebelum `{/* ── Budget progress ── */}`:

```tsx
{/* ── Hutang & Piutang Widget ── */}
{!loading && debtSummary && (debtSummary.totalPayable > 0 || debtSummary.totalReceivable > 0) && (
  <div className="px-5 mb-6">
    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-[#004643]" />
          <p className="text-xs font-bold text-[#001e1d] dark:text-white">Hutang & Piutang</p>
        </div>
        <button
          onClick={() => navigate('/debts')}
          className="text-[10px] font-bold text-[#004643] flex items-center gap-0.5"
        >
          Lihat Semua <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {debtSummary.totalPayable > 0 && (
          <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-3">
            <p className="text-[10px] text-slate-400 font-semibold mb-1">Hutang Aktif</p>
            <p className="text-xs font-extrabold text-red-500">{formatCurrency(debtSummary.totalPayable)}</p>
          </div>
        )}
        {debtSummary.totalReceivable > 0 && (
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3">
            <p className="text-[10px] text-slate-400 font-semibold mb-1">Piutang Aktif</p>
            <p className="text-xs font-extrabold text-amber-500">{formatCurrency(debtSummary.totalReceivable)}</p>
          </div>
        )}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: tidak ada error baru

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/dashboard/DashboardPage.tsx
git commit -m "feat: add /debts route, dashboard widget, and avatar dropdown link"
```

---

## Verifikasi Akhir

- [ ] Backend berjalan: `cd backend && npm run dev`
- [ ] Frontend berjalan: `cd frontend && npm run dev`
- [ ] Buka http://localhost:3000 — login
- [ ] Buka http://localhost:3000/debts — halaman terbuka, tab Hutang/Piutang terlihat
- [ ] Tambah hutang baru → muncul di list
- [ ] Bayar cicilan → progress bar berubah, saldo rekening berkurang (cek di Rekening)
- [ ] Bayar lunas → status berubah jadi "Lunas"
- [ ] Hapus cicilan → paid_amount berkurang, saldo rekening dikembalikan
- [ ] Hapus hutang → hilang dari list, saldo rekening dikembalikan
- [ ] Dashboard — buka homepage → widget "Hutang & Piutang" muncul jika ada data aktif
- [ ] Avatar dropdown di Dashboard → ada item "Hutang & Piutang" → navigate ke /debts

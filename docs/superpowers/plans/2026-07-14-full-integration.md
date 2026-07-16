# Full Frontend–Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 5 backend modules (categories, accounts, transactions, budgets, reports) and wire all frontend pages to real API data, replacing hardcoded mocks.

**Architecture:** Backend follows existing repository → service → controller → routes pattern with mysql2 direct queries. Frontend adds 5 service files and rewrites 4 pages to fetch from API using React state + useEffect. Seed data (14 categories, 1 account) is auto-inserted when a user registers inside a DB transaction.

**Tech Stack:** Node.js + Express + TypeScript + mysql2 (backend); React 18 + TypeScript + Vite + Axios (frontend)

## Global Constraints

- All queries scope to `req.userId` from JWT — never trust userId from request body
- Money: MySQL DECIMAL(15,2); JS `number` (pool option `decimalNumbers: true` already set)
- UUID: `import { v4 as uuidv4 } from 'uuid'`
- Error messages in Indonesian
- Response helpers: `sendSuccess` / `sendError` from `../../utils/response`
- Auth middleware: `authenticate` from `../../middleware/auth.middleware`; use on all protected routes
- Backend port 5000; Frontend port 3000; Vite proxies `/api/*` → backend

---

## File Map

**New backend files (22):**
```
backend/src/modules/categories/categories.repository.ts
backend/src/modules/categories/categories.service.ts
backend/src/modules/categories/categories.controller.ts
backend/src/modules/categories/categories.routes.ts
backend/src/modules/accounts/accounts.repository.ts
backend/src/modules/accounts/accounts.service.ts
backend/src/modules/accounts/accounts.controller.ts
backend/src/modules/accounts/accounts.routes.ts
backend/src/modules/transactions/transactions.repository.ts
backend/src/modules/transactions/transactions.service.ts
backend/src/modules/transactions/transactions.controller.ts
backend/src/modules/transactions/transactions.routes.ts
backend/src/modules/budgets/budgets.repository.ts
backend/src/modules/budgets/budgets.service.ts
backend/src/modules/budgets/budgets.controller.ts
backend/src/modules/budgets/budgets.routes.ts
backend/src/modules/reports/reports.repository.ts
backend/src/modules/reports/reports.service.ts
backend/src/modules/reports/reports.controller.ts
backend/src/modules/reports/reports.routes.ts
```

**Modified backend files:**
```
backend/src/modules/auth/auth.repository.ts  — add createDefaultData(conn, userId)
backend/src/modules/auth/auth.service.ts     — wrap register in DB transaction + call createDefaultData
backend/src/app.ts                           — mount 5 new routers
```

**New frontend files (5):**
```
frontend/src/services/categoryService.ts
frontend/src/services/accountService.ts
frontend/src/services/transactionService.ts
frontend/src/services/budgetService.ts
frontend/src/services/reportService.ts
```

**Modified frontend files:**
```
frontend/src/types/index.ts                              — add BudgetWithSpending, ReportSummary, MonthlyChartEntry, TransactionFilter
frontend/src/pages/transactions/TransactionsPage.tsx     — wire to real API
frontend/src/pages/income/IncomePage.tsx                 — wire to real API
frontend/src/pages/expenses/ExpensesPage.tsx             — wire to real API + budget modal
frontend/src/pages/dashboard/DashboardPage.tsx           — wire to real API
```

---

## Task 1: Seed default data on user registration

**Files:**
- Modify: `backend/src/modules/auth/auth.repository.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Add imports and createDefaultData to auth.repository.ts**

Read the file first. Add `PoolConnection` to the mysql2 import and append the function:

```ts
// Add to existing mysql2 import:
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise'

// Append at bottom of file:
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
```

Make sure `import { v4 as uuidv4 } from 'uuid'` is present at the top.

- [ ] **Step 2: Rewrite register function in auth.service.ts**

Read the file. Add `import { pool } from '../../database/connection/db'` if not present. Replace the `register` function:

```ts
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
```

Add `import { createDefaultData } from './auth.repository'` (alongside existing imports from auth.repository).
Add `import { pool } from '../../database/connection/db'`.

- [ ] **Step 3: Type check**

```
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual test — register a new user**

```
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Andi\",\"email\":\"andi@test.com\",\"password\":\"password123\"}"
```

Check phpMyAdmin: `categories` table should have 14 rows for this user_id; `accounts` table should have 1 row named "Rekening Utama".

- [ ] **Step 5: Commit**

```
git add backend/src/modules/auth/auth.repository.ts backend/src/modules/auth/auth.service.ts
git commit -m "feat: seed default categories and account on user registration"
```

---

## Task 2: Categories and Accounts backend modules

**Files:**
- Create: all 8 files in `categories/` and `accounts/` modules
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Create backend/src/modules/categories/categories.repository.ts**

```ts
import { RowDataPacket } from 'mysql2/promise'
import { pool } from '../../database/connection/db'

export interface CategoryRow {
  id: string
  user_id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  created_at: Date
  updated_at: Date
}

export async function findCategoriesByUserId(userId: string): Promise<CategoryRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, user_id, name, type, created_at, updated_at FROM categories WHERE user_id = ? ORDER BY type, name',
    [userId]
  )
  return rows as CategoryRow[]
}
```

- [ ] **Step 2: Create backend/src/modules/categories/categories.service.ts**

```ts
import { CategoryRow, findCategoriesByUserId } from './categories.repository'

export async function getCategories(userId: string): Promise<CategoryRow[]> {
  return findCategoriesByUserId(userId)
}
```

- [ ] **Step 3: Create backend/src/modules/categories/categories.controller.ts**

```ts
import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getCategories } from './categories.service'
import { sendSuccess, sendError } from '../../utils/response'

export async function getCategoriesController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const categories = await getCategories(req.userId!)
    sendSuccess(res, categories)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    sendError(res, message, 500)
  }
}
```

- [ ] **Step 4: Create backend/src/modules/categories/categories.routes.ts**

```ts
import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { getCategoriesController } from './categories.controller'

const router = Router()
router.get('/', authenticate, getCategoriesController)
export default router
```

- [ ] **Step 5: Create backend/src/modules/accounts/accounts.repository.ts**

```ts
import { RowDataPacket } from 'mysql2/promise'
import { pool } from '../../database/connection/db'

export interface AccountRow {
  id: string
  user_id: string
  name: string
  balance: number
  created_at: Date
  updated_at: Date
}

export async function findAccountsByUserId(userId: string): Promise<AccountRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, user_id, name, balance, created_at, updated_at FROM accounts WHERE user_id = ? ORDER BY name',
    [userId]
  )
  return rows as AccountRow[]
}
```

- [ ] **Step 6: Create backend/src/modules/accounts/accounts.service.ts**

```ts
import { AccountRow, findAccountsByUserId } from './accounts.repository'

export async function getAccounts(userId: string): Promise<AccountRow[]> {
  return findAccountsByUserId(userId)
}
```

- [ ] **Step 7: Create backend/src/modules/accounts/accounts.controller.ts**

```ts
import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getAccounts } from './accounts.service'
import { sendSuccess, sendError } from '../../utils/response'

export async function getAccountsController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const accounts = await getAccounts(req.userId!)
    sendSuccess(res, accounts)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    sendError(res, message, 500)
  }
}
```

- [ ] **Step 8: Create backend/src/modules/accounts/accounts.routes.ts**

```ts
import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { getAccountsController } from './accounts.controller'

const router = Router()
router.get('/', authenticate, getAccountsController)
export default router
```

- [ ] **Step 9: Mount in app.ts**

Read `backend/src/app.ts`. Add after the authRouter import:

```ts
import categoryRouter from './modules/categories/categories.routes'
import accountRouter from './modules/accounts/accounts.routes'
```

Add after `app.use('/api/auth', authRouter)`:

```ts
app.use('/api/categories', categoryRouter)
app.use('/api/accounts', accountRouter)
```

- [ ] **Step 10: Type check**

```
cd backend && npx tsc --noEmit
```

- [ ] **Step 11: Manual test**

Login and get token:
```
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"andi@test.com\",\"password\":\"password123\"}"
```

Test categories (replace TOKEN):
```
curl http://localhost:5000/api/categories -H "Authorization: Bearer TOKEN"
```
Expected: array of 14 objects with `id`, `name`, `type` fields.

```
curl http://localhost:5000/api/accounts -H "Authorization: Bearer TOKEN"
```
Expected: `[{ "id": "...", "name": "Rekening Utama", "balance": 0 }]`

- [ ] **Step 12: Commit**

```
git add backend/src/modules/categories/ backend/src/modules/accounts/ backend/src/app.ts
git commit -m "feat: add categories and accounts GET endpoints"
```

---

## Task 3: Transactions backend module (full CRUD)

**Files:**
- Create: 4 files in `backend/src/modules/transactions/`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Create backend/src/modules/transactions/transactions.repository.ts**

```ts
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { pool } from '../../database/connection/db'
import { v4 as uuidv4 } from 'uuid'

export interface TransactionRow {
  id: string
  user_id: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  date: string
  category_id: string
  category_name: string
  account_id: string
  account_name: string
  created_at: Date
  updated_at: Date
}

export interface TxFilter {
  type?: 'INCOME' | 'EXPENSE'
  month?: number
  year?: number
  search?: string
  page: number
  limit: number
}

export interface TxMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

const SELECT_TX = `
  SELECT t.id, t.user_id, t.type, t.amount, t.description, t.date,
         t.category_id, c.name as category_name,
         t.account_id,  a.name as account_name,
         t.created_at,  t.updated_at
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  LEFT JOIN accounts   a ON t.account_id  = a.id`

export async function findTransactions(
  userId: string,
  filter: TxFilter
): Promise<{ data: TransactionRow[]; meta: TxMeta }> {
  const conds: string[] = ['t.user_id = ?']
  const params: unknown[] = [userId]

  if (filter.type)   { conds.push('t.type = ?');              params.push(filter.type) }
  if (filter.month)  { conds.push('MONTH(t.date) = ?');       params.push(filter.month) }
  if (filter.year)   { conds.push('YEAR(t.date) = ?');        params.push(filter.year) }
  if (filter.search) { conds.push('t.description LIKE ?');    params.push(`%${filter.search}%`) }

  const where = conds.join(' AND ')

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM transactions t WHERE ${where}`, params
  )
  const total = (countRows[0] as { total: number }).total
  const offset = (filter.page - 1) * filter.limit

  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_TX} WHERE ${where} ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`,
    [...params, filter.limit, offset]
  )

  return {
    data: rows as TransactionRow[],
    meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) || 1 },
  }
}

export async function findTransactionById(id: string, userId: string): Promise<TransactionRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_TX} WHERE t.id = ? AND t.user_id = ?`, [id, userId]
  )
  return (rows[0] as TransactionRow) ?? null
}

export interface TxData {
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  date: string
  categoryId: string
  accountId: string
}

export async function insertTransaction(userId: string, data: TxData): Promise<TransactionRow> {
  const id = uuidv4()
  await pool.query<ResultSetHeader>(
    'INSERT INTO transactions (id, user_id, type, amount, description, date, category_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userId, data.type, data.amount, data.description, data.date, data.categoryId, data.accountId]
  )
  return findTransactionById(id, userId) as Promise<TransactionRow>
}

export async function updateTransactionRow(id: string, userId: string, data: TxData): Promise<TransactionRow> {
  await pool.query<ResultSetHeader>(
    'UPDATE transactions SET type=?, amount=?, description=?, date=?, category_id=?, account_id=? WHERE id=? AND user_id=?',
    [data.type, data.amount, data.description, data.date, data.categoryId, data.accountId, id, userId]
  )
  return findTransactionById(id, userId) as Promise<TransactionRow>
}

export async function deleteTransactionRow(id: string, userId: string): Promise<void> {
  await pool.query<ResultSetHeader>('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId])
}
```

- [ ] **Step 2: Create backend/src/modules/transactions/transactions.service.ts**

```ts
import {
  findTransactions, findTransactionById,
  insertTransaction, updateTransactionRow, deleteTransactionRow,
  TransactionRow, TxFilter, TxMeta, TxData,
} from './transactions.repository'

export async function getTransactions(
  userId: string, filter: TxFilter
): Promise<{ data: TransactionRow[]; meta: TxMeta }> {
  return findTransactions(userId, filter)
}

export async function addTransaction(userId: string, data: TxData): Promise<TransactionRow> {
  return insertTransaction(userId, data)
}

export async function editTransaction(id: string, userId: string, data: TxData): Promise<TransactionRow> {
  const existing = await findTransactionById(id, userId)
  if (!existing) throw new Error('Transaksi tidak ditemukan')
  return updateTransactionRow(id, userId, data)
}

export async function removeTransaction(id: string, userId: string): Promise<void> {
  const existing = await findTransactionById(id, userId)
  if (!existing) throw new Error('Transaksi tidak ditemukan')
  return deleteTransactionRow(id, userId)
}
```

- [ ] **Step 3: Create backend/src/modules/transactions/transactions.controller.ts**

```ts
import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getTransactions, addTransaction, editTransaction, removeTransaction } from './transactions.service'
import { sendSuccess, sendError } from '../../utils/response'

const txSchema = z.object({
  type:        z.enum(['INCOME', 'EXPENSE']),
  amount:      z.number().positive('Jumlah harus lebih dari 0'),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  categoryId:  z.string().uuid('Category tidak valid'),
  accountId:   z.string().uuid('Account tidak valid'),
})

export async function getTransactionsController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 10)
    const result = await getTransactions(req.userId!, {
      page, limit,
      type:   req.query.type   as 'INCOME' | 'EXPENSE' | undefined,
      month:  req.query.month  ? parseInt(req.query.month  as string) : undefined,
      year:   req.query.year   ? parseInt(req.query.year   as string) : undefined,
      search: req.query.search as string | undefined,
    })
    sendSuccess(res, result)
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 500)
  }
}

export async function createTransactionController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = txSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const tx = await addTransaction(req.userId!, parsed.data)
    sendSuccess(res, tx, 'Transaksi berhasil dibuat', 201)
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function updateTransactionController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = txSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const tx = await editTransaction(req.params.id, req.userId!, parsed.data)
    sendSuccess(res, tx, 'Transaksi berhasil diupdate')
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}

export async function deleteTransactionController(req: AuthRequest, res: Response): Promise<void> {
  try {
    await removeTransaction(req.params.id, req.userId!)
    sendSuccess(res, null, 'Transaksi berhasil dihapus')
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}
```

- [ ] **Step 4: Create backend/src/modules/transactions/transactions.routes.ts**

```ts
import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import {
  getTransactionsController, createTransactionController,
  updateTransactionController, deleteTransactionController,
} from './transactions.controller'

const router = Router()
router.get('/',      authenticate, getTransactionsController)
router.post('/',     authenticate, createTransactionController)
router.put('/:id',   authenticate, updateTransactionController)
router.delete('/:id',authenticate, deleteTransactionController)
export default router
```

- [ ] **Step 5: Mount in app.ts**

Add import: `import transactionRouter from './modules/transactions/transactions.routes'`
Add route: `app.use('/api/transactions', transactionRouter)`

- [ ] **Step 6: Type check**

```
cd backend && npx tsc --noEmit
```

- [ ] **Step 7: Manual test — get categoryId and accountId first, then create a transaction**

```
curl -X POST http://localhost:5000/api/transactions -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d "{\"type\":\"INCOME\",\"amount\":5000000,\"description\":\"Gaji Juli\",\"date\":\"2026-07-01\",\"categoryId\":\"PASTE_CATEGORY_ID\",\"accountId\":\"PASTE_ACCOUNT_ID\"}"
```

```
curl "http://localhost:5000/api/transactions?page=1&limit=10" -H "Authorization: Bearer TOKEN"
```
Expected: `{ success: true, data: { data: [...], meta: { total, page, limit, totalPages } } }`

- [ ] **Step 8: Commit**

```
git add backend/src/modules/transactions/ backend/src/app.ts
git commit -m "feat: add transactions CRUD endpoints"
```

---

## Task 4: Budgets and Reports backend modules

**Files:**
- Create: 4 files in `budgets/` + 4 files in `reports/`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Create backend/src/modules/budgets/budgets.repository.ts**

```ts
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { pool } from '../../database/connection/db'
import { v4 as uuidv4 } from 'uuid'

export interface BudgetWithSpending {
  id: string
  category_id: string
  category_name: string
  amount: number
  spent: number
  month: number
  year: number
}

export async function findBudgetsWithSpending(
  userId: string, month: number, year: number
): Promise<BudgetWithSpending[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT b.id, b.category_id, c.name as category_name,
            b.amount, b.month, b.year,
            COALESCE(SUM(t.amount), 0) as spent
     FROM budgets b
     LEFT JOIN categories c ON b.category_id = c.id
     LEFT JOIN transactions t
       ON t.category_id = b.category_id AND t.user_id = b.user_id
       AND t.type = 'EXPENSE' AND MONTH(t.date) = b.month AND YEAR(t.date) = b.year
     WHERE b.user_id = ? AND b.month = ? AND b.year = ?
     GROUP BY b.id, b.category_id, c.name, b.amount, b.month, b.year`,
    [userId, month, year]
  )
  return rows as BudgetWithSpending[]
}

export async function upsertBudget(
  userId: string, categoryId: string, amount: number, month: number, year: number
): Promise<void> {
  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM budgets WHERE user_id=? AND category_id=? AND month=? AND year=?',
    [userId, categoryId, month, year]
  )
  if ((existing as RowDataPacket[]).length > 0) {
    await pool.query<ResultSetHeader>(
      'UPDATE budgets SET amount=? WHERE user_id=? AND category_id=? AND month=? AND year=?',
      [amount, userId, categoryId, month, year]
    )
  } else {
    await pool.query<ResultSetHeader>(
      'INSERT INTO budgets (id, user_id, category_id, amount, month, year) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, categoryId, amount, month, year]
    )
  }
}
```

- [ ] **Step 2: Create backend/src/modules/budgets/budgets.service.ts**

```ts
import { BudgetWithSpending, findBudgetsWithSpending, upsertBudget } from './budgets.repository'

export async function getBudgets(userId: string, month: number, year: number): Promise<BudgetWithSpending[]> {
  return findBudgetsWithSpending(userId, month, year)
}

export async function setBudget(
  userId: string, categoryId: string, amount: number, month: number, year: number
): Promise<void> {
  return upsertBudget(userId, categoryId, amount, month, year)
}
```

- [ ] **Step 3: Create backend/src/modules/budgets/budgets.controller.ts**

```ts
import { Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getBudgets, setBudget } from './budgets.service'
import { sendSuccess, sendError } from '../../utils/response'

const budgetSchema = z.object({
  categoryId: z.string().uuid('Category tidak valid'),
  amount:     z.number().positive('Jumlah harus lebih dari 0'),
  month:      z.number().int().min(1).max(12),
  year:       z.number().int().min(2000).max(2100),
})

export async function getBudgetsController(req: AuthRequest, res: Response): Promise<void> {
  const now   = new Date()
  const month = parseInt(req.query.month as string) || (now.getMonth() + 1)
  const year  = parseInt(req.query.year  as string) || now.getFullYear()
  try {
    const budgets = await getBudgets(req.userId!, month, year)
    sendSuccess(res, budgets)
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 500)
  }
}

export async function setBudgetController(req: AuthRequest, res: Response): Promise<void> {
  const parsed = budgetSchema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 422); return }
  try {
    const { categoryId, amount, month, year } = parsed.data
    await setBudget(req.userId!, categoryId, amount, month, year)
    sendSuccess(res, null, 'Anggaran berhasil disimpan')
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 400)
  }
}
```

- [ ] **Step 4: Create backend/src/modules/budgets/budgets.routes.ts**

```ts
import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { getBudgetsController, setBudgetController } from './budgets.controller'

const router = Router()
router.get('/',  authenticate, getBudgetsController)
router.post('/', authenticate, setBudgetController)
export default router
```

- [ ] **Step 5: Create backend/src/modules/reports/reports.repository.ts**

```ts
import { RowDataPacket } from 'mysql2/promise'
import { pool } from '../../database/connection/db'

export interface MonthlyChartEntry { month: string; income: number; expense: number }
export interface RecentTx { id: string; type: 'INCOME'|'EXPENSE'; amount: number; description: string; date: string; category_name: string; account_name: string }
export interface SummaryData { totalIncome: number; totalExpense: number; balance: number; monthlyChart: MonthlyChartEntry[]; recentTransactions: RecentTx[] }

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

export async function getSummaryData(userId: string, month: number, year: number): Promise<SummaryData> {
  const [totalsRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COALESCE(SUM(CASE WHEN type='INCOME'  THEN amount ELSE 0 END), 0) as total_income,
       COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END), 0) as total_expense
     FROM transactions WHERE user_id=? AND MONTH(date)=? AND YEAR(date)=?`,
    [userId, month, year]
  )
  const totals = totalsRows[0] as { total_income: number; total_expense: number }

  const [chartRows] = await pool.query<RowDataPacket[]>(
    `SELECT MONTH(date) as m,
            COALESCE(SUM(CASE WHEN type='INCOME'  THEN amount ELSE 0 END),0) as income,
            COALESCE(SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END),0) as expense
     FROM transactions WHERE user_id=? AND YEAR(date)=?
     GROUP BY MONTH(date)`,
    [userId, year]
  )
  const chartMap: Record<number, { income: number; expense: number }> = {}
  for (const r of chartRows as { m: number; income: number; expense: number }[]) {
    chartMap[r.m] = { income: Number(r.income), expense: Number(r.expense) }
  }
  const monthlyChart: MonthlyChartEntry[] = MONTHS.map((name, i) => ({
    month: name, income: chartMap[i+1]?.income ?? 0, expense: chartMap[i+1]?.expense ?? 0,
  }))

  const [recentRows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.type, t.amount, t.description, t.date,
            c.name as category_name, a.name as account_name
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts   a ON t.account_id  = a.id
     WHERE t.user_id=? ORDER BY t.date DESC, t.created_at DESC LIMIT 5`,
    [userId]
  )

  const totalIncome  = Number(totals.total_income)
  const totalExpense = Number(totals.total_expense)
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense, monthlyChart, recentTransactions: recentRows as RecentTx[] }
}
```

- [ ] **Step 6: Create backend/src/modules/reports/reports.service.ts**

```ts
import { SummaryData, getSummaryData } from './reports.repository'

export async function getReportSummary(userId: string, month: number, year: number): Promise<SummaryData> {
  return getSummaryData(userId, month, year)
}
```

- [ ] **Step 7: Create backend/src/modules/reports/reports.controller.ts**

```ts
import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import { getReportSummary } from './reports.service'
import { sendSuccess, sendError } from '../../utils/response'

export async function getSummaryController(req: AuthRequest, res: Response): Promise<void> {
  const now   = new Date()
  const month = parseInt(req.query.month as string) || (now.getMonth() + 1)
  const year  = parseInt(req.query.year  as string) || now.getFullYear()
  try {
    const summary = await getReportSummary(req.userId!, month, year)
    sendSuccess(res, summary)
  } catch (err: unknown) {
    sendError(res, err instanceof Error ? err.message : 'Terjadi kesalahan', 500)
  }
}
```

- [ ] **Step 8: Create backend/src/modules/reports/reports.routes.ts**

```ts
import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { getSummaryController } from './reports.controller'

const router = Router()
router.get('/summary', authenticate, getSummaryController)
export default router
```

- [ ] **Step 9: Mount both routers in app.ts**

Add imports:
```ts
import budgetRouter  from './modules/budgets/budgets.routes'
import reportRouter  from './modules/reports/reports.routes'
```

Add routes:
```ts
app.use('/api/budgets', budgetRouter)
app.use('/api/reports', reportRouter)
```

- [ ] **Step 10: Type check**

```
cd backend && npx tsc --noEmit
```

- [ ] **Step 11: Manual test**

```
curl "http://localhost:5000/api/reports/summary?month=7&year=2026" -H "Authorization: Bearer TOKEN"
```
Expected: `{ totalIncome, totalExpense, balance, monthlyChart: [12 entries], recentTransactions: [...] }`

- [ ] **Step 12: Commit**

```
git add backend/src/modules/budgets/ backend/src/modules/reports/ backend/src/app.ts
git commit -m "feat: add budgets and reports summary endpoints"
```

---

## Task 5: Frontend service files + types

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: 5 service files

- [ ] **Step 1: Update frontend/src/types/index.ts**

Read the file. Add these types at the bottom (skip any that already exist):

```ts
export interface TransactionFilter {
  type?: 'INCOME' | 'EXPENSE'
  month?: number
  year?: number
  search?: string
  page?: number
  limit?: number
}

export interface BudgetWithSpending {
  id: string
  categoryId: string
  categoryName: string
  amount: number
  spent: number
  month: number
  year: number
}

export interface MonthlyChartEntry {
  month: string
  income: number
  expense: number
}

export interface ReportSummary {
  totalIncome: number
  totalExpense: number
  balance: number
  monthlyChart: MonthlyChartEntry[]
  recentTransactions: Transaction[]
}
```

Also ensure `Transaction` interface has optional `categoryName` and `accountName`:
```ts
export interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  date: string
  categoryId: string
  categoryName?: string
  accountId: string
  accountName?: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Create frontend/src/services/categoryService.ts**

```ts
import api from './api'
import { ApiResponse, Category } from '../types'

export async function getCategories(): Promise<Category[]> {
  const res = await api.get<ApiResponse<Category[]>>('/categories')
  return res.data.data
}
```

- [ ] **Step 3: Create frontend/src/services/accountService.ts**

```ts
import api from './api'
import { ApiResponse, Account } from '../types'

export async function getAccounts(): Promise<Account[]> {
  const res = await api.get<ApiResponse<Account[]>>('/accounts')
  return res.data.data
}
```

- [ ] **Step 4: Create frontend/src/services/transactionService.ts**

```ts
import api from './api'
import { ApiResponse, Transaction, TransactionFilter } from '../types'

interface PaginatedTx {
  data: Transaction[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): Transaction {
  return {
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    description: r.description,
    date: (r.date as string).split('T')[0],
    categoryId:   r.category_id   ?? r.categoryId   ?? '',
    categoryName: r.category_name ?? r.categoryName,
    accountId:    r.account_id    ?? r.accountId    ?? '',
    accountName:  r.account_name  ?? r.accountName,
    createdAt: r.created_at ?? r.createdAt ?? '',
    updatedAt: r.updated_at ?? r.updatedAt ?? '',
  }
}

export async function getTransactions(filter: TransactionFilter = {}): Promise<PaginatedTx> {
  const params = new URLSearchParams()
  if (filter.type)   params.set('type',   filter.type)
  if (filter.month)  params.set('month',  String(filter.month))
  if (filter.year)   params.set('year',   String(filter.year))
  if (filter.search) params.set('search', filter.search)
  params.set('page',  String(filter.page  ?? 1))
  params.set('limit', String(filter.limit ?? 10))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<ApiResponse<{ data: any[]; meta: PaginatedTx['meta'] }>>(`/transactions?${params}`)
  return { data: res.data.data.data.map(mapRow), meta: res.data.data.meta }
}

export interface TxPayload {
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  date: string
  categoryId: string
  accountId: string
}

export async function createTransaction(data: TxPayload): Promise<Transaction> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.post<ApiResponse<any>>('/transactions', data)
  return mapRow(res.data.data)
}

export async function updateTransaction(id: string, data: TxPayload): Promise<Transaction> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.put<ApiResponse<any>>(`/transactions/${id}`, data)
  return mapRow(res.data.data)
}

export async function deleteTransaction(id: string): Promise<void> {
  await api.delete(`/transactions/${id}`)
}
```

- [ ] **Step 5: Create frontend/src/services/budgetService.ts**

```ts
import api from './api'
import { ApiResponse, BudgetWithSpending } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBudget(r: any): BudgetWithSpending {
  return {
    id:           r.id,
    categoryId:   r.category_id   ?? r.categoryId,
    categoryName: r.category_name ?? r.categoryName,
    amount: Number(r.amount),
    spent:  Number(r.spent),
    month:  Number(r.month),
    year:   Number(r.year),
  }
}

export async function getBudgets(month: number, year: number): Promise<BudgetWithSpending[]> {
  const res = await api.get<ApiResponse<unknown[]>>(`/budgets?month=${month}&year=${year}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data.data as any[]).map(mapBudget)
}

export async function setBudget(data: {
  categoryId: string; amount: number; month: number; year: number
}): Promise<void> {
  await api.post('/budgets', data)
}
```

- [ ] **Step 6: Create frontend/src/services/reportService.ts**

```ts
import api from './api'
import { ApiResponse, ReportSummary, Transaction } from '../types'

export async function getReportSummary(month: number, year: number): Promise<ReportSummary> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<ApiResponse<any>>(`/reports/summary?month=${month}&year=${year}`)
  const d = res.data.data
  return {
    totalIncome:  Number(d.totalIncome),
    totalExpense: Number(d.totalExpense),
    balance:      Number(d.balance),
    monthlyChart: d.monthlyChart ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentTransactions: (d.recentTransactions ?? []).map((r: any): Transaction => ({
      id: r.id, type: r.type, amount: Number(r.amount),
      description: r.description, date: (r.date as string).split('T')[0],
      categoryId: r.category_id ?? '', categoryName: r.category_name,
      accountId:  r.account_id  ?? '', accountName:  r.account_name,
      createdAt: r.created_at ?? '', updatedAt: r.updated_at ?? '',
    })),
  }
}
```

- [ ] **Step 7: Type check frontend**

```
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```
git add frontend/src/services/ frontend/src/types/index.ts
git commit -m "feat: add frontend service files and types for all API modules"
```

---

## Task 6: Wire TransactionsPage

**Files:**
- Modify: `frontend/src/pages/transactions/TransactionsPage.tsx`

- [ ] **Step 1: Read the current file**

Read `frontend/src/pages/transactions/TransactionsPage.tsx` in full to understand the existing UI layout, JSX structure, class names, and form fields.

- [ ] **Step 2: Add these imports at the top (replace any existing mock-data imports)**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, TxPayload } from '../../services/transactionService'
import { getCategories } from '../../services/categoryService'
import { getAccounts } from '../../services/accountService'
import { Transaction, Category, Account } from '../../types'
```

- [ ] **Step 3: Replace all state and logic in the component body**

Remove any hardcoded `const transactions = [...]` arrays. Replace with:

```tsx
const now = new Date()
const [transactions, setTransactions] = useState<Transaction[]>([])
const [categories, setCategories]     = useState<Category[]>([])
const [accounts, setAccounts]         = useState<Account[]>([])
const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 })
const [loading, setLoading]           = useState(true)
const [error, setError]               = useState<string | null>(null)
const [activeFilter, setActiveFilter] = useState<'all' | 'INCOME' | 'EXPENSE'>('all')
const [search, setSearch]             = useState('')
const [debouncedSearch, setDebouncedSearch] = useState('')
const [page, setPage]                 = useState(1)
const [isFormOpen, setIsFormOpen]     = useState(false)
const [editingTx, setEditingTx]       = useState<Transaction | null>(null)
const [formData, setFormData]         = useState<TxPayload>({
  type: 'EXPENSE', amount: 0, description: '',
  date: now.toISOString().split('T')[0], categoryId: '', accountId: '',
})
const [formError, setFormError]       = useState<string | null>(null)
const [formLoading, setFormLoading]   = useState(false)

useEffect(() => {
  const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 400)
  return () => clearTimeout(t)
}, [search])

const fetchTransactions = useCallback(async () => {
  setLoading(true); setError(null)
  try {
    const result = await getTransactions({
      type:   activeFilter === 'all' ? undefined : activeFilter,
      search: debouncedSearch || undefined,
      page, limit: 10,
    })
    setTransactions(result.data)
    setMeta(result.meta)
  } catch { setError('Gagal memuat transaksi. Coba lagi.') }
  finally  { setLoading(false) }
}, [activeFilter, debouncedSearch, page])

useEffect(() => { fetchTransactions() }, [fetchTransactions])

useEffect(() => {
  getCategories().then(setCategories).catch(() => {})
  getAccounts().then(setAccounts).catch(() => {})
}, [])

const resetForm = () => setFormData({
  type: 'EXPENSE', amount: 0, description: '',
  date: now.toISOString().split('T')[0], categoryId: '', accountId: '',
})

const handleOpenAdd = () => { setEditingTx(null); resetForm(); setFormError(null); setIsFormOpen(true) }

const handleOpenEdit = (t: Transaction) => {
  setEditingTx(t)
  setFormData({ type: t.type, amount: t.amount, description: t.description,
    date: t.date.split('T')[0], categoryId: t.categoryId, accountId: t.accountId })
  setFormError(null); setIsFormOpen(true)
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault(); setFormError(null); setFormLoading(true)
  try {
    if (editingTx) await updateTransaction(editingTx.id, formData)
    else           await createTransaction(formData)
    setIsFormOpen(false); resetForm(); fetchTransactions()
  } catch (err: unknown) {
    setFormError(err instanceof Error ? err.message : 'Terjadi kesalahan')
  } finally { setFormLoading(false) }
}

const handleDelete = async (id: string) => {
  if (!window.confirm('Hapus transaksi ini?')) return
  try { await deleteTransaction(id); fetchTransactions() }
  catch { alert('Gagal menghapus transaksi.') }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
```

- [ ] **Step 4: Wire the existing JSX to state**

In the existing JSX:

1. **Filter tabs** — wire `onClick` to `() => { setActiveFilter('all'|'INCOME'|'EXPENSE'); setPage(1) }` and apply active styling based on `activeFilter`

2. **Search input** — wire `value={search}` and `onChange={e => setSearch(e.target.value)}`

3. **Transaction table rows** — replace mock data map with `transactions.map(t => ...)`. Show `loading` spinner (a centered `<p>Memuat...</p>`) when `loading === true`. Show `error` banner when `error !== null`.

4. **Amount cells** — replace raw numbers with `fmt(t.amount)`

5. **Pagination** — wire Prev button to `setPage(p => p - 1)` with `disabled={page <= 1}`, Next to `setPage(p => p + 1)` with `disabled={page >= meta.totalPages}`. Show `meta.total` for total count.

6. **"Tambah Transaksi" button** — wire `onClick={handleOpenAdd}`

7. **Form panel** — controlled inputs:
   - Type select/toggle: `value={formData.type}` `onChange={e => setFormData(f => ({ ...f, type: e.target.value as 'INCOME'|'EXPENSE', categoryId: '' }))}`
   - Description: `value={formData.description}` `onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}`
   - Amount: `value={formData.amount || ''}` `onChange={e => setFormData(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}`
   - Date: `value={formData.date}` `onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}`
   - Category select: `value={formData.categoryId}` `onChange={e => setFormData(f => ({ ...f, categoryId: e.target.value }))}`. Options: `categories.filter(c => c.type === formData.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)`
   - Account select: `value={formData.accountId}` `onChange={e => setFormData(f => ({ ...f, accountId: e.target.value }))}`. Options: `accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)`

8. **Form Save button** — `onClick={handleSubmit}` `disabled={formLoading}`, label: `formLoading ? 'Menyimpan...' : editingTx ? 'Simpan Perubahan' : 'Tambah'`

9. **Error in form** — show `formError` in a red paragraph above the submit button

10. **Edit button per row** — `onClick={() => handleOpenEdit(t)}`

11. **Delete button per row** — `onClick={() => handleDelete(t.id)}`

- [ ] **Step 5: Type check**

```
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Test in browser**

Open http://localhost:3000/transactions. Verify: list loads from API, add form works with category/account dropdowns, edit pre-fills form, delete removes row, filter tabs and search work.

- [ ] **Step 7: Commit**

```
git add frontend/src/pages/transactions/TransactionsPage.tsx
git commit -m "feat: wire TransactionsPage to real API"
```

---

## Task 7: Wire IncomePage

**Files:**
- Modify: `frontend/src/pages/income/IncomePage.tsx`

- [ ] **Step 1: Read IncomePage.tsx in full**

- [ ] **Step 2: Add imports**

```tsx
import { useState, useEffect } from 'react'
import { getTransactions } from '../../services/transactionService'
import { getReportSummary } from '../../services/reportService'
import { Transaction, ReportSummary } from '../../types'
```

- [ ] **Step 3: Replace mock data with state + fetch**

Remove all hardcoded arrays. Add:

```tsx
const now = new Date()
const [month] = useState(now.getMonth() + 1)
const [year]  = useState(now.getFullYear())
const [transactions, setTransactions] = useState<Transaction[]>([])
const [summary, setSummary]           = useState<ReportSummary | null>(null)
const [loading, setLoading]           = useState(true)
const [error, setError]               = useState<string | null>(null)

useEffect(() => {
  setLoading(true)
  Promise.all([
    getTransactions({ type: 'INCOME', month, year, limit: 100 }),
    getReportSummary(month, year),
  ])
    .then(([txResult, sum]) => { setTransactions(txResult.data); setSummary(sum) })
    .catch(() => setError('Gagal memuat data. Coba lagi.'))
    .finally(() => setLoading(false))
}, [month, year])

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const avgIncome = transactions.length
  ? (summary?.totalIncome ?? 0) / transactions.length : 0
```

- [ ] **Step 4: Wire JSX**

Add loading/error guard at top of return:
```tsx
if (loading) return <div className="flex items-center justify-center h-64"><p className="text-brand-paragraph">Memuat data...</p></div>
if (error)   return <div className="flex items-center justify-center h-64"><p className="text-red-400">{error}</p></div>
```

Replace stat card values:
- Total pemasukan → `fmt(summary?.totalIncome ?? 0)`
- Jumlah transaksi → `transactions.length`
- Rata-rata → `fmt(avgIncome)`

Replace chart `data` prop → `summary?.monthlyChart ?? []` (keep existing chart component, only change the data source; use `income` key for the income bar)

Replace transaction table rows → `transactions.map(t => ...)` using `fmt(t.amount)`, `t.description`, `t.categoryName`, `t.date.split('T')[0]`

- [ ] **Step 5: Type check + browser test**

```
cd frontend && npx tsc --noEmit
```

Open http://localhost:3000/income — verify stat cards and table reflect real data.

- [ ] **Step 6: Commit**

```
git add frontend/src/pages/income/IncomePage.tsx
git commit -m "feat: wire IncomePage to real API"
```

---

## Task 8: Wire ExpensesPage + Budget Modal

**Files:**
- Modify: `frontend/src/pages/expenses/ExpensesPage.tsx`

- [ ] **Step 1: Read ExpensesPage.tsx in full**

- [ ] **Step 2: Add imports**

```tsx
import { useState, useEffect } from 'react'
import { getTransactions } from '../../services/transactionService'
import { getReportSummary } from '../../services/reportService'
import { getBudgets, setBudget } from '../../services/budgetService'
import { getCategories } from '../../services/categoryService'
import { Transaction, ReportSummary, BudgetWithSpending, Category } from '../../types'
```

- [ ] **Step 3: Replace mock data with state + fetch**

```tsx
const now = new Date()
const [month] = useState(now.getMonth() + 1)
const [year]  = useState(now.getFullYear())
const [transactions, setTransactions]           = useState<Transaction[]>([])
const [summary, setSummary]                     = useState<ReportSummary | null>(null)
const [budgets, setBudgetsState]                = useState<BudgetWithSpending[]>([])
const [expenseCategories, setExpenseCategories] = useState<Category[]>([])
const [loading, setLoading]                     = useState(true)
const [error, setError]                         = useState<string | null>(null)
const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
const [budgetForm, setBudgetForm] = useState({
  categoryId: '', amount: '', month: now.getMonth() + 1, year: now.getFullYear(),
})
const [budgetFormError, setBudgetFormError]     = useState<string | null>(null)
const [budgetFormLoading, setBudgetFormLoading] = useState(false)

const fetchData = async () => {
  setLoading(true)
  try {
    const [txResult, sum, budgetList, cats] = await Promise.all([
      getTransactions({ type: 'EXPENSE', month, year, limit: 100 }),
      getReportSummary(month, year),
      getBudgets(month, year),
      getCategories(),
    ])
    setTransactions(txResult.data); setSummary(sum)
    setBudgetsState(budgetList)
    setExpenseCategories(cats.filter(c => c.type === 'EXPENSE'))
  } catch { setError('Gagal memuat data. Coba lagi.') }
  finally  { setLoading(false) }
}

useEffect(() => { fetchData() }, [month, year])

const handleBudgetSubmit = async (e: React.FormEvent) => {
  e.preventDefault(); setBudgetFormError(null); setBudgetFormLoading(true)
  try {
    await setBudget({
      categoryId: budgetForm.categoryId,
      amount: parseFloat(budgetForm.amount),
      month: budgetForm.month,
      year:  budgetForm.year,
    })
    setIsBudgetModalOpen(false)
    setBudgetForm({ categoryId: '', amount: '', month: now.getMonth() + 1, year: now.getFullYear() })
    const refreshed = await getBudgets(month, year)
    setBudgetsState(refreshed)
  } catch (err: unknown) {
    setBudgetFormError(err instanceof Error ? err.message : 'Terjadi kesalahan')
  } finally { setBudgetFormLoading(false) }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const donutData = transactions.reduce((acc, t) => {
  const ex = acc.find(d => d.name === (t.categoryName ?? 'Lainnya'))
  if (ex) ex.value += t.amount
  else acc.push({ name: t.categoryName ?? 'Lainnya', value: t.amount })
  return acc
}, [] as { name: string; value: number }[])
```

- [ ] **Step 4: Wire JSX**

Add loading/error guard at top of return (same pattern as IncomePage).

Replace stat card values:
- Total pengeluaran → `fmt(summary?.totalExpense ?? 0)`
- Jumlah transaksi → `transactions.length`
- Rata-rata → `fmt(transactions.length ? (summary?.totalExpense ?? 0) / transactions.length : 0)`

Replace donut chart data prop → `donutData`

Replace budget progress bars — map over `budgets`:
```tsx
budgets.map(b => {
  const pct = b.amount > 0 ? Math.min(100, (b.spent / b.amount) * 100) : 0
  return (
    <div key={b.id}>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-brand-paragraph">{b.categoryName}</span>
        <span className="text-brand-headline">{fmt(b.spent)} / {fmt(b.amount)}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full">
        <div className="h-2 bg-brand-button rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
})
```

Wire "Atur Anggaran" button → `onClick={() => setIsBudgetModalOpen(true)}`

Replace transaction table rows → `transactions.map(t => ...)` with `fmt(t.amount)`

- [ ] **Step 5: Add Budget Modal JSX**

Insert before the closing tag of the page root element:

```tsx
{isBudgetModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsBudgetModalOpen(false)}>
    <div className="bg-brand-bg border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
      <h3 className="text-lg font-semibold text-brand-headline mb-4">Atur Anggaran</h3>
      <form onSubmit={handleBudgetSubmit} className="space-y-4">
        {budgetFormError && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{budgetFormError}</p>
        )}
        <div>
          <label className="block text-sm font-medium text-brand-paragraph mb-1">Kategori</label>
          <select
            value={budgetForm.categoryId}
            onChange={e => setBudgetForm(f => ({ ...f, categoryId: e.target.value }))}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-brand-headline text-sm focus:outline-none focus:border-brand-button"
          >
            <option value="">Pilih kategori pengeluaran</option>
            {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-paragraph mb-1">Jumlah Anggaran (Rp)</label>
          <input
            type="number" min="1" required placeholder="500000"
            value={budgetForm.amount}
            onChange={e => setBudgetForm(f => ({ ...f, amount: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-brand-headline text-sm focus:outline-none focus:border-brand-button"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-brand-paragraph mb-1">Bulan</label>
            <select
              value={budgetForm.month}
              onChange={e => setBudgetForm(f => ({ ...f, month: parseInt(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-brand-headline text-sm focus:outline-none focus:border-brand-button"
            >
              {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'].map((m,i) => (
                <option key={i} value={i+1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-paragraph mb-1">Tahun</label>
            <input type="number" min="2020" max="2100"
              value={budgetForm.year}
              onChange={e => setBudgetForm(f => ({ ...f, year: parseInt(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-brand-headline text-sm focus:outline-none focus:border-brand-button"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => setIsBudgetModalOpen(false)}
            className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-brand-paragraph text-sm hover:bg-white/5 transition-all">
            Batal
          </button>
          <button type="submit" disabled={budgetFormLoading}
            className="flex-1 px-4 py-2 rounded-lg bg-brand-button text-brand-button-text text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50">
            {budgetFormLoading ? 'Menyimpan...' : 'Simpan Anggaran'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
```

- [ ] **Step 6: Type check + browser test**

```
cd frontend && npx tsc --noEmit
```

Open http://localhost:3000/expenses. Test: stat cards real, click "Atur Anggaran" → modal opens → set budget → progress bar appears.

- [ ] **Step 7: Commit**

```
git add frontend/src/pages/expenses/ExpensesPage.tsx
git commit -m "feat: wire ExpensesPage to real API with budget modal"
```

---

## Task 9: Wire DashboardPage

**Files:**
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Read DashboardPage.tsx in full**

- [ ] **Step 2: Add imports**

```tsx
import { useState, useEffect } from 'react'
import { getReportSummary } from '../../services/reportService'
import { getBudgets } from '../../services/budgetService'
import { ReportSummary, BudgetWithSpending } from '../../types'
```

- [ ] **Step 3: Replace mock data with state + fetch**

Remove all hardcoded arrays. Add:

```tsx
const now = new Date()
const [month] = useState(now.getMonth() + 1)
const [year]  = useState(now.getFullYear())
const [summary, setSummary] = useState<ReportSummary | null>(null)
const [budgets, setBudgets] = useState<BudgetWithSpending[]>([])
const [loading, setLoading] = useState(true)
const [error, setError]     = useState<string | null>(null)

useEffect(() => {
  setLoading(true)
  Promise.all([getReportSummary(month, year), getBudgets(month, year)])
    .then(([sum, bl]) => { setSummary(sum); setBudgets(bl) })
    .catch(() => setError('Gagal memuat dashboard.'))
    .finally(() => setLoading(false))
}, [month, year])

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
```

- [ ] **Step 4: Wire JSX**

Add loading/error guard at top of return.

Replace stat card values:
- Pemasukan → `fmt(summary?.totalIncome ?? 0)`
- Pengeluaran → `fmt(summary?.totalExpense ?? 0)`
- Saldo → `fmt(summary?.balance ?? 0)`

Replace AreaChart `data` prop → `summary?.monthlyChart ?? []` (keep existing chart component unchanged, only change the data prop)

Replace recent transactions table rows → `(summary?.recentTransactions ?? []).map(t => ...)` using `fmt(t.amount)`, `t.description`, `t.categoryName`, `t.date.split('T')[0]`, `t.type`

Replace budget progress bars → `budgets.map(b => ...)` with `b.categoryName`, `fmt(b.spent)`, `fmt(b.amount)`, progress = `Math.min(100, b.amount > 0 ? (b.spent / b.amount) * 100 : 0)`

- [ ] **Step 5: Type check + browser test**

```
cd frontend && npx tsc --noEmit
```

Open http://localhost:3000/dashboard. Verify all widgets show real data.

- [ ] **Step 6: Commit**

```
git add frontend/src/pages/dashboard/DashboardPage.tsx
git commit -m "feat: wire DashboardPage to real API"
```

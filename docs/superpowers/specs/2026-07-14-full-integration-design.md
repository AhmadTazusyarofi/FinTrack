# Full Frontend–Backend Integration Design

**Date:** 2026-07-14  
**Scope:** Wire all four protected pages (Dashboard, Transaksi, Pemasukan, Pengeluaran) to real backend APIs; build five backend modules from scratch; seed default data on user registration.

---

## 1. Architecture Overview

```
Client (React SPA)                    Server (Express)             DB (MySQL)
──────────────────                    ────────────────             ──────────
DashboardPage        ─GET /reports/summary──────────────────────→  reports query
TransactionsPage     ─GET/POST/PUT/DELETE /transactions──────────→  transactions table
IncomePage           ─GET /transactions?type=INCOME──────────────→  transactions table
ExpensesPage         ─GET /transactions?type=EXPENSE─────────────→  transactions table
                     ─GET/POST /budgets───────────────────────────→  budgets table
form dropdowns       ─GET /categories, GET /accounts──────────────→  categories, accounts tables
```

All endpoints require JWT. Every query is scoped to `req.userId` from the JWT — never from the request body.

---

## 2. Seed Data on Registration

When a user registers, `auth.service.ts` calls `createDefaultData(userId)` immediately after `createUser()`. Both run inside a single DB transaction (rollback if either fails).

**Default categories inserted (12 total):**

| Type | Names |
|------|-------|
| INCOME | Gaji, Freelance, Bisnis, Investasi, Hadiah, Lainnya |
| EXPENSE | Makanan & Minuman, Transport, Hiburan, Kesehatan, Belanja, Tagihan, Pendidikan, Lainnya |

**Default account inserted (1):**
- Name: `Rekening Utama`, Balance: `0.00`

---

## 3. Backend Modules

Each module follows the existing pattern: `routes.ts` → `controller.ts` → `service.ts` → `repository.ts`. All modules are mounted in `app.ts`.

### 3.1 Categories Module

**Route:** `GET /api/categories`  
Returns all categories belonging to the authenticated user, ordered by type then name.

```
repository: findCategoriesByUserId(userId) → CategoryRow[]
service:    getCategories(userId) → CategoryRow[]
controller: getCategoriesController — sendSuccess with array
```

### 3.2 Accounts Module

**Route:** `GET /api/accounts`  
Returns all accounts belonging to the authenticated user.

```
repository: findAccountsByUserId(userId) → AccountRow[]
service:    getAccounts(userId) → AccountRow[]
controller: getAccountsController — sendSuccess with array
```

### 3.3 Transactions Module

**Routes:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions` | Paginated list, filterable |
| POST | `/api/transactions` | Create new transaction |
| PUT | `/api/transactions/:id` | Update existing transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |

**GET query params:** `type` (INCOME\|EXPENSE), `page` (default 1), `limit` (default 10), `search` (matches description), `month` (1–12), `year` (4-digit)

**GET response shape:**
```json
{
  "data": [...transactions with category.name and account.name joined],
  "meta": { "total": 42, "page": 1, "limit": 10, "totalPages": 5 }
}
```

**POST/PUT body (Zod validated):**
```json
{
  "type": "INCOME|EXPENSE",
  "amount": 150000,
  "description": "Makan siang",
  "date": "2026-07-14",
  "categoryId": "uuid",
  "accountId": "uuid"
}
```

**Ownership check:** PUT and DELETE verify `transaction.userId === req.userId` before proceeding; return 403 if not owned.

**Transaction row** includes joined `category_name` and `account_name` (LEFT JOIN) so frontend gets display names without extra requests.

### 3.4 Budgets Module

**Routes:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/budgets` | List budgets with actual spending |
| POST | `/api/budgets` | Set/update budget for a category |

**GET query params:** `month` (1–12, default current month), `year` (4-digit, default current year)

**GET response** includes actual spending per category computed from transactions in the same month/year:
```json
[
  {
    "id": "uuid",
    "categoryId": "uuid",
    "categoryName": "Makanan & Minuman",
    "amount": 500000,
    "spent": 320000,
    "month": 7,
    "year": 2026
  }
]
```

**POST body (Zod validated):**
```json
{ "categoryId": "uuid", "amount": 500000, "month": 7, "year": 2026 }
```

Upsert logic: if a budget for `(userId, categoryId, month, year)` already exists, update `amount`; otherwise insert new row.

### 3.5 Reports Module

**Route:** `GET /api/reports/summary?month=7&year=2026`

Returns aggregated data needed by DashboardPage in one request:

```json
{
  "totalIncome": 5000000,
  "totalExpense": 2300000,
  "balance": 2700000,
  "monthlyChart": [
    { "month": "Jan", "income": 4000000, "expense": 1800000 },
    ...12 entries for the requested year
  ],
  "recentTransactions": [...5 most recent transactions]
}
```

All computed with SQL aggregates — no N+1 queries.

---

## 4. Frontend Changes

### 4.1 Service Files (new)

`frontend/src/services/transactionService.ts`
- `getTransactions(params)` — paginated list
- `createTransaction(data)` — POST
- `updateTransaction(id, data)` — PUT
- `deleteTransaction(id)` — DELETE

`frontend/src/services/categoryService.ts`
- `getCategories()` — GET all for current user

`frontend/src/services/accountService.ts`
- `getAccounts()` — GET all for current user

`frontend/src/services/budgetService.ts`
- `getBudgets(month, year)` — GET with spending
- `setBudget(data)` — POST/upsert

`frontend/src/services/reportService.ts`
- `getSummary(month, year)` — GET dashboard summary

### 4.2 TransactionsPage

- Replace mock array with `useEffect` → `getTransactions()`
- Filter tabs (Semua / Pemasukan / Pengeluaran) pass `type` param
- Search input debounced 400ms → re-fetch
- Pagination buttons wired to `page` state
- Add Transaksi form: category dropdown from `getCategories()`, account dropdown from `getAccounts()`, submit calls `createTransaction()`
- Edit: pre-fill form with row data, submit calls `updateTransaction()`
- Delete: confirm dialog → `deleteTransaction()` → refresh list

### 4.3 IncomePage

- Stat cards: totalIncome, count, average — computed from `getSummary()`
- Bar chart: monthlyChart income data from `getSummary()`
- Table: `getTransactions({ type: 'INCOME', month, year })`

### 4.4 ExpensesPage

- Stat cards: totalExpense, count, average — from `getSummary()`
- Donut chart: expense by category — computed from `getTransactions({ type: 'EXPENSE' })` grouped client-side
- Budget progress bars: from `getBudgets(month, year)` — shows amount vs spent
- "Atur Anggaran" button → modal with:
  - Category dropdown (EXPENSE categories only)
  - Amount input
  - Month/year selectors (default current)
  - Submit → `setBudget()` → refresh budget list

### 4.5 DashboardPage

- Stat cards: totalIncome, totalExpense, balance — from `getSummary()`
- AreaChart: monthlyChart 12 entries — from `getSummary()`
- Recent transactions table: recentTransactions from `getSummary()`
- Budget progress: from `getBudgets(currentMonth, currentYear)`

---

## 5. Error Handling

- All service functions catch errors and re-throw with user-friendly Indonesian messages
- Pages show inline error state (e.g., "Gagal memuat data. Coba lagi.") with retry button
- Loading states: skeleton or spinner while fetching
- Optimistic UI not used — wait for server confirmation before updating list

---

## 6. Implementation Order

1. **Backend: seed on register** — `createDefaultData()` in auth.service.ts + repositories for categories/accounts insert
2. **Backend: categories & accounts modules** — GET endpoints
3. **Backend: transactions module** — full CRUD
4. **Backend: budgets module** — GET with spending + POST upsert
5. **Backend: reports module** — summary endpoint
6. **Frontend: service files** — all 5 service files
7. **Frontend: TransactionsPage** — wire add/edit/delete + list
8. **Frontend: IncomePage** — wire stats + chart + table
9. **Frontend: ExpensesPage** — wire stats + table + budget modal
10. **Frontend: DashboardPage** — wire all widgets

---

## 7. Out of Scope

- Account balance auto-update when transaction is added/deleted (future phase)
- CSV/Excel/PDF export (Phase 2)
- Recurring transactions (Phase 3)
- Notifications and header search (UI-only, not wired)
- Category and Account management pages (CRUD for categories/accounts beyond seed)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Finance Tracker — a web app for recording, managing, and analyzing personal finances. Users track income/expenses, set budgets, and view financial insights.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Routing | React Router v6 |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Backend | Node.js + Express.js + TypeScript |
| ORM | Prisma v5 |
| Database | MySQL (XAMPP) |

---

## Monorepo Structure

```
finance-tracker/
├── frontend/                  # React SPA (Vite, port 3000)
│   └── src/
│       ├── pages/             # Route-level page components (thin, import from features)
│       ├── features/          # Feature-sliced modules — each owns components/hooks/types
│       ├── components/ui/     # shadcn/ui primitives
│       ├── services/api.ts    # Axios instance with JWT interceptor
│       ├── hooks/             # Shared custom hooks
│       ├── lib/utils.ts       # cn() helper (clsx + tailwind-merge)
│       └── types/index.ts     # Shared TypeScript types
├── backend/                   # Express API (port 5000)
│   ├── prisma/schema.prisma   # Single source of truth for DB schema
│   └── src/
│       ├── app.ts             # Express entry — mounts all routers
│       ├── modules/           # Feature modules (auth, users, transactions, categories, accounts, budgets, reports)
│       ├── controllers/       # HTTP layer — parse req, call service, send response
│       ├── services/          # Business logic
│       ├── repositories/      # Prisma queries — only place DB is touched
│       ├── routes/            # Express routers
│       ├── middleware/        # auth.middleware.ts (JWT verify → req.userId)
│       ├── database/connection/prisma.ts  # Singleton PrismaClient
│       └── config/index.ts    # Typed env config
└── package.json               # npm workspaces root
```

---

## Development Commands

```bash
# Frontend (cd frontend)
npm run dev          # Vite dev server → http://localhost:3000
npm run build        # tsc + vite build
npm run type-check   # tsc --noEmit only

# Backend (cd backend)
npm run dev          # nodemon + ts-node → http://localhost:5000
npm run build        # tsc → dist/
npm run seed         # ts-node src/database/seeders/index.ts

# Database (cd backend)
npm run migrate               # prisma migrate dev (creates migration + applies)
npx prisma migrate dev --name <name>   # named migration
npm run studio                # Prisma Studio GUI
```

Vite proxies `/api/*` → `http://localhost:5000`, so frontend calls `axios.get('/api/...')` without hardcoding the backend URL.

---

## Architecture Decisions

### Feature-slice (frontend)
Pages in `src/pages/` are thin route shells — all logic lives in `src/features/<name>/`. Each feature owns its own components, hooks, and Zod schemas. Import from features into pages, never the reverse.

### Repository pattern (backend)
`repositories/` → raw Prisma queries only. `services/` → business logic (calculations, validations). `controllers/` → HTTP only (parse body, call service, `sendSuccess`/`sendError`). Never write Prisma calls in controllers or routes.

### Auth flow
Backend issues a JWT on login; frontend stores it in `localStorage` and sends it as `Authorization: Bearer <token>`. The `authenticate` middleware (`src/middleware/auth.middleware.ts`) verifies the token and sets `req.userId`. Every query **must** scope to `req.userId` — never trust a userId from the request body.

---

## Database Schema (Prisma)

Source: `backend/prisma/schema.prisma`

```
User ──< Transaction  (type: INCOME|EXPENSE, amount Decimal, categoryId, accountId, date)
     ──< Category     (name, type: INCOME|EXPENSE) — unique per (userId, name, type)
     ──< Account      (name, balance Decimal)       — unique per (userId, name)
     ──< Budget       (categoryId, amount, month, year) — unique per (userId, categoryId, month, year)
```

All cascade-delete on User. Amount fields use `Decimal(15,2)` — never use JS `number` for money.

---

## Environment Setup

Copy `.env.example` → `.env` in each package:

**backend/.env**
```
DATABASE_URL="mysql://root:@localhost:3306/finance_tracker"
JWT_SECRET="change-this-secret"
JWT_EXPIRES_IN="7d"
PORT=5000
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
```

**frontend/.env**
```
VITE_API_URL=http://localhost:5000
```

---

## Development Phases

**Phase 1 (MVP):** Auth → DB migrations → Transaction CRUD → Categories → Dashboard  
**Phase 2:** Account management → Budget → Reports → Export (CSV/Excel/PDF)  
**Phase 3:** Recurring transactions → AI financial analysis → Mobile API

---

## Git Convention

```
feat: add transaction creation flow
fix: correct balance calculation on account update
refactor: extract budget service from controller
docs: update API route documentation
chore: upgrade Prisma to v5
```

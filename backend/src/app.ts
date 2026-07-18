import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import path from 'path'
import authRouter        from './modules/auth/auth.routes'
import categoryRouter    from './modules/categories/categories.routes'
import accountRouter     from './modules/accounts/accounts.routes'
import transactionRouter from './modules/transactions/transactions.routes'
import budgetRouter      from './modules/budgets/budgets.routes'
import reportRouter      from './modules/reports/reports.routes'
import debtRouter        from './modules/debts/debts.routes'
import receiptRouter     from './modules/receipts/receipts.routes'
import { logAccess, logError, logInfo } from './utils/logger'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')))

// HTTP access logger
app.use(morgan((tokens, req, res) => {
  const method = tokens.method(req, res) ?? '-'
  const url    = tokens.url(req, res)    ?? '-'
  const status = Number(tokens.status(req, res) ?? 0)
  const ms     = Math.round(Number(tokens['response-time'](req, res) ?? 0))
  logAccess(method, url, status, ms)
  return null  // suppress morgan's own output
}))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth',         authRouter)
app.use('/api/categories',   categoryRouter)
app.use('/api/accounts',     accountRouter)
app.use('/api/transactions', transactionRouter)
app.use('/api/budgets',      budgetRouter)
app.use('/api/reports',      reportRouter)
app.use('/api/debts',        debtRouter)
app.use('/api/receipts',     receiptRouter)

// 404 handler
app.use((req: Request, res: Response) => {
  logError('404', new Error(`Route tidak ditemukan: ${req.method} ${req.originalUrl}`))
  res.status(404).json({ success: false, message: 'Route tidak ditemukan' })
})

// Global error handler
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number; statusCode?: number })?.status
    ?? (err as { status?: number; statusCode?: number })?.statusCode
    ?? 500
  const message = err instanceof Error ? err.message : 'Internal server error'

  logError(`${req.method} ${req.originalUrl}`, err)

  res.status(status).json({ success: false, message })
})

app.listen(PORT, () => {
  logInfo(`Server berjalan di http://localhost:${PORT}`)
  logInfo(`Environment: ${process.env.NODE_ENV ?? 'development'}`)
})

export default app

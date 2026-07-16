import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
import authRouter from './modules/auth/auth.routes'
import categoryRouter from './modules/categories/categories.routes'
import accountRouter from './modules/accounts/accounts.routes'
import transactionRouter from './modules/transactions/transactions.routes'
import budgetRouter  from './modules/budgets/budgets.routes'
import reportRouter  from './modules/reports/reports.routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/accounts', accountRouter)
app.use('/api/transactions', transactionRouter)
app.use('/api/budgets', budgetRouter)
app.use('/api/reports', reportRouter)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app

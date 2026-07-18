import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from './components/DashboardLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { TransactionsPage } from './pages/transactions/TransactionsPage'
import { IncomePage } from './pages/income/IncomePage'
import { ExpensesPage } from './pages/expenses/ExpensesPage'
import { ProfilePage } from './pages/profile/ProfilePage'
import { CategoriesPage } from './pages/settings/CategoriesPage'
import { AccountsPage } from './pages/settings/AccountsPage'
import { DebtsPage } from './pages/debts/DebtsPage'
import { WishlistPage } from './pages/wishlist/WishlistPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes — accessible without login */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />

        {/* Protected routes — redirect to login if not authenticated */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/income" element={<IncomePage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings/categories" element={<CategoriesPage />} />
            <Route path="/settings/accounts" element={<AccountsPage />} />
            <Route path="/debts" element={<DebtsPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

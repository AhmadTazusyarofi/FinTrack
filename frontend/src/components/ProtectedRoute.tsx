import { Navigate, Outlet } from 'react-router-dom'
import { isAuthenticated } from '../services/auth.service'
import { PeriodProvider } from '../features/period/PeriodProvider'

export function ProtectedRoute() {
  return isAuthenticated() ? <PeriodProvider><Outlet /></PeriodProvider> : <Navigate to="/auth/login" replace />
}

import api from './api'

export interface AuthUser {
  id: string
  name: string
  email: string
  foto_profil?: string | null
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<{ data: AuthResponse }>('/auth/login', { email, password })
  return res.data.data
}

export async function registerRequest(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<{ data: AuthResponse }>('/auth/register', { name, email, password })
  return res.data.data
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token')
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, LogOut, UserCircle } from 'lucide-react'
import { clearAuth, getStoredUser } from '../services/auth.service'
import { useTheme } from '../contexts/ThemeContext'
import { UserAvatar } from './UserAvatar'

export function MobilePageHeader({ title }: { title: string }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const user = getStoredUser()
  const { isDark, toggleTheme } = useTheme()

  function handleLogout() {
    clearAuth()
    navigate('/auth/login', { replace: true })
  }

  return (
    <header
      className="sticky top-0 z-40 border-b px-4 pb-3.5 flex items-center justify-between dark:border-white/5"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
        background: isDark ? 'rgba(15, 17, 23, 0.90)' : 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(226,232,240,0.80)',
      }}
    >
      <h1 className="text-lg font-extrabold text-[#001e1d] dark:text-white tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="relative w-9 h-9 rounded-full bg-slate-50 dark:bg-white/10 flex items-center justify-center transition-colors"
        >
          {isDark
            ? <Sun className="w-4 h-4 text-[#f9bc60]" strokeWidth={2} />
            : <Moon className="w-4 h-4 text-[#004643]" strokeWidth={2} />
          }
        </button>

        {/* Avatar + logout */}
        <div className="relative">
          <button onClick={() => setOpen(!open)}>
            <UserAvatar user={user} size="sm" />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-xl border border-slate-100 dark:border-white/5 z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 dark:border-white/5">
                  <p className="text-xs font-bold text-[#001e1d] dark:text-white truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setOpen(false); navigate('/profile') }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-[#001e1d] dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-slate-400" />
                  Profil Saya
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-[#e16162] hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

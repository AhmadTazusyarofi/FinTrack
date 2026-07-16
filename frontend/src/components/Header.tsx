import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, ChevronDown, Menu, LogOut } from 'lucide-react'
import { clearAuth, getStoredUser } from '../services/auth.service'

interface HeaderProps {
  title: string
  onMenuClick: () => void
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const user = getStoredUser()

  function handleLogout() {
    clearAuth()
    navigate('/auth/login', { replace: true })
  }

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <header className="flex items-center justify-between gap-3 mb-6 sm:mb-8 shrink-0">

      {/* Left: Hamburger (mobile) + Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl bg-white/70 hover:bg-white text-brand-bg transition-all shadow-sm shrink-0"
          aria-label="Buka menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-brand-bg tracking-tight truncate">
          {title}
        </h1>
      </div>

      {/* Right: Search + Bell + Profile */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Search — hidden on small mobile, visible sm+ */}
        <div className="relative hidden sm:block w-40 md:w-56 lg:w-64">
          <input
            type="text"
            placeholder="Cari disini..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white/70 hover:bg-white focus:bg-white text-brand-stroke placeholder-brand-stroke/40 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-brand-bg/20 text-sm font-medium transition-all duration-300 shadow-sm"
          />
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-stroke/60 pointer-events-none" />
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 sm:p-2.5 bg-white/75 hover:bg-white text-brand-bg hover:text-brand-stroke rounded-full transition-all duration-300 shadow-sm group">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:rotate-12" />
          <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-brand-tertiary rounded-full ring-2 ring-brand-main" />
        </button>

        {/* Divider — hidden on small screens */}
        <div className="hidden sm:block h-8 w-px bg-brand-stroke/10" />

        {/* Profile + Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 sm:gap-3 group select-none"
          >
            {/* Avatar initials */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-bg flex items-center justify-center ring-2 ring-brand-bg/10 group-hover:ring-brand-bg/30 transition-all duration-300 shadow-sm shrink-0">
              <span className="text-xs sm:text-sm font-extrabold text-brand-highlight">{initials}</span>
            </div>
            <div className="hidden md:flex flex-col text-left">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-brand-stroke group-hover:text-brand-bg transition-colors duration-300 max-w-[120px] truncate">
                  {user?.name ?? 'User'}
                </span>
                <ChevronDown className={`w-4 h-4 text-brand-stroke/60 transition-all duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </div>
              <span className="text-xs font-semibold text-brand-stroke/50 -mt-0.5">
                {user?.email?.split('@')[0] ?? ''}
              </span>
            </div>
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-brand-stroke/5 z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-brand-stroke/5">
                  <p className="text-xs font-bold text-brand-stroke truncate">{user?.name}</p>
                  <p className="text-[10px] text-brand-stroke/40 font-semibold truncate mt-0.5">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-brand-tertiary hover:bg-red-50 transition-colors"
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

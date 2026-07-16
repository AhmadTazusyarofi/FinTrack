import { NavLink } from 'react-router-dom'
import { LayoutGrid, Receipt, ArrowDownCircle, ArrowUpCircle, TrendingUp, X } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const menuItems = [
  { name: 'Dashboard',    path: '/dashboard',    icon: LayoutGrid },
  { name: 'Transaksi',    path: '/transactions', icon: Receipt },
  { name: 'Pemasukan',    path: '/income',       icon: ArrowDownCircle },
  { name: 'Pengeluaran',  path: '/expenses',     icon: ArrowUpCircle },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 h-full lg:h-auto
        z-40 lg:z-auto
        w-64 shrink-0
        bg-brand-bg text-brand-paragraph flex flex-col p-6 select-none
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-10 mt-2">
        <div className="flex items-center gap-3">
          <div className="bg-brand-button text-brand-button-text p-2.5 rounded-xl shadow-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-wide text-brand-headline leading-tight">Finance</span>
            <span className="text-sm font-semibold tracking-wider text-brand-paragraph leading-none opacity-80">Tracker</span>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-brand-paragraph/50 hover:text-brand-headline hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl font-medium tracking-wide transition-all duration-300 group ${
                  isActive
                    ? 'text-[#f9bc60] bg-white/10 shadow-md font-semibold'
                    : 'text-brand-paragraph hover:text-brand-headline hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                    isActive ? 'text-[#f9bc60] stroke-[2.5]' : 'text-brand-paragraph group-hover:text-brand-headline'
                  }`} />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="pt-6 border-t border-white/10 text-xs text-brand-paragraph/50">
        <p>&copy; 2026 Finance Tracker</p>
      </div>
    </aside>
  )
}

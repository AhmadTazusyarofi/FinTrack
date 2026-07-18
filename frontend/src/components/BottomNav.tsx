import { NavLink } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

const navItems = [
  { path: '/dashboard',    icon: '/assets/collage.png',     alt: 'Beranda' },
  { path: '/transactions', icon: '/assets/transaction.png', alt: 'Transaksi' },
  { path: '/income',       icon: '/assets/wallet.png',      alt: 'Pemasukan' },
  { path: '/expenses',     icon: '/assets/list.png',        alt: 'Pengeluaran' },
  { path: '/wishlist',     icon: '/assets/wishlist.png',    alt: 'Wishlist' },
]

export function BottomNav() {
  const { isDark } = useTheme()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="mx-auto max-w-screen-sm px-4 pb-4 pointer-events-auto">
        <nav
          className="flex items-center justify-around border py-3 px-2"
          style={{
            borderRadius: '39px',
            background: isDark ? 'rgba(15, 17, 23, 0.75)' : 'rgba(255, 255, 255, 0.18)',
            backdropFilter: 'blur(45px) saturate(180%)',
            WebkitBackdropFilter: 'blur(45px) saturate(180%)',
            boxShadow: '0 4px 25px rgba(0,0,0,0.12)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.40)',
          }}
        >
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className="flex-1 flex justify-center">
              {({ isActive }) => (
                <div className="p-2.5">
                  <img
                    src={item.icon}
                    alt={item.alt}
                    className="w-6 h-6 object-contain transition-all duration-200"
                    style={{
                      filter: isActive
                        ? 'brightness(0) invert(27%) sepia(100%) saturate(500%) hue-rotate(140deg) brightness(47%)'
                        : isDark
                          ? 'brightness(0) invert(70%)'
                          : 'brightness(0) invert(55%)',
                    }}
                  />
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

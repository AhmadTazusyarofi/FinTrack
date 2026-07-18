import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { MobilePageHeader } from './MobilePageHeader'

const PAGE_TITLES: Record<string, string> = {
  '/transactions': 'Transaksi',
  '/income': 'Pemasukan',
  '/expenses': 'Pengeluaran',
  '/wishlist': 'Wishlist',
}

export function DashboardLayout() {
  const { pathname } = useLocation()
  const pageTitle = PAGE_TITLES[pathname]

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0f1117] font-sans">
      <div className="mx-auto max-w-screen-sm min-h-screen bg-white dark:bg-[#0f1117] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.06)]">
        {pageTitle && <MobilePageHeader title={pageTitle} />}
        <main className={`flex-1 pb-28 no-scrollbar ${pageTitle ? 'px-4 pt-4' : ''}`}>
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

export default DashboardLayout

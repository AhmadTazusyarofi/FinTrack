import { Link } from 'react-router-dom'

interface Props {
  payday: number | null
  loading: boolean
  error: string
  onRetry: () => void
  children: React.ReactNode
}

/** Settings are optional: neither an unset payday nor a failed request blocks routes. */
export function PeriodAccess({ payday, loading, error, onRetry, children }: Props) {
  return <>
    {(error || (!loading && payday === null)) && (
      <aside className="mx-auto max-w-screen-sm bg-amber-50 dark:bg-[#24251c] px-5 py-3 text-sm text-amber-950 dark:text-amber-100" aria-label="Pengaturan periode gaji">
        <p role="status">{error || 'Tanggal gajian belum diatur. Sementara, perhitungan mengikuti bulan kalender mulai tanggal 1.'}</p>
        {error && payday === null && <p className="mt-1">Sementara menggunakan periode mulai tanggal 1.</p>}
        <div className="mt-2 flex flex-wrap gap-4 font-semibold">
          <Link to="/profile#periode-gaji" className="underline">Atur tanggal gajian</Link>
          {error && <button disabled={loading} onClick={onRetry} className="underline disabled:opacity-50">{loading ? 'Memuat…' : 'Coba lagi'}</button>}
        </div>
      </aside>
    )}
    {children}
  </>
}

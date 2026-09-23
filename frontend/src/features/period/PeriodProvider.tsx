import { createContext, Fragment, useContext, useEffect, useRef, useState } from 'react'
import api from '../../services/api'
import { activePeriod } from './payPeriod'
import { PeriodAccess } from './PeriodAccess'

interface PeriodContextValue {
  payday: number | null
  month: number
  year: number
  save: (day: number) => Promise<void>
}
const PeriodContext = createContext<PeriodContextValue | null>(null)

export function usePayPeriod() {
  const value = useContext(PeriodContext)
  if (!value) throw new Error('PeriodProvider diperlukan')
  return value
}

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [payday, setPayday] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const settingsVersion = useRef(0)

  useEffect(() => {
    let cancelled = false
    const load = (initial: boolean) => {
      const version = ++settingsVersion.current
      if (initial) { setLoading(true); setError('') }
      api.get<{ data: { payday: number | null } }>('/period', { timeout: 10_000 })
        .then(res => { if (!cancelled && version === settingsVersion.current) { setPayday(res.data.data.payday); setNow(new Date()); setError('') } })
        .catch(() => { if (!cancelled && version === settingsVersion.current) setError('Pengaturan periode belum dapat dimuat. Kamu tetap bisa menggunakan aplikasi dan mencoba lagi.') })
        .finally(() => { if (!cancelled && version === settingsVersion.current) setLoading(false) })
    }
    load(true)
    const onFocus = () => load(false)
    window.addEventListener('focus', onFocus)
    return () => { cancelled = true; window.removeEventListener('focus', onFocus) }
  }, [retry])

  useEffect(() => {
    const refresh = () => setNow(new Date())
    const timer = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])

  async function save(day: number) {
    ++settingsVersion.current
    try {
      const res = await api.put<{ data: { payday: number } }>('/period', { payday: day }, { timeout: 10_000 })
      setPayday(res.data.data.payday)
      setError('')
      setNow(new Date())
    } finally {
      ++settingsVersion.current
      setLoading(false)
    }
  }

  const current = activePeriod(payday ?? 1, now)
  return (
    <PeriodContext.Provider value={{ payday, ...current, save }}>
      <PeriodAccess payday={payday} loading={loading} error={error} onRetry={() => setRetry(v => v + 1)}>
        <Fragment key={`${payday ?? 1}-${current.year}-${current.month}`}>{children}</Fragment>
      </PeriodAccess>
    </PeriodContext.Provider>
  )
}

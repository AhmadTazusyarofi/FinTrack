import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']

interface Props {
  month: number | ''
  year: number | ''
  onChange: (month: number | '', year: number | '') => void
  allowAll?: boolean
  align?: 'left' | 'right'
}

export function MonthYearPicker({ month, year, onChange, allowAll = false, align = 'left' }: Props) {
  const now = new Date()
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(() => year !== '' ? Number(year) : now.getFullYear())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && year !== '') setPickerYear(Number(year))
  }, [open, year])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const label = month !== '' && year !== ''
    ? `${MONTHS_SHORT[Number(month) - 1]} ${year}`
    : 'Semua Periode'

  const handleSelect = (m: number) => {
    onChange(m, pickerYear)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 bg-white dark:bg-white/5 border border-brand-stroke/5 dark:border-white/10 rounded-xl text-xs font-bold text-brand-stroke dark:text-white px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm whitespace-nowrap"
      >
        {label}
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className={`absolute top-full mt-1.5 z-50 bg-white dark:bg-[#1a1f2e] border border-brand-stroke/5 dark:border-white/10 rounded-2xl shadow-xl p-3 w-52 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setPickerYear(y => Math.max(2020, y - 1))}
              disabled={pickerYear <= 2020}
              className="p-1 rounded-lg text-brand-stroke/50 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-brand-stroke dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-extrabold text-brand-stroke dark:text-white">{pickerYear}</span>
            <button
              onClick={() => setPickerYear(y => Math.min(now.getFullYear(), y + 1))}
              disabled={pickerYear >= now.getFullYear()}
              className="p-1 rounded-lg text-brand-stroke/50 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-brand-stroke dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1">
            {MONTHS_SHORT.map((name, i) => {
              const m = i + 1
              const isFuture = pickerYear === now.getFullYear() && m > now.getMonth() + 1
              const isSelected = Number(month) === m && Number(year) === pickerYear
              return (
                <button
                  key={m}
                  onClick={() => !isFuture && handleSelect(m)}
                  disabled={isFuture}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    isSelected
                      ? 'bg-brand-bg text-brand-headline shadow-sm'
                      : isFuture
                      ? 'text-brand-stroke/20 dark:text-slate-600 cursor-not-allowed'
                      : 'text-brand-stroke/60 dark:text-slate-400 hover:bg-brand-stroke/5 dark:hover:bg-white/10 hover:text-brand-stroke dark:hover:text-white'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>

          {allowAll && (
            <button
              onClick={() => { onChange('', ''); setOpen(false) }}
              className={`w-full mt-2 py-1.5 text-xs font-bold rounded-xl transition-all border ${
                month === ''
                  ? 'bg-brand-bg/10 border-brand-bg/20 text-brand-bg'
                  : 'border-brand-stroke/5 dark:border-white/10 text-brand-stroke/50 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-brand-stroke dark:hover:text-white'
              }`}
            >
              Semua Periode
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default MonthYearPicker

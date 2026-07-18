import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, X, Loader2, CheckCircle2, AlertCircle, ScanLine, FileText, Tag, Wallet, Calendar, ZapOff } from 'lucide-react'
import { Category, Account } from '../types'
import { scanReceipt, ScanResult } from '../services/receiptService'
import { createTransaction } from '../services/transactionService'

const todayStr = () => new Date().toISOString().split('T')[0]

const CATEGORY_HINT_MAP: Record<string, string[]> = {
  'Makanan & Minuman': ['makan', 'minum', 'food', 'kuliner', 'resto', 'cafe', 'kopi', 'bakery'],
  'Transportasi': ['transport', 'bensin', 'parkir', 'tol', 'ojek', 'grab', 'gojek'],
  'Belanja': ['belanja', 'shop', 'mart', 'supermarket', 'minimarket', 'indomaret', 'alfamart'],
  'Kesehatan': ['apotek', 'obat', 'klinik', 'rumah sakit', 'dokter', 'health'],
  'Hiburan': ['hiburan', 'bioskop', 'game', 'entertainment', 'hotel'],
  'Pendidikan': ['pendidikan', 'sekolah', 'kursus', 'buku', 'education'],
  'Tagihan': ['tagihan', 'listrik', 'air', 'internet', 'telepon', 'bill'],
}

function matchCategory(hint: string, categories: Category[]): string {
  const keywords = CATEGORY_HINT_MAP[hint] ?? []
  for (const cat of categories) {
    const nameLower = cat.name.toLowerCase()
    if (keywords.some(kw => nameLower.includes(kw))) return cat.id
    if (nameLower.includes(hint.toLowerCase())) return cat.id
  }
  return categories[0]?.id ?? ''
}

interface Props {
  categories: Category[]
  accounts: Account[]
  onClose: () => void
  onSaved: () => void
}

type Phase = 'pick' | 'camera' | 'scanning' | 'review' | 'saving' | 'done' | 'error'

export function ScanReceiptModal({ categories, accounts, onClose, onSaved }: Props) {
  const fileRef  = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [phase, setPhase] = useState<Phase>('pick')
  const [preview, setPreview] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [cameraError, setCameraError] = useState('')

  const [form, setForm] = useState({
    amount: '',
    description: '',
    date: todayStr(),
    categoryId: categories[0]?.id ?? '',
    accountId: accounts[0]?.id ?? '',
  })

  // stop stream on unmount or phase change away from camera
  useEffect(() => {
    return () => { stopStream() }
  }, [])

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  async function startCamera() {
    setCameraError('')
    setPhase('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setCameraError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.')
    }
  }

  function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(video, 0, 0)

    canvas.toBlob(blob => {
      if (!blob) return
      stopStream()
      const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' })
      handleFile(file)
    }, 'image/jpeg', 0.92)
  }

  function cancelCamera() {
    stopStream()
    setPhase('pick')
    setCameraError('')
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Hanya file gambar yang didukung (JPG, PNG, WEBP, HEIC)')
      setPhase('error')
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    setPhase('scanning')
    try {
      const result = await scanReceipt(file)
      setScanResult(result)
      setForm({
        amount: result.amount > 0 ? String(result.amount) : '',
        description: result.merchant
          ? `${result.description} — ${result.merchant}`
          : result.description,
        date: result.date ?? todayStr(),
        categoryId: matchCategory(result.categoryHint, categories),
        accountId: accounts[0]?.id ?? '',
      })
      setPhase('review')
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      setErrorMsg(e?.response?.data?.message ?? e?.message ?? 'Gagal memindai struk')
      setPhase('error')
    }
  }

  async function handleSave() {
    const amount = Number(form.amount)
    if (!amount || amount <= 0) {
      setErrorMsg('Jumlah tidak valid. Masukkan nominal yang benar.')
      setPhase('error')
      return
    }
    if (!form.categoryId) {
      setErrorMsg('Pilih kategori terlebih dahulu.')
      setPhase('error')
      return
    }
    if (!form.accountId) {
      setErrorMsg('Pilih rekening terlebih dahulu.')
      setPhase('error')
      return
    }

    // Pastikan description tidak kosong (backend menolak string kosong)
    const description =
      form.description.trim() ||
      (scanResult?.merchant ? `Belanja di ${scanResult.merchant}` : null) ||
      scanResult?.categoryHint ||
      'Pengeluaran'

    setPhase('saving')
    try {
      await createTransaction({
        type: 'EXPENSE',
        amount,
        description,
        date: form.date,
        categoryId: form.categoryId,
        accountId: form.accountId,
      })
      setPhase('done')
      setTimeout(() => { onSaved(); onClose() }, 1200)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      setErrorMsg(e?.response?.data?.message ?? e?.message ?? 'Gagal menyimpan transaksi')
      setPhase('error')
    }
  }

  const isReview = phase === 'review'

  // ── Camera Viewfinder (fullscreen) ────────────────────────────────────────
  if (phase === 'camera') {
    return (
      <div className="fixed inset-0 z-[10000] bg-black flex flex-col">
        {/* Video stream */}
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Guide overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {/* Top dark area */}
            <div className="w-full flex-1 bg-black/55" />

            {/* Middle row: left dark | frame | right dark */}
            <div className="flex w-full items-stretch" style={{ height: '58%' }}>
              <div className="bg-black/55" style={{ width: '8%' }} />

              {/* Receipt bounding frame */}
              <div className="relative flex-1 rounded-2xl">
                {/* Corner markers — top-left */}
                <div className="absolute top-0 left-0 w-8 h-[3px] bg-white rounded-r-full" />
                <div className="absolute top-0 left-0 w-[3px] h-8 bg-white rounded-b-full" />
                {/* Corner markers — top-right */}
                <div className="absolute top-0 right-0 w-8 h-[3px] bg-white rounded-l-full" />
                <div className="absolute top-0 right-0 w-[3px] h-8 bg-white rounded-b-full" />
                {/* Corner markers — bottom-left */}
                <div className="absolute bottom-0 left-0 w-8 h-[3px] bg-white rounded-r-full" />
                <div className="absolute bottom-0 left-0 w-[3px] h-8 bg-white rounded-t-full" />
                {/* Corner markers — bottom-right */}
                <div className="absolute bottom-0 right-0 w-8 h-[3px] bg-white rounded-l-full" />
                <div className="absolute bottom-0 right-0 w-[3px] h-8 bg-white rounded-t-full" />
              </div>

              <div className="bg-black/55" style={{ width: '8%' }} />
            </div>

            {/* Bottom dark area + hint text */}
            <div className="w-full flex-1 bg-black/55 flex items-start justify-center pt-3">
              <div className="bg-black/60 px-4 py-1.5 rounded-full">
                <p className="text-white/80 text-xs font-medium">Posisikan struk di dalam bingkai</p>
              </div>
            </div>
          </div>

          {/* Camera error */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-8">
              <ZapOff className="w-10 h-10 text-red-400" />
              <p className="text-white text-sm font-medium text-center">{cameraError}</p>
              <button
                onClick={cancelCamera}
                className="px-6 py-2.5 bg-white text-black rounded-xl text-sm font-bold"
              >
                Kembali
              </button>
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div className="bg-black px-8 pt-6 pb-10 flex items-center justify-between shrink-0">
          {/* Cancel */}
          <button
            onClick={cancelCamera}
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Capture button */}
          <button
            onClick={capturePhoto}
            disabled={!!cameraError}
            className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
            style={{ width: 72, height: 72 }}
          >
            <div className="w-14 h-14 rounded-full bg-white" />
          </button>

          {/* Spacer */}
          <div className="w-12 h-12" />
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  // ── Normal modal ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 pt-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#1a1f2e] rounded-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 120px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-tertiary/10 flex items-center justify-center shrink-0">
              <ScanLine className="w-4 h-4 text-brand-tertiary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-brand-stroke dark:text-white">Scan Struk</h3>
              <p className="text-xs text-brand-stroke/40 dark:text-slate-400 font-medium mt-0.5">
                {isReview ? 'Periksa dan sesuaikan hasil scan' : 'Catat pengeluaran otomatis dari foto'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-brand-stroke/40 dark:text-slate-500 hover:text-brand-stroke dark:hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5">

          {/* Phase: pick */}
          {phase === 'pick' && (
            <div className="space-y-3">
              <p className="text-sm text-brand-stroke/50 dark:text-slate-400 text-center mb-4">
                Ambil foto struk belanja atau unggah dari galeri
              </p>
              <button
                onClick={startCamera}
                className="w-full flex items-center gap-3 px-4 py-4 bg-brand-tertiary text-white rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <Camera className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <div className="font-bold">Ambil Foto</div>
                  <div className="text-[11px] text-white/70">Kamera dengan bingkai panduan struk</div>
                </div>
              </button>
              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.removeAttribute('capture')
                    fileRef.current.click()
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-4 bg-slate-50 dark:bg-white/5 text-brand-stroke dark:text-white rounded-2xl font-semibold text-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-brand-stroke/10 dark:border-white/10"
              >
                <Upload className="w-5 h-5 shrink-0 text-brand-stroke/40 dark:text-slate-400" />
                <div className="text-left">
                  <div className="font-bold">Pilih dari Galeri</div>
                  <div className="text-[11px] text-brand-stroke/40 dark:text-slate-400">JPG, PNG, WEBP, HEIC</div>
                </div>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                  e.target.value = ''
                }}
              />
            </div>
          )}

          {/* Phase: scanning */}
          {phase === 'scanning' && (
            <div className="flex flex-col items-center gap-4 py-6">
              {preview && (
                <img src={preview} alt="Struk" className="w-32 h-32 object-cover rounded-2xl shadow-md border border-brand-stroke/10 dark:border-white/10" />
              )}
              <div className="flex items-center gap-2 text-brand-tertiary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-semibold">Membaca struk...</span>
              </div>
              <p className="text-xs text-brand-stroke/40 dark:text-slate-400 text-center">AI sedang menganalisis struk belanja Anda</p>
            </div>
          )}

          {/* Phase: review */}
          {phase === 'review' && (
            <div className="space-y-5">
              {preview && (
                <div className="flex justify-center">
                  <img src={preview} alt="Struk" className="w-20 h-20 object-cover rounded-xl shadow-sm border border-brand-stroke/10 dark:border-white/10" />
                </div>
              )}
              {scanResult && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-4 py-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    Struk berhasil dibaca — periksa dan sesuaikan jika perlu
                  </p>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  Nominal
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-brand-stroke/40 dark:text-slate-500">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={form.amount ? new Intl.NumberFormat('id-ID').format(Number(form.amount)) : ''}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/\D/g, '') }))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-bg/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  <FileText className="w-3 h-3 inline mr-1" />
                  Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Deskripsi pengeluaran"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-bg/20 focus:bg-white transition-all placeholder-brand-stroke/25 dark:placeholder-slate-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  <Tag className="w-3 h-3 inline mr-1" />
                  Kategori
                </label>
                <select
                  value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-bg/20 focus:bg-white transition-all appearance-none"
                >
                  <option value="">Pilih kategori...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  <Wallet className="w-3 h-3 inline mr-1" />
                  Rekening
                </label>
                <select
                  value={form.accountId}
                  onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-bg/20 focus:bg-white transition-all appearance-none"
                >
                  <option value="">Pilih rekening...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-brand-stroke/40 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Tanggal
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-bg/20 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {/* Phase: saving */}
          {phase === 'saving' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-brand-tertiary" />
              <p className="text-sm font-semibold text-brand-stroke/50 dark:text-slate-400">Menyimpan transaksi...</p>
            </div>
          )}

          {/* Phase: done */}
          {phase === 'done' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="text-sm font-bold text-brand-stroke dark:text-white">Transaksi berhasil disimpan!</p>
            </div>
          )}

          {/* Phase: error */}
          {phase === 'error' && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center gap-3 py-4">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="text-sm font-semibold text-brand-stroke/60 dark:text-slate-300 text-center">{errorMsg}</p>
              </div>
              <div className="flex gap-3">
                {scanResult && (
                  <button
                    onClick={() => { setPhase('review'); setErrorMsg('') }}
                    className="flex-1 py-3 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke/60 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white text-sm font-bold transition-all"
                  >
                    Kembali ke Form
                  </button>
                )}
                <button
                  onClick={() => { setPhase('pick'); setPreview(null); setScanResult(null); setErrorMsg('') }}
                  className="flex-1 py-3 rounded-xl bg-brand-tertiary text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
                >
                  Scan Ulang
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer — review only */}
        {isReview && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 shrink-0 flex gap-3">
            <button
              onClick={() => { setPhase('pick'); setPreview(null); setScanResult(null) }}
              className="flex-1 py-3 rounded-xl border border-brand-stroke/10 dark:border-white/10 text-brand-stroke/60 dark:text-slate-400 hover:text-brand-stroke dark:hover:text-white hover:border-brand-stroke/20 dark:hover:border-white/20 text-sm font-bold transition-all"
            >
              Scan Ulang
            </button>
            <button
              onClick={handleSave}
              disabled={!form.amount || Number(form.amount) <= 0}
              className="flex-1 py-3 rounded-xl bg-brand-bg text-brand-headline text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
            >
              Simpan
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

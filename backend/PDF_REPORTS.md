# Laporan PDF

Di halaman **Transaksi**, pilih **Cetak PDF**, pilih **Periode gajian** atau
**Bulan kalender**, tentukan bulan dan tahun, lalu klik **Unduh PDF**.
Buka PDF tersebut untuk mencetaknya.

Periode gajian mengikuti tanggal di profil. Jika belum diatur, digunakan tanggal 1.
Bulan pilihan adalah bulan awal periode. Tanggal 29–31 mengikuti akhir bulan
jika tanggal tersebut tidak tersedia. Bulan kalender selalu memakai seluruh bulan.

Laporan memuat pemasukan, pengeluaran, selisih arus kas, ringkasan kategori,
dan seluruh rincian transaksi pada rentang pilihan. Filter pencarian/jenis pada
daftar transaksi tidak membatasi isi PDF. Selisih bukan saldo rekening.

## Deploy

Setelah kode dan package-lock.json terbaru disalin ke server:

```bash
cd /home/sdp/bruki-dev/backend
npm ci
npm run build
pm2 restart finance-backend --update-env
```

Build ulang frontend dan publikasikan isi folder dist sesuai deployment frontend:

```bash
cd frontend
npm ci
npm run build
```

Tidak ada migrasi database baru untuk fitur PDF. PDFKit dan font dibawa sebagai
dependency backend; server tidak membutuhkan Chrome, Python, atau Poppler.

## API dan pemeriksaan

`GET /api/reports/pdf?mode=salary&month=9&year=2026`

`mode` menerima `salary` atau `calendar`. Bulan 1–12, tahun 2000–2100.
Endpoint membutuhkan JWT dan hanya mengambil transaksi pengguna yang login.
PDF dibuat dalam memori, tidak disimpan sebagai file publik, dan memakai
header `Cache-Control: private, no-store`.

Jalankan `npm run test:reports` dari backend untuk menguji nominal desimal,
rentang periode, pembatasan pengguna, validasi, serta PDF kosong dan panjang.
Pengujian memakai data fiktif dan menghasilkan contoh PDF di
`output/pdf/contoh-laporan-bukukasku.pdf` pada root project.

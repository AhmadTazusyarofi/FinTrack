# Periode gaji

Pengguna baru dan lama tetap dapat masuk tanpa memilih tanggal gajian. Selama belum diatur, perhitungan memakai tanggal 1 (bulan kalender). Pilihan tanggal 1–31 tersedia di Profil. Pilihan disimpan di `users.payday` dan bisa diubah melalui Profil → Periode Gaji. Tidak ada input rentang tanggal. Periode aktif dipilih otomatis menurut tanggal lokal perangkat; API juga menghitung periode aktif bila bulan/tahun tidak diberikan (tanggal lokal server).

Tanggal transaksi tidak berubah. Tanggal gajian adalah awal periode inklusif; awal periode berikutnya eksklusif. Untuk tanggal 29–31 yang tidak tersedia, gunakan hari terakhir bulan tersebut. Label bulan/tahun pada filter riwayat dan kunci anggaran merujuk bulan **mulai** periode.

Dashboard, laporan tahunan, transaksi, pemasukan, pengeluaran, serta pengeluaran terhadap anggaran memakai batas yang sama. Mengubah tanggal menghitung ulang pengelompokan riwayat; nominal dan tanggal transaksi serta nominal anggaran tidak diubah. Saldo rekening tetap saldo keseluruhan, bukan saldo per periode.

## Deploy ke server PM2

Unggah perubahan backend dan frontend, lalu jalankan di server:

```bash
cd /home/sdp/bruki-dev/backend
npm run build
node dist/database/migrations/payday.js
pm2 restart finance-backend --update-env
```

Migrasi hanya menambah kolom nullable `users.payday`, bisa dijalankan ulang, dan harus selesai sebelum backend baru dipakai. Gunakan akun database yang memiliki izin ALTER untuk migrasi. Koneksi memakai DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME dari `.env` folder backend (pada server ini port database 3310). Tidak perlu mengimpor ulang dump atau menghapus data. Untuk pengembangan: `npm run migrate:payday`.

Restart Vite untuk development. Untuk produksi, build ulang frontend dan unggah hasil `dist`; pastikan `VITE_API_URL` pada `.env.production` mengarah ke domain backend yang benar. Deploy frontend setelah migrasi dan backend siap.

API: GET `/api/period` dan PUT `/api/period` dengan `{ "payday": 8 }`, keduanya membutuhkan JWT dan hanya membaca/mengubah pengguna yang sedang login. Nilai null menandai pengguna yang belum memilih. API laporan tetap mendukung fallback tanggal 1 untuk klien lama; frontend tidak menghalangi akses ketika pilihan belum diatur atau pengambilan pengaturan gagal. Jika kolom payday belum dimigrasikan, pembacaan tetap menggunakan bulan kalender; penyimpanan memberi respons 503 sampai migrasi selesai.

## Verifikasi

```bash
npm run test:period
npm run type-check
```

Tes mencakup pergantian tanggal gajian/tahun, bulan pendek dan tahun kabisat, konsistensi frontend/backend, batas query serta scoping user. Tes query memakai mock, bukan database produksi. Setelah deploy, login akun lama, pilih tanggal, cek transaksi sebelum/pada tanggal gajian dan ringkasan anggaran, lalu ubah pengaturan di profil.

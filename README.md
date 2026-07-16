# Finance Tracker

Aplikasi Progressive Web App (PWA) untuk mencatat, mengelola, dan menganalisis keuangan pribadi. Dibangun sebagai PWA sehingga dapat diinstal langsung di perangkat (Android/iOS/Desktop) dan diakses layaknya aplikasi native — tanpa perlu membuka browser. Pengguna dapat melacak pemasukan dan pengeluaran, mengatur anggaran per kategori, serta melihat ringkasan keuangan secara visual.

---

## Fitur

- **PWA** — dapat diinstal di perangkat Android, iOS, dan Desktop seperti aplikasi native
- **Autentikasi** — registrasi & login dengan JWT, sesi aman berbasis token
- **Dashboard** — ringkasan saldo, total pemasukan/pengeluaran, dan grafik transaksi
- **Transaksi** — tambah, lihat, dan hapus transaksi (pemasukan & pengeluaran)
- **Kategori** — kelola kategori transaksi sesuai kebutuhan
- **Anggaran** — atur batas anggaran per kategori per bulan
- **Pemasukan & Pengeluaran** — halaman terpisah dengan filter dan ringkasan

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Routing | React Router v6 |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Backend | Node.js + Express.js + TypeScript |
| ORM | Prisma v5 |
| Database | MySQL |

---

## Struktur Project

```
finance-tracker/
├── frontend/          # React SPA (Vite, port 3000)
│   └── src/
│       ├── pages/     # Halaman utama (dashboard, transaksi, dll)
│       ├── features/  # Modul per fitur (komponen, hooks, tipe)
│       ├── services/  # Axios instance + auth service
│       └── types/     # TypeScript types bersama
├── backend/           # Express API (port 5000)
│   ├── prisma/        # Schema & migrasi database
│   └── src/
│       ├── modules/   # Modul fitur (auth, transaksi, kategori, dll)
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       └── middleware/
└── package.json       # npm workspaces root
```

---

## Cara Menjalankan

### Prasyarat

- Node.js 18+
- MySQL (XAMPP atau sejenisnya)
- npm

### 1. Clone repository

```bash
git clone https://github.com/<username>/finance-tracker.git
cd finance-tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Buat file `.env` di folder `backend/`:

```env
DATABASE_URL="mysql://root:@localhost:3306/finance_tracker"
JWT_SECRET="ganti-dengan-secret-kamu"
JWT_EXPIRES_IN="7d"
PORT=5000
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
```

Buat file `.env` di folder `frontend/`:

```env
VITE_API_URL=http://localhost:5000
```

### 4. Setup database

Pastikan MySQL sudah berjalan, lalu jalankan migrasi:

```bash
cd backend
npm run migrate
```

Opsional — isi data awal (seed):

```bash
npm run seed
```

### 5. Jalankan aplikasi

Buka dua terminal:

```bash
# Terminal 1 — Backend
cd backend
npm run dev
```

```bash
# Terminal 2 — Frontend
cd frontend
npm run dev
```

Akses aplikasi di **http://localhost:3000**

---

## Scripts

```bash
# Frontend
npm run dev          # Dev server → http://localhost:3000
npm run build        # Build produksi
npm run type-check   # Cek TypeScript tanpa build

# Backend
npm run dev          # Nodemon + ts-node
npm run build        # Kompilasi ke dist/
npm run migrate      # Jalankan migrasi Prisma
npm run seed         # Isi data awal
npm run studio       # Buka Prisma Studio (GUI database)
```

---

## Lisensi

MIT

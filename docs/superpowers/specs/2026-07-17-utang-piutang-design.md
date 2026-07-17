# Spec: Utang Piutang Tracker

**Date:** 2026-07-17  
**Status:** Approved

---

## Overview

Fitur pencatatan hutang (saya hutang ke orang) dan piutang (orang hutang ke saya), lengkap dengan cicilan bertahap, integrasi saldo rekening, jatuh tempo, dan akses dari Dashboard.

---

## Data Model (MySQL)

Dua tabel baru — sudah dieksekusi oleh user.

### `debts`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | char(36) | UUID primary key |
| user_id | char(36) | FK → users.id (CASCADE DELETE) |
| type | enum('PAYABLE','RECEIVABLE') | PAYABLE = saya hutang, RECEIVABLE = orang hutang ke saya |
| person_name | varchar(255) | Nama bebas (tidak perlu kontak tersimpan) |
| amount | decimal(15,2) | Total hutang awal |
| paid_amount | decimal(15,2) | Total yang sudah dibayar (auto-update tiap cicilan) |
| due_date | date | Jatuh tempo (opsional) |
| note | text | Catatan (opsional) |
| status | enum('ACTIVE','SETTLED') | SETTLED otomatis saat paid_amount >= amount |
| created_at | datetime | |
| updated_at | datetime | ON UPDATE current_timestamp() |

### `debt_payments`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | char(36) | UUID primary key |
| debt_id | char(36) | FK → debts.id (CASCADE DELETE) |
| account_id | char(36) | FK → accounts.id |
| transaction_id | char(36) | FK → transactions.id (SET NULL on delete) |
| amount | decimal(15,2) | Jumlah cicilan |
| date | date | Tanggal cicilan |
| note | text | Catatan (opsional) |
| created_at | datetime | |

---

## Backend API

Mengikuti pola repository → service → controller → routes yang sudah ada di project.

### Endpoints

| Method | Path | Keterangan |
|---|---|---|
| GET | /api/debts | List hutang user (filter: type, status) |
| POST | /api/debts | Buat hutang baru |
| GET | /api/debts/:id | Detail hutang + riwayat cicilan |
| PATCH | /api/debts/:id | Edit person_name, due_date, note |
| DELETE | /api/debts/:id | Hapus hutang (cascade payments + transactions) |
| POST | /api/debts/:id/payments | Tambah cicilan |
| DELETE | /api/debts/:id/payments/:pid | Hapus cicilan |

### Logic `POST /api/debts/:id/payments` (satu DB transaction)
1. Validasi: amount tidak boleh melebihi sisa hutang (`amount - paid_amount`)
2. Insert ke `debt_payments`
3. Insert ke `transactions`:
   - `PAYABLE` → type = EXPENSE (saldo berkurang)
   - `RECEIVABLE` → type = INCOME (saldo bertambah)
4. Update `accounts.balance`:
   - `PAYABLE` → `balance - amount`
   - `RECEIVABLE` → `balance + amount`
5. Update `debts.paid_amount = paid_amount + amount`
6. Jika `paid_amount >= amount` → set `status = 'SETTLED'`

### Logic `DELETE /api/debts/:id/payments/:pid` (satu DB transaction)
1. Ambil data payment (amount, account_id, transaction_id)
2. Delete dari `debt_payments`
3. Delete dari `transactions` (saldo rekening otomatis ter-reverse oleh trigger balance)
4. Reverse balance rekening secara eksplisit (karena delete transaction tidak auto-reverse)
5. Update `debts.paid_amount = paid_amount - amount`
6. Jika status `SETTLED` → set kembali ke `ACTIVE`

### Logic `DELETE /api/debts/:id`
Hapus semua `debt_payments` + linked `transactions` (dengan reverse balance per payment) lalu hapus debt.

### File Baru
```
backend/src/modules/debts/
├── debts.repository.ts
├── debts.service.ts
├── debts.controller.ts
└── debts.routes.ts
```
Update `backend/src/app.ts` — mount `/api/debts`.

### Request Body

**POST /api/debts**
```json
{
  "type": "PAYABLE | RECEIVABLE",
  "personName": "string",
  "amount": "number",
  "dueDate": "YYYY-MM-DD | null",
  "note": "string | null"
}
```

**POST /api/debts/:id/payments**
```json
{
  "accountId": "string",
  "amount": "number",
  "date": "YYYY-MM-DD",
  "note": "string | null"
}
```

### Kategori untuk Transaksi Otomatis

Kolom `category_id` di tabel `transactions` adalah NOT NULL. Saat cicilan dibuat, backend akan auto-create (jika belum ada) kategori khusus milik user:
- `PAYABLE` → kategori EXPENSE bernama `"Hutang"` 
- `RECEIVABLE` → kategori INCOME bernama `"Piutang"`

Logika: `INSERT IGNORE INTO categories ... ON DUPLICATE KEY` — pakai unique constraint `(user_id, name, type)` yang sudah ada. ID kategori ini dipakai untuk transaksi otomatis. User tidak perlu memilih kategori saat bayar cicilan.

---

## Frontend

### Akses ke Halaman

**A — Widget di Dashboard** (`DashboardPage.tsx`)  
Card ringkasan ditempatkan setelah section "Ringkasan" (Pemasukan/Pengeluaran), berisi:
- Total hutang aktif (PAYABLE ACTIVE)
- Total piutang aktif (RECEIVABLE ACTIVE)
- Tombol "Lihat Semua" → navigate ke `/debts`
- Hanya tampil jika ada minimal 1 debt ACTIVE

**B — Avatar Dropdown Menu** (`DashboardPage.tsx`)  
Tambah item "Hutang & Piutang" di dropdown avatar, di antara "Profil Saya" dan "Keluar", dengan icon `HandCoins` dari lucide-react.

### Halaman `/debts` (`DebtsPage.tsx`)

```
Header: "Hutang & Piutang"
Summary bar:
  - Hutang aktif: total PAYABLE ACTIVE
  - Piutang aktif: total RECEIVABLE ACTIVE

Tab: [Hutang Saya] [Piutang Saya]

Tombol "+ Tambah" (floating atau di header)

List card per debt:
  - Nama orang + badge ACTIVE/SETTLED
  - Progress bar: paid_amount / amount
  - Label: "Sisa Rp X dari Rp Y"
  - Due date dengan warna:
      merah   = sudah lewat jatuh tempo
      kuning  = dalam 3 hari ke depan
      hijau   = lebih dari 3 hari
      abu-abu = tidak ada due date
  - Tombol [Bayar Cicilan / Terima Cicilan] — hanya jika ACTIVE
  - Menu ⋮ → Edit | Hapus

Modal "Tambah Hutang":
  - Toggle type: Hutang Saya / Piutang Saya
  - Nama orang (text input)
  - Jumlah total (number)
  - Jatuh tempo (date picker, opsional)
  - Catatan (opsional)

Modal "Detail & Riwayat Cicilan":
  - Info hutang (nama, total, sisa, due date)
  - List riwayat cicilan (tanggal, jumlah, rekening, catatan, tombol hapus)
  - Tombol "Bayar/Terima Cicilan" buka modal bayar

Modal "Bayar/Terima Cicilan":
  - Jumlah (max = sisa hutang, validasi client-side)
  - Pilih rekening (dropdown dari getAccounts())
  - Tanggal
  - Catatan (opsional)

Modal "Edit Hutang":
  - person_name, due_date, note (amount tidak bisa diubah setelah ada cicilan)
```

### File Baru
```
frontend/src/pages/debts/DebtsPage.tsx
frontend/src/services/debtService.ts
```
Update:
- `frontend/src/App.tsx` — tambah route `/debts`
- `frontend/src/pages/dashboard/DashboardPage.tsx` — widget + avatar dropdown item

---

## Constraints

- Amount tidak bisa diedit setelah ada cicilan yang masuk
- Cicilan tidak boleh melebihi sisa hutang
- Hapus debt → cascade hapus semua payments dan transactions terkait, saldo rekening di-reverse
- Hapus payment → reverse saldo rekening + kurangi paid_amount debt
- Status SETTLED otomatis, tidak bisa di-set manual
- Semua query scoped ke `userId` dari JWT — tidak ada userId dari request body

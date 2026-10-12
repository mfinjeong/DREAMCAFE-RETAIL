# Game Sharing Account Management — Pre-Migration Schema Proposal

Status: PROPOSAL ONLY. Belum diterapkan, belum divalidasi runtime.
Tidak ada perubahan pada `prisma/schema.prisma`, database, atau migrasi aktif.

Perubahan arah proyek: Sesuai PRD "Game Sharing Account Management", fitur ini mengelola akun game sharing per game, BUKAN rental berbasis durasi sewa. Tidak ada durasi sewa wajib, tidak ada perpanjangan (extension), tidak ada tarif per jam akun terpisah, dan tidak ada kalkulasi harga sewa akun.

## 1. Hasil Verifikasi Schema Aktual (Read-Only)

- `User` (`id` String cuid): relasi `sessionTokens`, `passwordResetTokens`.
- `Session` (`id` String cuid): field `endTime DateTime?`, `durationMinutes Int`, `remainingMinutes Int`, `hourlyRate Float`, `totalPrice Float`, `status SessionStatus` (ACTIVE, COMPLETED, CANCELLED).
- `Game` (`id` String cuid): `title` @unique, `genre`, `publisher`, `isActive Boolean @default(true)`.
- `Transaction` dan `TransactionItem`: checkout sesi PC/console tetap menggunakan alur yang ada. Tidak ada item biaya akun sharing tambahan.

## 2. Enums Baru yang Diusulkan

```prisma
enum SharingAccountStatus {
  AVAILABLE
  IN_USE
  MAINTENANCE
  OFFLINE
}

enum SharingAccountAllocationStatus {
  ACTIVE
  RELEASED
}
```

Alasan penamaan:
- `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `OFFLINE` selaras dengan konvensi PC/Console (`PCStatus`, `ConsoleStatus`).
- Akun nonaktif dikelola lewat `isActive = false`, bukan enum `DEACTIVATED`.
- Allocation status hanya `ACTIVE` dan `RELEASED`. Saat alokasi selesai atau dibatalkan, status menjadi `RELEASED` dengan `releasedAt = now()`.

## 3. Model Baru yang Diusulkan (3 Model)

### Model 1: GameSharingAccount

```prisma
model GameSharingAccount {
  id          String                @id @default(cuid())
  accountCode String                @unique // Mis. "CS2-01". Unik secara global di seluruh katalog.
  gameId      String
  status      SharingAccountStatus  @default(AVAILABLE)
  secretRef   String?               // Pointer ke external secret manager (bukan plaintext password)
  notes       String?
  isActive    Boolean               @default(true)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt

  game        Game                  @relation(fields: [gameId], references: [id], onDelete: Restrict)
  allocations GameSharingAccountAllocation[]
  auditLogs   GameSharingAccountAuditLog[]

  @@index([gameId])
  @@index([status])
  @@index([isActive])
  @@index([gameId, status])
}
```

Karakteristik penting:
- TIDAK ADA field `hourlyRate`. Penggunaan akun sharing tidak dikenakan biaya tambahan di luar sesi PC/console.
- `accountCode` unik secara global (memenuhi keputusan owner).
- `gameId` menggunakan `onDelete: Restrict` agar riwayat akun tidak hilang saat penghapusan game.

### Model 2: GameSharingAccountAllocation

```prisma
model GameSharingAccountAllocation {
  id          String                         @id @default(cuid())
  accountId   String
  sessionId   String
  status      SharingAccountAllocationStatus @default(ACTIVE)
  allocatedAt DateTime                       @default(now())
  releasedAt  DateTime?

  account     GameSharingAccount             @relation(fields: [accountId], references: [id], onDelete: Restrict)
  session     Session                        @relation(fields: [sessionId], references: [id], onDelete: Restrict)

  @@index([accountId])
  @@index([sessionId])
  @@index([status])
}
```

Karakteristik penting:
- TIDAK ADA `durationMinutes`, TIDAK ADA `hourlyRateSnapshot`, TIDAK ADA kalkulasi harga.
- Waktu selesai alokasi hanya dicatat saat akun benar-benar dilepas (`releasedAt`).
- Jaminan konkurensi database PostgreSQL (dibuat via raw SQL di migrasi):
  1. `UNIQUE (accountId) WHERE status = 'ACTIVE'`: satu akun sharing tidak bisa memiliki lebih dari 1 sesi aktif sekaligus.
  2. `UNIQUE (sessionId) WHERE status = 'ACTIVE'`: satu sesi hanya boleh menggunakan 1 akun sharing aktif (memenuhi keputusan owner).

### Model 3: GameSharingAccountAuditLog

```prisma
model GameSharingAccountAuditLog {
  id                  String             @id @default(cuid())
  accountId           String
  accountCodeSnapshot String
  gameIdSnapshot      String
  allocationId        String?            // Referensi historis saja; TANPA foreign key
  action              String             // CREATED, UPDATED, STATUS_CHANGED, ALLOCATED, RELEASED, ALLOCATION_CANCELLED, CREDENTIALS_ACCESSED (MAINTENANCE/OFFLINE/deactivation are recorded via UPDATED/STATUS_CHANGED with previousStatus/newStatus)
  previousStatus      String?
  newStatus           String?
  performedByUserId   String             // Diambil dari server session/token, bukan client payload
  details             String?            // Human-readable, TANPA password/kredensial
  createdAt           DateTime           @default(now())

  account             GameSharingAccount @relation(fields: [accountId], references: [id], onDelete: Restrict)
  performedBy         User               @relation(fields: [performedByUserId], references: [id], onDelete: Restrict)

  @@index([accountId])
  @@index([createdAt])
  @@index([allocationId])
}
```

Karakteristik audit:
- `accountId` NOT NULL dengan `onDelete: Restrict`. Menjamin integritas audit trail.
- `allocationId` nullable dan TANPA foreign key constraint (sesuai keputusan owner). Jika allocation record di masa depan dibersihkan atau diarsipkan, audit log tetap utuh.
- `performedByUserId` wajib berasal dari autentikasi server (`requireUser()`).

## 4. Perubahan Relasi pada Model Eksisting (Hanya Referensi, Belum Diterapkan)

Pada `model Game`:
```prisma
sharingAccounts GameSharingAccount[]
```

Pada `model Session`:
```prisma
sharingAllocations GameSharingAccountAllocation[]
```

Pada `model User`:
```prisma
sharingAccountAuditLogs GameSharingAccountAuditLog[]
```

## 5. Ringkasan Fitur Rental yang Resmi Dihapus

1. `hourlyRate` pada akun sharing -> Dihapus.
2. `durationMinutes` pada alokasi sharing -> Dihapus.
3. `hourlyRateSnapshot` pada alokasi sharing -> Dihapus.
4. `calculateRentalPrice()` -> Dihapus.
5. `extendRentalAllocation()` dan `extendRentalSchema` -> Dihapus.
6. `EXTENDED` action pada audit log -> Dihapus.
7. Tagihan/biaya tambahan pada checkout sesi -> Dihapus (menggunakan harga sesi biasa).

## 6. Integrasi dengan Lifecycle Sesi

Alokasi akun sharing mengikuti siklus hidup sesi PC/console yang sudah ada:

1. **Saat sesi dimulai** (via API/UI yang akan dibuat):
   - Validasi game dan akun di server.
   - Pastikan akun `AVAILABLE`, aktif, dan sesuai dengan game yang dipilih.
   - Alokasikan akun dalam transaksi database atomik:
     - Conditional update: ubah status akun dari `AVAILABLE` ke `IN_USE` hanya jika `status = AVAILABLE AND isActive = true`.
     - Jika conditional update berhasil (`count = 1`), buat record `GameSharingAccountAllocation` dengan `status = ACTIVE`.
     - Tulis audit log dalam transaksi yang sama.
     - Jika conditional update gagal (`count = 0`), rollback dan kembalikan error konflik.

2. **Saat sesi berakhir** (integrasi dengan `stopSession` dan `checkoutSession`):
   - Periksa apakah sesi memiliki alokasi sharing aktif.
   - Jika ada:
     - Update alokasi: `status = RELEASED`, `releasedAt = now()`.
     - Kembalikan status akun ke `AVAILABLE` (kecuali akun memang dalam `MAINTENANCE` atau `OFFLINE`).
     - Tulis audit log.
   - Semua operasi ini harus transaksional dan atomik.
   - Harga sesi tetap dihitung dari `Session.durationMinutes * Session.hourlyRate / 60` seperti biasa.

3. **Guard untuk `addSessionTime`** (belum diimplementasikan):
   - Dokumentasikan bahwa `addSessionTime` tidak boleh digunakan pada sesi dengan alokasi sharing aktif tanpa penanganan khusus.
   - Untuk tahap ini, jangan ubah perilaku `addSessionTime` yang ada.

## 7. Keamanan Kredensial

- Kredensial akun game (password, token) TIDAK BOLEH disimpan dalam plaintext.
- Field `secretRef` menyimpan URI pointer ke external secret manager (contoh: `vault://dreamcafe/steam/cs2-01`).
- Implementasi `src/lib/secret-manager.ts` wajib fail-closed: jika provider belum dikonfigurasi, `resolveSecret()` mengembalikan `null`.
- Kredensial TIDAK BOLEH dikembalikan via API publik, dicatat dalam log aplikasi, atau disimpan dalam audit log.
- Akses kredensial hanya untuk staf yang terautentikasi dan terotorisasi.

## 8. Partial Unique Index (Jaminan Konkurensi PostgreSQL)

Karena Prisma belum mendukung partial unique index secara native, constraint ini dibuat via raw SQL dalam migrasi:

```sql
CREATE UNIQUE INDEX "GameSharingAccountAllocation_accountId_active_key"
    ON "GameSharingAccountAllocation"("accountId")
    WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "GameSharingAccountAllocation_sessionId_active_key"
    ON "GameSharingAccountAllocation"("sessionId")
    WHERE "status" = 'ACTIVE';
```

Index ini menjamin:
- Satu akun sharing tidak bisa dialokasikan ke lebih dari 1 sesi aktif secara bersamaan.
- Satu sesi hanya bisa memiliki 1 akun sharing aktif.

Pelanggaran constraint menghasilkan Prisma error `P2002`, yang harus ditangani service dan dikembalikan sebagai respons konflik (HTTP 409) yang jelas.

## 9. Tahap Implementasi yang Diusulkan

1. **Tahap Schema** (memerlukan persetujuan owner):
   - Terapkan model dan enum di `prisma/schema.prisma`.
   - Generate dan review migrasi SQL.
   - Jalankan migrasi di environment development/staging.
   - Validasi constraint dan index.

2. **Tahap Service & API**:
   - Aktifkan `src/services/rental-account.service.ts.draft` (rename ke `.ts`).
   - Buat API routes untuk CRUD akun sharing dan alokasi.
   - Integrasikan alokasi dengan lifecycle sesi.
   - Tambahkan guard di `addSessionTime` jika diperlukan.

3. **Tahap UI**:
   - Buat halaman Game Sharing Accounts.
   - Tambahkan selector akun saat membuat/mengelola sesi.
   - Tampilkan status ketersediaan akun real-time.
   - Tampilkan riwayat penggunaan dan audit log.

4. **Tahap Testing**:
   - Unit test untuk validator dan status transition.
   - Integration test dengan PostgreSQL disposable untuk:
     - Concurrency (minimal 20 permintaan bersamaan untuk satu akun).
     - Rollback saat audit log gagal.
     - Foreign key dan retention.
     - Alokasi, pelepasan, dan pembatalan.
   - E2E test untuk alur penuh dari alokasi hingga checkout.

## 10. Blocker dan Keputusan yang Masih Diperlukan

- ✅ Status akun: `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `OFFLINE`.
- ✅ `accountCode` unik secara global.
- ✅ Satu sesi hanya boleh menggunakan satu akun sharing.
- ✅ Tidak ada biaya tambahan akun sharing.
- ✅ `allocationId` pada audit log adalah referensi historis tanpa FK.
- ✅ Secret manager fail-closed.
- ⚠️ Integration test PostgreSQL belum dijalankan (blocker sebelum production).
- ⚠️ Guard untuk `addSessionTime` belum diimplementasikan (perlu koordinasi dengan session service).
- ⚠️ Migrasi belum diterapkan ke `prisma/schema.prisma` (menunggu persetujuan owner untuk tahap schema).

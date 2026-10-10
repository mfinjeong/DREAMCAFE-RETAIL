# DREAMCAFE

> **Gaming Center Management & Community Platform**  
> Sistem manajemen operasional cyber cafe modern, biling real-time, kasir POS tunai (cash-only), inventaris stok, reservasi station, dan platform komunitas esports.

---

## 📌 Ringkasan Proyek

**DREAMCAFE** dirancang khusus untuk memenuhi kebutuhan operasional gaming center berstandar tinggi. Berbeda dari landing page gaming biasa, DREAMCAFE berfokus pada efisiensi sistem manajemen desktop: antarmuka bersih, gelap (*near-black / dark charcoal*), minimal, kompak, dan cepat digunakan oleh kasir maupun operator.

---

## ✨ Fitur Utama

### 1. 🖥️ Manajemen PC & Console Station
- **Monitoring Status Real-time**: Indikator instan `TOTAL PC`, `IN USE`, `AVAILABLE`, dan `MAINTENANCE`.
- **Zonasi Tarif**: Pengelompokan station berdasarkan zona (`REGULAR`, `VIP`, `ARENA`) dengan tarif per jam berbeda.
- **Konsol Lounge**: Pengelolaan stasiun game konsol untuk PlayStation 5, PS4 Pro, dan Nintendo Switch lengkap dengan jumlah kontroller dan game terinstal.
- **Audit Hardware Terisolasi**: Spesifikasi detail (CPU, GPU, RAM, Monitor 240Hz/360Hz DyAc, NVMe, Periferal, serta IP/MAC LAN) ditempatkan khusus di dalam modal `[DETAIL]` agar tampilan utama tetap ringkas dan bebas distraksi.
- **Proteksi Status**: Mencegah perubahan status pemeliharaan (*maintenance*) atau penghapusan station saat sesi biling sedang berjalan (`IN_USE`).

### 2. ⏱️ Biling Real-time & Sesi Rental
- **Siklus Sesi Terstruktur**: `AVAILABLE` → `START SESSION` → `IN_USE` → `END SESSION` → `AVAILABLE`.
- **Live Countdown Timer**: Penghitung mundur waktu sisa secara presisi per detik (format `HH:MM:SS`).
- **Opsi Durasi Fleksibel**: Pilihan paket 1 jam, 2 jam, 3 jam, 4 jam, atau paket kustom dengan kalkulasi biaya instan.
- **Penambahan Waktu (+Time)**: Menambah durasi sesi yang sedang berjalan secara on-the-fly tanpa menghentikan biling.
- **Dukungan Pengguna**: Dapat dikaitkan langsung ke akun Member terdaftar maupun pelanggan Tamu (*Guest*).

### 3. 💵 Sistem Kasir CASH ONLY (Tunai)
- **Validasi Pembayaran Server-side**:
  - Total Tagihan (misal: `Rp46.500`)
  - Uang Tunai Diterima (misal: `Rp50.000`)
  - Kembalian Otomatis (misal: `Rp3.500`)
- **Pencegahan Uang Kurang**: Menolak transaksi secara otomatis jika nominal uang tunai yang diterima tidak mencukupi total tagihan.
- **Tombol Pintas Uang Tunai**: Tombol cepat untuk *Uang Pas*, Rp20.000, Rp50.000, dan Rp100.000.
- **Fokus Transaksi Fisik**: Sesuai kebijakan DREAMCAFE, sistem tidak menggunakan gateway pembayaran online (Midtrans, Stripe, QRIS) dan berfokus penuh pada pencatatan fisik kasir tunai.

### 4. 🛒 Store & Point of Sale (POS)
- **Katalog Terkategori**: Minuman dingin, makanan berat, snack/cemilan, dan gaming gear/aksesoris.
- **Keranjang Belanja Interaktif**: Kontrol kuantitas instan dengan kalkulasi subtotal otomatis.
- **Pengurangan Stok Otomatis**: Stok fisik berkurang secara riil saat transaksi berhasil diselesaikan.
- **Proteksi Batas Stok**: Sistem membatasi pembelian agar tidak melebihi stok yang tersedia di gudang/toko.
- **Struk Transaksi**: Menghasilkan nomor invoice resmi (contoh: `INV-20261005-001`) dan rekap item belanja yang dapat langsung dicetak.

### 5. 📦 Inventaris & Mutasi Stok
- **Daftar Stok & Valuasi Aset**: Memantau modal (harga beli), harga jual, dan sisa stok seluruh produk.
- **Indikator Batas Kritis (*Low Stock Alert*)**: Penanda visual peringatan ketika stok berada di bawah batas minimum (`minStockAlert`).
- **Form Penyesuaian Mutasi**:
  - `STOCK IN`: Penambahan stok dari pemasok/supplier.
  - `STOCK OUT`: Pengurangan stok akibat barang rusak atau kadaluarsa.
  - `ADJUSTMENT`: Koreksi hasil *stock opname* fisik gudang.
- **Audit Log Terperinci**: Pencatatan riwayat setiap mutasi lengkap dengan stempel waktu, perubahan stok sebelum-sesudah, alasan, dan nama petugas.

### 6. 👥 Member & Profil Gaming (DREAMRANK)
- **Tingkatan Membership**: Kategori Member `REGULAR`, `VIP`, dan `PRO GAMER`.
- **DREAMRANK System**: Peringkat kompetitif pemain (`BRONZE` hingga `GRANDMASTER`).
- **Sistem Level, XP & DREAM Coins**: Penghargaan poin loyalitas berdasarkan jam terbang bermain di cafe.
- **Riwayat Lengkap**: Pencatatan saldo biling, sesi biling aktif, dan transaksi kasir.

### 7. 📅 Booking & Reservasi Terjadwal
- Reservasi station PC maupun Konsol untuk tanggal dan slot jam tertentu.
- **Conflict Prevention Engine**: Memeriksa tabrakan jadwal (*overlapping*) pada station dan rentang waktu yang sama untuk mencegah terjadinya *double-booking*.

### 8. 🏆 Esports Hub & Turnamen
- Pengelolaan turnamen komunitas (*bracket single/double elimination*), hadiah (*prize pool*), dan regulasi.
- Leaderboard tim/clan lokal dengan rating ELO, kalkulasi Win/Loss, dan kompatibilitas GPU rig untuk game populer.

### 9. 📊 Laporan Finansial & Operasional
- Rekap kas harian pendapatan tunai (*Total Cash Revenue*).
- Pemisahan pendapatan antara sewa station (*sessions*) dan penjualan F&B/toko (*store*).
- Log riwayat transaksi kasir yang komprehensif.

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| **Framework** | Next.js 15 (App Router, React 19) |
| **Language** | TypeScript (Strict mode) |
| **Styling** | Tailwind CSS (Dark minimal palette, subtle crimson accents) |
| **Icons** | Lucide React |
| **ORM & Database** | Prisma ORM & Supabase PostgreSQL |
| **Data Validation** | Zod |
| **Runtime Data Store** | In-memory & Prisma synchronized unified data layer |

---

## 🎨 Panduan Desain & Antarmuka

- **Palet Utama**: *Near-black / dark charcoal* (`#090a0f`, `#10121a`), border solid (`#1e222e`, `#212635`), dan tipografi putih bersih.
- **Aksen Merah Terukur**: Aksen merah (`#dc2626`) digunakan secara hemat dan selektif hanya untuk status kritis (*active*), tombol aksi utama (*primary action*), dan penanda navigasi aktif.
- **Zero Distraction**: Tidak menggunakan efek neon, tidak ada glow berlebihan, tanpa glassmorphism, dan bebas dari kalimat pemasaran panjang.
- **Layout Ringkas**: Mengutamakan kecepatan akses dan kepraktisan penggunaan aplikasi kasir/operator desktop.

---

## 🚀 Memulai (Quick Start)

### 1. Prasyarat
Pastikan Anda telah menginstal:
- [Node.js](https://nodejs.org/) versi 18.18+ atau 20+
- npm (Node Package Manager)

### 2. Kloning Repositori
```bash
git clone https://github.com/mfinjeong/DREAMCAFE-PLATFORM.git
cd DREAMCAFE-PLATFORM
```

### 3. Instal Dependensi
```bash
npm install
```

### 4. Konfigurasi Lingkungan (.env)
Salin berkas `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan variabel database Supabase PostgreSQL Anda:
```env
DATABASE_URL="postgresql://postgres.your-project:your-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.your-project:your-password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```
*(Catatan: Aplikasi dilengkapi dengan in-memory store internal yang tetap dapat dijalankan secara instan untuk kebutuhan evaluasi lokal meskipun koneksi database eksternal belum diatur).*

### 5. Generate Prisma Client
```bash
npx prisma generate
```

### 6. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka peramban Anda di [http://localhost:3000](http://localhost:3000).

---

## 📁 Struktur Direktori

```
d:/DREAMCAFE/
├── prisma/
│   ├── schema.prisma       # Skema database Supabase PostgreSQL
│   └── seed.ts             # Data inisialisasi awal (seed data realistis)
├── src/
│   ├── app/
│   │   ├── api/            # REST API endpoints (PC, Sessions, POS, Booking, dll.)
│   │   ├── pc/             # Halaman manajemen PC station
│   │   ├── consoles/       # Halaman lounge PS5, PS4, Switch
│   │   ├── sessions/       # Halaman pemantauan sesi aktif & checkout
│   │   ├── booking/        # Halaman reservasi station
│   │   ├── store/          # Halaman kasir Point of Sale (POS)
│   │   ├── inventory/      # Halaman mutasi & audit stok
│   │   ├── members/        # Halaman direktori member & profile
│   │   ├── tournaments/    # Halaman turnamen, clan & game library
│   │   ├── reports/        # Halaman laporan finansial & transaksi
│   │   ├── settings/       # Pengaturan tarif biling & kebijakan cabang
│   │   ├── layout.tsx      # Root layout dengan DashboardShell
│   │   ├── page.tsx        # Dashboard utama (Overview station & quick actions)
│   │   └── globals.css     # Styling dasar Tailwind CSS
│   ├── components/
│   │   ├── cards/          # PCStationCard, SessionCard, ProductCard
│   │   ├── layout/         # Sidebar, TopBar, DashboardShell
│   │   ├── modals/         # StartSessionModal, PaymentModal, PCDetailModal, dll.
│   │   └── ui/             # Button, Input, Select, Modal, Table, StatusBadge
│   └── lib/
│       ├── data-store.ts   # Unified state store & business logic handler
│       ├── formatters.ts   # Utilitas Rupiah (Rp) dan countdown timer
│       ├── prisma.ts       # Singleton Prisma Client
│       ├── types.ts        # TypeScript interfaces & types
│       └── validators.ts   # Skema validasi Zod
├── tailwind.config.ts      # Konfigurasi palet warna tema
├── tsconfig.json           # Konfigurasi TypeScript
└── package.json            # Daftar paket & skrip aplikasi
```

---

## 🧪 Validasi Kualitas Kode

- **Pemeriksaan Tipe TypeScript**:
  ```bash
  npx tsc --noEmit
  ```
  *(Terverifikasi: 0 error)*

- **Build Produksi**:
  ```bash
  npm run build
  ```
  *(Terverifikasi: Seluruh rute statis dan dinamis terkompilasi 100% sukses)*

---

## 📄 Lisensi

Hak Cipta © 2026 DREAMCAFE Platform. Semua hak dilindungi undang-undang.

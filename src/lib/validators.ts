import { z } from "zod";

export const pcSchema = z.object({
  stationNumber: z.string().min(1, "Nomor station wajib diisi"),
  name: z.string().min(2, "Nama station minimal 2 karakter"),
  zone: z.enum(["REGULAR", "VIP", "ARENA"]),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE", "OFFLINE"]).default("AVAILABLE"),
  hourlyRate: z.number().min(1000, "Tarif per jam minimal Rp1.000"),
  specsCpu: z.string().min(2, "Spesifikasi CPU wajib diisi"),
  specsGpu: z.string().min(2, "Spesifikasi GPU wajib diisi"),
  specsRam: z.string().min(2, "Spesifikasi RAM wajib diisi"),
  specsMonitor: z.string().min(2, "Spesifikasi Monitor wajib diisi"),
  specsStorage: z.string().default("1TB NVMe SSD"),
  specsPeripherals: z.string().default("Mechanical Keyboard + Mouse"),
  ipAddress: z.string().optional().nullable(),
  macAddress: z.string().optional().nullable(),
});

export const consoleSchema = z.object({
  stationNumber: z.string().min(1, "Nomor station konsol wajib diisi"),
  name: z.string().min(2, "Nama station konsol minimal 2 karakter"),
  consoleType: z.enum(["PS5", "PS4", "SWITCH"]),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE", "OFFLINE"]).default("AVAILABLE"),
  hourlyRate: z.number().min(1000, "Tarif per jam minimal Rp1.000"),
  controllersCount: z.number().int().min(1).max(8).default(2),
  specsDisplay: z.string().min(2, "Spesifikasi TV/Display wajib diisi"),
  installedGames: z.array(z.string()).optional().default([]),
});

export const memberSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  username: z.string().min(3, "Username minimal 3 karakter").regex(/^[a-zA-Z0-9_-]+$/, "Username hanya boleh huruf, angka, underscore, dan dash").optional(),
  phoneNumber: z.string().regex(/^[0-9+]+$/, "Nomor telepon harus angka").min(8, "Nomor telepon minimal 8 digit").optional().nullable().or(z.literal("")),
  email: z.string().email("Format email tidak valid").optional().nullable().or(z.literal("")),
  tier: z.enum(["REGULAR", "VIP", "PRO"]).default("REGULAR").optional(),
  balance: z.number().min(0, "Saldo tidak boleh negatif").default(0).optional(),
  notes: z.string().optional().nullable(),
});

export const updateMemberSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter").optional(),
  username: z.string().min(3, "Username minimal 3 karakter").regex(/^[a-zA-Z0-9_-]+$/, "Username hanya boleh huruf, angka, underscore, dan dash").optional(),
  phoneNumber: z.string().regex(/^[0-9+]+$/, "Nomor telepon harus angka").min(8, "Nomor telepon minimal 8 digit").optional().nullable().or(z.literal("")),
  email: z.string().email("Format email tidak valid").optional().nullable().or(z.literal("")),
  tier: z.enum(["REGULAR", "VIP", "PRO"]).optional(),
  balance: z.number().min(0, "Saldo tidak boleh negatif").optional(),
  notes: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
});

export const startSessionSchema = z.object({
  stationId: z.string().min(1, "Station ID wajib dipilih"),
  type: z.enum(["PC", "CONSOLE"]).default("PC"),
  memberId: z.string().optional().nullable(),
  guestName: z.string().optional().nullable(),
  durationMinutes: z.number().int().min(15, "Durasi minimal 15 menit"),
  gameId: z.string().optional().nullable(),
  currentGame: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine((data) => data.memberId || (data.guestName && data.guestName.trim().length > 0), {
  message: "Pilih member terdaftar atau masukkan nama tamu (Guest)",
  path: ["memberId"],
});

export const addSessionTimeSchema = z.object({
  sessionId: z.string().min(1, "Session ID wajib diisi"),
  additionalMinutes: z.number().int().min(15, "Penambahan waktu minimal 15 menit"),
});

export const cashPaymentSchema = z.object({
  totalAmount: z.number().min(0, "Total tagihan tidak valid"),
  cashReceived: z.number().min(0, "Jumlah uang tunai tidak boleh negatif"),
}).refine((data) => data.cashReceived >= data.totalAmount, {
  message: "Uang tunai yang diterima kurang dari total tagihan!",
  path: ["cashReceived"],
});

export const endSessionCheckoutSchema = z.object({
  sessionId: z.string().min(1, "Session ID wajib diisi"),
  totalAmount: z.number().min(0),
  cashReceived: z.number().min(0),
  notes: z.string().optional().nullable(),
}).refine((data) => data.cashReceived >= data.totalAmount, {
  message: "Uang tunai yang diterima kurang dari total tagihan!",
  path: ["cashReceived"],
});

export const sessionCheckoutWithProductsSchema = z.object({
  sessionId: z.string().min(1, "Session ID wajib diisi"),
  totalAmount: z.number().min(0).optional(),
  products: z.array(
    z.object({
      productId: z.string().min(1, "Product ID wajib diisi"),
      quantity: z.number().int().min(1, "Kuantitas minimal 1"),
    })
  ).optional().default([]),
  cashReceived: z.number().min(0, "Jumlah uang tunai tidak boleh negatif"),
  cashierName: z.string().optional().default("Admin"),
  notes: z.string().optional().nullable(),
});

export const posCheckoutSchema = z.object({
  memberId: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().min(1, "Produk wajib dipilih"),
      quantity: z.number().int().min(1, "Kuantitas minimal 1"),
      unitPrice: z.number().min(0).optional(),
    })
  ).min(1, "Keranjang belanja tidak boleh kosong"),
  cashReceived: z.number().min(0, "Uang tunai tidak valid"),
  cashierName: z.string().optional().default("Admin"),
  notes: z.string().optional().nullable(),
});

export const inventoryAdjustmentSchema = z
  .object({
    productId: z.string().min(1, "Produk wajib dipilih"),
    action: z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT"]),
    quantity: z.number().int("Jumlah harus berupa bilangan bulat"),
    reason: z.string().trim().min(3, "Alasan penyesuaian stok minimal 3 karakter"),
    recordedBy: z.string().optional().default("Admin"),
  })
  .superRefine((data, ctx) => {
    if (data.action === "STOCK_IN" && data.quantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Jumlah penambahan stok harus lebih dari 0",
        path: ["quantity"],
      });
    }
    if (data.action === "STOCK_OUT" && data.quantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Jumlah pengurangan stok harus lebih dari 0",
        path: ["quantity"],
      });
    }
    if (data.action === "ADJUSTMENT" && data.quantity < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Stok fisik hasil opname tidak boleh negatif",
        path: ["quantity"],
      });
    }
  });

export const bookingSchema = z.object({
  memberId: z.string().min(1, "Member wajib dipilih"),
  type: z.enum(["PC", "CONSOLE"]),
  stationId: z.string().min(1, "Station PC/Konsol wajib dipilih"),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam mulai harus HH:mm"),
  durationHours: z.number().int().min(1, "Durasi booking minimal 1 jam").max(12, "Durasi maksimal 12 jam"),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().optional().nullable(),
});

export const bookingAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam mulai harus HH:mm"),
  durationHours: z.coerce.number().int().min(1, "Durasi minimal 1 jam").max(12, "Durasi maksimal 12 jam").default(2),
  type: z.enum(["PC", "CONSOLE"]).optional(),
});

export const maintenanceCreateSchema = z.object({
  type: z.enum(["PC", "CONSOLE"]),
  stationId: z.string().min(1, "Station wajib dipilih"),
  title: z.string().trim().min(3, "Judul keluhan minimal 3 karakter"),
  description: z.string().trim().min(3, "Deskripsi kerusakan wajib diisi"),
  technician: z.string().trim().optional().nullable(),
  cost: z.number().min(0, "Estimasi biaya tidak boleh negatif").optional(),
});

export const maintenanceUpdateSchema = z
  .object({
    status: z.enum(["IN_PROGRESS", "RESOLVED"]).optional(),
    technician: z.string().trim().min(1, "Nama teknisi tidak boleh kosong").optional(),
    cost: z.number().min(0, "Biaya tidak boleh negatif").optional(),
    notes: z.string().trim().optional().nullable(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Tidak ada data yang diubah",
  });

export const reportFilterSchema = z.object({
  period: z.enum(["today", "yesterday", "this_week", "this_month", "custom"]).optional().default("today"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD").optional(),
});

export const gameSchema = z.object({
  title: z.string().trim().min(1, "Judul game wajib diisi").max(100, "Judul game maksimal 100 karakter"),
  slug: z.string().trim().optional().nullable(),
  genre: z.string().trim().min(1, "Genre game wajib diisi").max(50, "Genre maksimal 50 karakter"),
  publisher: z.string().trim().min(1, "Publisher wajib diisi").max(100, "Publisher maksimal 100 karakter"),
  iconUrl: z.string().trim().optional().nullable(),
  bannerUrl: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  minGpuRequired: z.string().trim().default("GTX 1650"),
  popularityRank: z.coerce.number().int().min(1).default(1),
  isInstalledOnPc: z.boolean().default(true),
  isInstalledConsole: z.boolean().default(false),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

export const updateGameSchema = gameSchema.partial();

export const gameQuerySchema = z.object({
  q: z.string().trim().optional(),
  platform: z.enum(["ALL", "PC", "CONSOLE"]).optional().default("ALL"),
  genre: z.string().trim().optional(),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional().default("ALL"),
});


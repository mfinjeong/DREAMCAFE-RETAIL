import {
  PCStation,
  ConsoleStation,
  SessionItem,
  MemberItem,
  ProductItem,
  ProductCategoryItem,
  InventoryLogItem,
  TransactionRecord,
  BookingItem,
  GameItem,
  StationZone,
  PCStatus,
  ConsoleStatus,
} from "./types";

interface DreamCafeStore {
  pcs: PCStation[];
  consoles: ConsoleStation[];
  members: MemberItem[];
  categories: ProductCategoryItem[];
  products: ProductItem[];
  sessions: SessionItem[];
  transactions: TransactionRecord[];
  bookings: BookingItem[];
  inventoryLogs: InventoryLogItem[];
  games: GameItem[];
}

// Initializing realistic seed state
function getInitialStore(): DreamCafeStore {
  const categories: ProductCategoryItem[] = [
    { id: "cat-1", name: "Minuman Dingin", slug: "beverages", description: "Soft drink, energy drink, kopi dingin" },
    { id: "cat-2", name: "Makanan Berat", slug: "food", description: "Mie instan, nasi goreng, bento" },
    { id: "cat-3", name: "Snack & Cemilan", slug: "snacks", description: "Keripik, kacang, wafer" },
    { id: "cat-4", name: "Gaming Gear & Aksesoris", slug: "accessories", description: "Finger sleeve, mousepad, kabel" },
  ];

  const products: ProductItem[] = [
    { id: "prod-1", name: "Teh Pucuk Harum 350ml", barcode: "8992753123456", categoryId: "cat-1", categoryName: "Minuman Dingin", price: 6000, costPrice: 3800, stock: 48, minStockAlert: 10, unit: "botol", isActive: true },
    { id: "prod-2", name: "Kratingdaeng Red Bull 150ml", barcode: "8992753123457", categoryId: "cat-1", categoryName: "Minuman Dingin", price: 12000, costPrice: 8500, stock: 24, minStockAlert: 8, unit: "botol", isActive: true },
    { id: "prod-3", name: "Kopi Kenangan Mantan Can", barcode: "8992753123458", categoryId: "cat-1", categoryName: "Minuman Dingin", price: 15000, costPrice: 10500, stock: 30, minStockAlert: 5, unit: "kaleng", isActive: true },
    { id: "prod-4", name: "Aqua 600ml", barcode: "8992753123459", categoryId: "cat-1", categoryName: "Minuman Dingin", price: 5000, costPrice: 2800, stock: 60, minStockAlert: 15, unit: "botol", isActive: true },
    { id: "prod-5", name: "Indomie Goreng Double + Telur", barcode: "8992753123460", categoryId: "cat-2", categoryName: "Makanan Berat", price: 18000, costPrice: 9000, stock: 50, minStockAlert: 12, unit: "porsi", isActive: true },
    { id: "prod-6", name: "Nasi Goreng Spesial DREAMCAFE", barcode: "8992753123461", categoryId: "cat-2", categoryName: "Makanan Berat", price: 25000, costPrice: 13000, stock: 35, minStockAlert: 8, unit: "porsi", isActive: true },
    { id: "prod-7", name: "Chitatos Sapi Panggang 68g", barcode: "8992753123462", categoryId: "cat-3", categoryName: "Snack & Cemilan", price: 13000, costPrice: 9000, stock: 25, minStockAlert: 6, unit: "bungkus", isActive: true },
    { id: "prod-8", name: "Pringles Original 107g", barcode: "8992753123463", categoryId: "cat-3", categoryName: "Snack & Cemilan", price: 24000, costPrice: 17500, stock: 4, minStockAlert: 5, unit: "tabung", isActive: true }, // Low stock indicator!
    { id: "prod-9", name: "Gaming Finger Sleeve (Pair)", barcode: "8992753123464", categoryId: "cat-4", categoryName: "Gaming Gear & Aksesoris", price: 15000, costPrice: 7000, stock: 18, minStockAlert: 5, unit: "pasang", isActive: true },
  ];

  const members: MemberItem[] = [
    {
      id: "mem-1",
      memberCode: "DC-00101",
      fullName: "Muhammad Fadhil",
      username: "Vandal_God",
      phoneNumber: "081288990011",
      email: "fadhil.vandal@gmail.com",
      tier: "VIP",
      balance: 150000,
      dreamCoins: 1250,
      xp: 8400,
      level: 18,
      createdAt: "2026-08-10T10:00:00Z",
    },
    {
      id: "mem-2",
      memberCode: "DC-00102",
      fullName: "Dimas Arya Putra",
      username: "ShadowSniper",
      phoneNumber: "081399881122",
      email: "dimas.arya@gmail.com",
      tier: "PRO",
      balance: 320000,
      dreamCoins: 3100,
      xp: 15200,
      level: 32,
      createdAt: "2026-07-04T12:30:00Z",
    },
    {
      id: "mem-3",
      memberCode: "DC-00103",
      fullName: "Kevin Christian",
      username: "Acedia",
      phoneNumber: "081122334455",
      email: "kevin.christian@gmail.com",
      tier: "REGULAR",
      balance: 45000,
      dreamCoins: 350,
      xp: 2300,
      level: 5,
      createdAt: "2026-09-12T14:15:00Z",
    },
    {
      id: "mem-4",
      memberCode: "DC-00104",
      fullName: "Ananda Rizky",
      username: "RizkyClutch",
      phoneNumber: "085677889900",
      email: "ananda.rizky@gmail.com",
      tier: "VIP",
      balance: 95000,
      dreamCoins: 890,
      xp: 6100,
      level: 14,
      createdAt: "2026-09-01T16:00:00Z",
    },
    {
      id: "mem-5",
      memberCode: "DC-00105",
      fullName: "Farhan Maulana",
      username: "HanzoMain",
      phoneNumber: "087711223344",
      email: "farhan.m@gmail.com",
      tier: "REGULAR",
      balance: 20000,
      dreamCoins: 120,
      xp: 1100,
      level: 3,
      createdAt: "2026-09-20T11:45:00Z",
    },
  ];

  const now = new Date();
  const startTimePC2 = new Date(now.getTime() - 75 * 60 * 1000).toISOString();
  const startTimePC4 = new Date(now.getTime() - 40 * 60 * 1000).toISOString();
  const startTimePC6 = new Date(now.getTime() - 95 * 60 * 1000).toISOString();

  const sessions: SessionItem[] = [
    {
      id: "ses-101",
      sessionNumber: "SES-20261005-001",
      type: "PC",
      pcId: "pc-2",
      pcStationNumber: "PC 02",
      memberId: "mem-1",
      memberName: "Vandal_God",
      guestName: null,
      startTime: startTimePC2,
      durationMinutes: 120,
      remainingMinutes: 45, // ~00:44:48 remaining
      hourlyRate: 15000,
      totalPrice: 43000, // Session + food/drinks
      status: "ACTIVE",
      paymentStatus: "PENDING",
      currentGame: "Valorant",
      notes: "VIP Zone Gaming Session",
    },
    {
      id: "ses-102",
      sessionNumber: "SES-20261005-002",
      type: "PC",
      pcId: "pc-4",
      pcStationNumber: "PC 04",
      memberId: "mem-3",
      memberName: "Acedia",
      guestName: null,
      startTime: startTimePC4,
      durationMinutes: 180,
      remainingMinutes: 140,
      hourlyRate: 10000,
      totalPrice: 30000,
      status: "ACTIVE",
      paymentStatus: "PAID",
      currentGame: "Dota 2",
      notes: "Ranked Party",
    },
    {
      id: "ses-103",
      sessionNumber: "SES-20261005-003",
      type: "PC",
      pcId: "pc-6",
      pcStationNumber: "PC 06",
      memberId: "mem-2",
      memberName: "ShadowSniper",
      guestName: null,
      startTime: startTimePC6,
      durationMinutes: 180,
      remainingMinutes: 85,
      hourlyRate: 20000,
      totalPrice: 60000,
      status: "ACTIVE",
      paymentStatus: "PAID",
      currentGame: "Counter-Strike 2",
      notes: "Arena Esports Training",
    },
  ];

  const pcs: PCStation[] = [
    {
      id: "pc-1",
      stationNumber: "PC 01",
      name: "Predator Station 01",
      zone: "REGULAR",
      status: "AVAILABLE",
      hourlyRate: 10000,
      specsCpu: "Intel Core i5-13400F (10 Cores, 4.6GHz)",
      specsGpu: "NVIDIA GeForce RTX 4060 8GB GDDR6",
      specsRam: "16GB Kingston Fury DDR5 5200MHz",
      specsMonitor: "AOC 24\" 165Hz IPS 1ms Adaptive Sync",
      specsStorage: "1TB Kingston NV2 NVMe Gen4",
      specsPeripherals: "HyperX Alloy Origins Red + Pulsefire Haste",
      ipAddress: "192.168.1.101",
      macAddress: "70:85:C2:55:01:01",
      currentGame: null,
      activeSessionId: null,
    },
    {
      id: "pc-2",
      stationNumber: "PC 02",
      name: "Predator Station 02",
      zone: "VIP",
      status: "IN_USE",
      hourlyRate: 15000,
      specsCpu: "AMD Ryzen 7 7800X3D (8 Cores, 5.0GHz 3D V-Cache)",
      specsGpu: "NVIDIA GeForce RTX 4070 Super 12GB GDDR6X",
      specsRam: "32GB Corsair Vengeance DDR5 6000MHz",
      specsMonitor: "ZOWIE XL2546K 24.5\" 240Hz DyAc+",
      specsStorage: "2TB Samsung 980 Pro NVMe",
      specsPeripherals: "Wooting 60HE Hall Effect + Logitech G Pro X Superlight",
      ipAddress: "192.168.1.102",
      macAddress: "70:85:C2:55:01:02",
      currentGame: "Valorant",
      activeSessionId: "ses-101",
      activeSession: sessions[0],
    },
    {
      id: "pc-3",
      stationNumber: "PC 03",
      name: "Predator Station 03",
      zone: "VIP",
      status: "AVAILABLE",
      hourlyRate: 15000,
      specsCpu: "AMD Ryzen 7 7800X3D (8 Cores, 5.0GHz)",
      specsGpu: "NVIDIA GeForce RTX 4070 Super 12GB",
      specsRam: "32GB Corsair Vengeance DDR5 6000MHz",
      specsMonitor: "ZOWIE XL2546K 24.5\" 240Hz DyAc+",
      specsStorage: "2TB Samsung 980 Pro NVMe",
      specsPeripherals: "Wooting 60HE + Razer DeathAdder V3 Pro",
      ipAddress: "192.168.1.103",
      macAddress: "70:85:C2:55:01:03",
      currentGame: null,
      activeSessionId: null,
    },
    {
      id: "pc-4",
      stationNumber: "PC 04",
      name: "Predator Station 04",
      zone: "REGULAR",
      status: "IN_USE",
      hourlyRate: 10000,
      specsCpu: "Intel Core i5-13400F",
      specsGpu: "NVIDIA GeForce RTX 4060 8GB",
      specsRam: "16GB DDR5 5200MHz",
      specsMonitor: "AOC 24\" 165Hz IPS",
      specsStorage: "1TB NVMe Gen4",
      specsPeripherals: "SteelSeries Apex 3 + Rival 3",
      ipAddress: "192.168.1.104",
      macAddress: "70:85:C2:55:01:04",
      currentGame: "Dota 2",
      activeSessionId: "ses-102",
      activeSession: sessions[1],
    },
    {
      id: "pc-5",
      stationNumber: "PC 05",
      name: "Predator Station 05",
      zone: "REGULAR",
      status: "AVAILABLE",
      hourlyRate: 10000,
      specsCpu: "Intel Core i5-13400F",
      specsGpu: "NVIDIA GeForce RTX 4060 8GB",
      specsRam: "16GB DDR5 5200MHz",
      specsMonitor: "AOC 24\" 165Hz IPS",
      specsStorage: "1TB NVMe Gen4",
      specsPeripherals: "SteelSeries Apex 3 + Rival 3",
      ipAddress: "192.168.1.105",
      macAddress: "70:85:C2:55:01:05",
      currentGame: null,
      activeSessionId: null,
    },
    {
      id: "pc-6",
      stationNumber: "PC 06",
      name: "Predator Station 06",
      zone: "ARENA",
      status: "IN_USE",
      hourlyRate: 20000,
      specsCpu: "Intel Core i9-14900KF (24 Cores, 6.0GHz)",
      specsGpu: "NVIDIA GeForce RTX 4080 Super 16GB",
      specsRam: "64GB G.Skill Trident Z5 RGB DDR5 6400MHz",
      specsMonitor: "ASUS ROG Swift PG27AQN 27\" 360Hz 1440p IPS",
      specsStorage: "2TB Kingston KC3000 PCIe 4.0",
      specsPeripherals: "Razer Huntsman V3 Pro Analog + Viper V3 Pro",
      ipAddress: "192.168.1.106",
      macAddress: "70:85:C2:55:01:06",
      currentGame: "Counter-Strike 2",
      activeSessionId: "ses-103",
      activeSession: sessions[2],
    },
    {
      id: "pc-7",
      stationNumber: "PC 07",
      name: "Predator Station 07",
      zone: "ARENA",
      status: "AVAILABLE",
      hourlyRate: 20000,
      specsCpu: "Intel Core i9-14900KF",
      specsGpu: "NVIDIA GeForce RTX 4080 Super 16GB",
      specsRam: "64GB DDR5 6400MHz",
      specsMonitor: "ASUS ROG Swift 360Hz 1440p",
      specsStorage: "2TB PCIe 4.0 SSD",
      specsPeripherals: "Razer Huntsman V3 Pro + Viper V3 Pro",
      ipAddress: "192.168.1.107",
      macAddress: "70:85:C2:55:01:07",
      currentGame: null,
      activeSessionId: null,
    },
    {
      id: "pc-8",
      stationNumber: "PC 08",
      name: "Predator Station 08",
      zone: "REGULAR",
      status: "AVAILABLE",
      hourlyRate: 10000,
      specsCpu: "Intel Core i5-13400F",
      specsGpu: "NVIDIA RTX 4060 8GB",
      specsRam: "16GB DDR5 5200MHz",
      specsMonitor: "AOC 24\" 165Hz IPS",
      specsStorage: "1TB NVMe",
      specsPeripherals: "HyperX Alloy Origins + Pulsefire",
      ipAddress: "192.168.1.108",
      macAddress: "70:85:C2:55:01:08",
      currentGame: null,
      activeSessionId: null,
    },
    {
      id: "pc-9",
      stationNumber: "PC 09",
      name: "Predator Station 09",
      zone: "REGULAR",
      status: "OFFLINE",
      hourlyRate: 10000,
      specsCpu: "Intel Core i5-13400F",
      specsGpu: "NVIDIA RTX 4060 8GB",
      specsRam: "16GB DDR5 5200MHz",
      specsMonitor: "AOC 24\" 165Hz IPS",
      specsStorage: "1TB NVMe",
      specsPeripherals: "HyperX Alloy Origins + Pulsefire",
      ipAddress: "192.168.1.109",
      macAddress: "70:85:C2:55:01:09",
      currentGame: null,
      activeSessionId: null,
    },
    {
      id: "pc-10",
      stationNumber: "PC 10",
      name: "Predator Station 10",
      zone: "ARENA",
      status: "MAINTENANCE",
      hourlyRate: 20000,
      specsCpu: "Intel Core i9-14900KF",
      specsGpu: "NVIDIA GeForce RTX 4080 Super 16GB",
      specsRam: "64GB DDR5 6400MHz",
      specsMonitor: "ASUS ROG Swift 360Hz 1440p",
      specsStorage: "2TB PCIe 4.0 SSD",
      specsPeripherals: "Razer Huntsman V3 Pro + Viper V3 Pro",
      ipAddress: "192.168.1.110",
      macAddress: "70:85:C2:55:01:10",
      currentGame: null,
      activeSessionId: null,
    },
  ];

  const consoles: ConsoleStation[] = [
    {
      id: "con-1",
      stationNumber: "CON 01",
      name: "PlayStation 5 Lounge A",
      consoleType: "PS5",
      status: "AVAILABLE",
      hourlyRate: 20000,
      controllersCount: 2,
      installedGames: ["EA Sports FC 24", "Tekken 8", "Spider-Man 2", "Mortal Kombat 1", "Gran Turismo 7"],
      specsDisplay: "Sony Bravia XR 55\" 4K 120Hz OLED + DualSense Edge",
      currentGame: null,
      activeSessionId: null,
    },
    {
      id: "con-2",
      stationNumber: "CON 02",
      name: "PlayStation 5 Lounge B",
      consoleType: "PS5",
      status: "IN_USE",
      hourlyRate: 20000,
      controllersCount: 4,
      installedGames: ["EA Sports FC 24", "NBA 2K24", "Tekken 8", "Street Fighter 6", "It Takes Two"],
      specsDisplay: "LG C3 55\" 4K 120Hz OLED + 4x DualSense Controllers",
      currentGame: "EA Sports FC 24",
      activeSessionId: null,
    },
    {
      id: "con-3",
      stationNumber: "CON 03",
      name: "PlayStation 4 Pro Arena",
      consoleType: "PS4",
      status: "AVAILABLE",
      hourlyRate: 15000,
      controllersCount: 2,
      installedGames: ["PES 2021 Season Update", "FIFA 23", "Tekken 7", "GTA V", "God of War Ragnarok"],
      specsDisplay: "Samsung 50\" Crystal UHD 4K",
      currentGame: null,
      activeSessionId: null,
    },
    {
      id: "con-4",
      stationNumber: "CON 04",
      name: "Nintendo Switch Party Zone",
      consoleType: "SWITCH",
      status: "AVAILABLE",
      hourlyRate: 15000,
      controllersCount: 4,
      installedGames: ["Super Smash Bros Ultimate", "Mario Kart 8 Deluxe", "Overcooked 2", "Mario Party Superstars"],
      specsDisplay: "Xiaomi 55\" 4K UHD + 4x Joy-Con + 2x Pro Controller",
      currentGame: null,
      activeSessionId: null,
    },
  ];

  const transactions: TransactionRecord[] = [
    {
      id: "trx-101",
      invoiceNumber: "INV-20261005-001",
      memberId: "mem-1",
      memberName: "Vandal_God",
      cashierName: "Admin",
      type: "MIXED",
      subtotal: 46500,
      tax: 0,
      discount: 0,
      totalAmount: 46500,
      cashReceived: 50000,
      cashChange: 3500,
      paymentMethod: "CASH",
      status: "PAID",
      items: [
        { id: "item-1", description: "Biling PC 2 Jam (VIP)", unitPrice: 30000, quantity: 1, subtotal: 30000 },
        { id: "item-2", description: "Indomie Goreng Double + Telur", unitPrice: 18000, quantity: 1, subtotal: 18000 },
        { id: "item-3", description: "Teh Pucuk Harum 350ml", unitPrice: 6000, quantity: 1, subtotal: 6000 },
      ],
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: "trx-102",
      invoiceNumber: "INV-20261005-002",
      memberId: "mem-3",
      memberName: "Acedia",
      cashierName: "Admin",
      type: "STORE",
      subtotal: 24000,
      tax: 0,
      discount: 0,
      totalAmount: 24000,
      cashReceived: 50000,
      cashChange: 26000,
      paymentMethod: "CASH",
      status: "PAID",
      items: [
        { id: "item-4", description: "Kratingdaeng Red Bull 150ml", unitPrice: 12000, quantity: 2, subtotal: 24000 },
      ],
      createdAt: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
    },
  ];

  const bookings: BookingItem[] = [
    {
      id: "book-1",
      bookingCode: "BK-20261006-01",
      type: "PC",
      pcId: "pc-6",
      pcStationNumber: "PC 06",
      memberId: "mem-2",
      memberName: "Dimas Arya Putra (ShadowSniper)",
      bookingDate: "2026-10-06",
      startTime: "19:00",
      endTime: "22:00",
      durationHours: 3,
      totalPrice: 60000,
      status: "CONFIRMED",
      notes: "CS2 Gaming session",
    },
    {
      id: "book-2",
      bookingCode: "BK-20261006-02",
      type: "CONSOLE",
      consoleId: "con-1",
      consoleStationNumber: "CON 01",
      memberId: "mem-4",
      memberName: "Ananda Rizky (RizkyClutch)",
      bookingDate: "2026-10-06",
      startTime: "20:00",
      endTime: "22:00",
      durationHours: 2,
      totalPrice: 40000,
      status: "PENDING",
      notes: "FC 24 Co-op Session",
    },
  ];

  const inventoryLogs: InventoryLogItem[] = [
    {
      id: "inv-1",
      productId: "prod-1",
      productName: "Teh Pucuk Harum 350ml",
      action: "STOCK_IN",
      quantity: 50,
      previousStock: 0,
      newStock: 50,
      reason: "Restock supplier mingguan",
      recordedBy: "Admin",
      createdAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "inv-2",
      productId: "prod-8",
      productName: "Pringles Original 107g",
      action: "STOCK_OUT",
      quantity: 1,
      previousStock: 5,
      newStock: 4,
      reason: "Penjualan Kasir POS",
      recordedBy: "Kasir 1",
      createdAt: new Date(now.getTime() - 1 * 3600 * 1000).toISOString(),
    },
  ];

  const games: GameItem[] = [
    {
      id: "g-1",
      title: "Valorant",
      genre: "Tactical FPS",
      publisher: "Riot Games",
      minGpuRequired: "GTX 1050 Ti",
      popularityRank: 1,
      isInstalledOnPc: true,
      isInstalledConsole: false,
      isActive: true,
      tags: ["Competitive", "Esports", "Shooter", "5v5"],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "g-2",
      title: "Counter-Strike 2",
      genre: "Competitive FPS",
      publisher: "Valve Corporation",
      minGpuRequired: "RTX 3060",
      popularityRank: 2,
      isInstalledOnPc: true,
      isInstalledConsole: false,
      isActive: true,
      tags: ["FPS", "Classic", "Tactical", "Esports"],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "g-3",
      title: "Dota 2",
      genre: "MOBA",
      publisher: "Valve Corporation",
      minGpuRequired: "GTX 1650",
      popularityRank: 3,
      isInstalledOnPc: true,
      isInstalledConsole: false,
      isActive: true,
      tags: ["Strategy", "MOBA", "Esports", "Team"],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "g-4",
      title: "EA Sports FC 24",
      genre: "Sports / Football",
      publisher: "Electronic Arts",
      minGpuRequired: "RTX 3060",
      popularityRank: 4,
      isInstalledOnPc: true,
      isInstalledConsole: true,
      isActive: true,
      tags: ["Football", "Multiplayer", "Controller Friendly"],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "g-5",
      title: "Tekken 8",
      genre: "Fighting Game",
      publisher: "Bandai Namco",
      minGpuRequired: "RTX 3060 Ti",
      popularityRank: 5,
      isInstalledOnPc: true,
      isInstalledConsole: true,
      isActive: true,
      tags: ["Fighting", "Versus", "Arcade"],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];

  return {
    pcs,
    consoles,
    members,
    categories,
    products,
    sessions,
    transactions,
    bookings,
    inventoryLogs,
    games,
  };
}

// Global persistent instance in memory across requests
const globalStore = globalThis as unknown as {
  dreamcafeStore?: DreamCafeStore;
};

if (!globalStore.dreamcafeStore) {
  globalStore.dreamcafeStore = getInitialStore();
}

export const store = globalStore.dreamcafeStore;

// Business Helper Functions with strict domain validation

export function getAllPCs(): PCStation[] {
  return store.pcs;
}

export function getPCById(id: string): PCStation | undefined {
  return store.pcs.find((p) => p.id === id);
}

export function updatePCStatus(pcId: string, status: PCStatus): { success: boolean; message: string; pc?: PCStation } {
  const pc = store.pcs.find((p) => p.id === pcId);
  if (!pc) return { success: false, message: "PC tidak ditemukan" };
  
  if (pc.status === "IN_USE" && status === "MAINTENANCE") {
    return { success: false, message: "Tidak dapat mengubah ke maintenance saat PC sedang digunakan!" };
  }

  pc.status = status;
  if (status === "AVAILABLE" || status === "OFFLINE" || status === "MAINTENANCE") {
    pc.currentGame = null;
    pc.activeSessionId = null;
    pc.activeSession = null;
  }
  return { success: true, message: "Status PC berhasil diubah", pc };
}

export function createPC(data: Omit<PCStation, "id" | "activeSessionId" | "activeSession">): { success: boolean; message: string; pc?: PCStation } {
  // Check duplicate station number
  const exists = store.pcs.some((p) => p.stationNumber.toLowerCase() === data.stationNumber.toLowerCase());
  if (exists) {
    return { success: false, message: `Nomor station ${data.stationNumber} sudah digunakan` };
  }

  const newPC: PCStation = {
    ...data,
    id: `pc-${Date.now()}`,
    activeSessionId: null,
    activeSession: null,
  };
  store.pcs.push(newPC);
  return { success: true, message: "PC baru berhasil ditambahkan", pc: newPC };
}

export function updatePC(id: string, data: Partial<PCStation>): { success: boolean; message: string; pc?: PCStation } {
  const index = store.pcs.findIndex((p) => p.id === id);
  if (index === -1) return { success: false, message: "PC tidak ditemukan" };

  store.pcs[index] = { ...store.pcs[index], ...data };
  return { success: true, message: "Data PC berhasil diperbarui", pc: store.pcs[index] };
}

export function deletePC(id: string): { success: boolean; message: string } {
  const pc = store.pcs.find((p) => p.id === id);
  if (!pc) return { success: false, message: "PC tidak ditemukan" };
  if (pc.status === "IN_USE") {
    return { success: false, message: "Tidak dapat menghapus PC yang sedang dalam sesi aktif!" };
  }
  store.pcs = store.pcs.filter((p) => p.id !== id);
  return { success: true, message: "PC berhasil dihapus" };
}

// Session System
export function startSession(params: {
  stationId: string;
  type: "PC" | "CONSOLE";
  memberId?: string | null;
  guestName?: string | null;
  durationMinutes: number;
  currentGame?: string | null;
  notes?: string | null;
}): { success: boolean; message: string; session?: SessionItem } {
  if (params.type === "PC") {
    const pc = store.pcs.find((p) => p.id === params.stationId);
    if (!pc) return { success: false, message: "PC station tidak ditemukan" };
    if (pc.status === "IN_USE") {
      return { success: false, message: `PC ${pc.stationNumber} sedang digunakan! Tidak dapat memulai sesi.` };
    }
    if (pc.status === "MAINTENANCE") {
      return { success: false, message: `PC ${pc.stationNumber} sedang dalam pemeliharaan (MAINTENANCE).` };
    }
    if (pc.status === "OFFLINE") {
      return { success: false, message: `PC ${pc.stationNumber} dalam status OFFLINE.` };
    }

    const member = params.memberId ? store.members.find((m) => m.id === params.memberId) : null;
    const hours = params.durationMinutes / 60;
    const totalPrice = Math.round(hours * pc.hourlyRate);

    const newSession: SessionItem = {
      id: `ses-${Date.now()}`,
      sessionNumber: `SES-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`,
      type: "PC",
      pcId: pc.id,
      pcStationNumber: pc.stationNumber,
      memberId: member ? member.id : null,
      memberName: member ? member.fullName : null,
      guestName: !member ? (params.guestName || "Guest") : null,
      startTime: new Date().toISOString(),
      durationMinutes: params.durationMinutes,
      remainingMinutes: params.durationMinutes,
      hourlyRate: pc.hourlyRate,
      totalPrice,
      status: "ACTIVE",
      paymentStatus: "PENDING",
      currentGame: params.currentGame || "Valorant",
      notes: params.notes || null,
    };

    store.sessions.unshift(newSession);

    // Update PC status to IN_USE
    pc.status = "IN_USE";
    pc.currentGame = newSession.currentGame;
    pc.activeSessionId = newSession.id;
    pc.activeSession = newSession;

    // Grant Member XP if member
    if (member) {
      member.xp += params.durationMinutes * 5;
      member.dreamCoins += Math.floor(params.durationMinutes / 30) * 10;
      member.level = Math.floor(member.xp / 500) + 1;
    }

    return { success: true, message: `Sesi berhasil dimulai di ${pc.stationNumber}`, session: newSession };
  } else {
    // Console
    const consoleItem = store.consoles.find((c) => c.id === params.stationId);
    if (!consoleItem) return { success: false, message: "Konsol tidak ditemukan" };
    if (consoleItem.status === "IN_USE") {
      return { success: false, message: `Konsol ${consoleItem.stationNumber} sedang digunakan!` };
    }

    const member = params.memberId ? store.members.find((m) => m.id === params.memberId) : null;
    const hours = params.durationMinutes / 60;
    const totalPrice = Math.round(hours * consoleItem.hourlyRate);

    const newSession: SessionItem = {
      id: `ses-${Date.now()}`,
      sessionNumber: `SES-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`,
      type: "CONSOLE",
      consoleId: consoleItem.id,
      consoleStationNumber: consoleItem.stationNumber,
      memberId: member ? member.id : null,
      memberName: member ? member.fullName : null,
      guestName: !member ? (params.guestName || "Guest") : null,
      startTime: new Date().toISOString(),
      durationMinutes: params.durationMinutes,
      remainingMinutes: params.durationMinutes,
      hourlyRate: consoleItem.hourlyRate,
      totalPrice,
      status: "ACTIVE",
      paymentStatus: "PENDING",
      currentGame: params.currentGame || consoleItem.installedGames[0] || "EA Sports FC 24",
      notes: params.notes || null,
    };

    store.sessions.unshift(newSession);
    consoleItem.status = "IN_USE";
    consoleItem.currentGame = newSession.currentGame;
    consoleItem.activeSessionId = newSession.id;
    consoleItem.activeSession = newSession;

    return { success: true, message: `Sesi konsol berhasil dimulai di ${consoleItem.stationNumber}`, session: newSession };
  }
}

export function addSessionTime(sessionId: string, additionalMinutes: number): { success: boolean; message: string; session?: SessionItem } {
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) return { success: false, message: "Sesi tidak ditemukan" };
  if (session.status !== "ACTIVE") return { success: false, message: "Sesi sudah tidak aktif" };

  const additionalHours = additionalMinutes / 60;
  const additionalCost = Math.round(additionalHours * session.hourlyRate);

  session.durationMinutes += additionalMinutes;
  session.remainingMinutes += additionalMinutes;
  session.totalPrice += additionalCost;

  return { success: true, message: `Waktu berhasil ditambahkan (+${additionalMinutes} menit)`, session };
}

export function endSessionAndCheckout(params: {
  sessionId: string;
  totalAmount: number;
  cashReceived: number;
  cashierName?: string;
  notes?: string | null;
}): { success: boolean; message: string; transaction?: TransactionRecord } {
  const session = store.sessions.find((s) => s.id === params.sessionId);
  if (!session) return { success: false, message: "Sesi tidak ditemukan" };

  if (params.cashReceived < params.totalAmount) {
    return {
      success: false,
      message: `Uang tunai kurang! Diterima: ${params.cashReceived}, Total: ${params.totalAmount}`,
    };
  }

  const change = params.cashReceived - params.totalAmount;

  // Mark session completed
  session.status = "COMPLETED";
  session.paymentStatus = "PAID";
  session.endTime = new Date().toISOString();
  session.remainingMinutes = 0;

  // Free up station
  if (session.type === "PC" && session.pcId) {
    const pc = store.pcs.find((p) => p.id === session.pcId);
    if (pc) {
      pc.status = "AVAILABLE";
      pc.currentGame = null;
      pc.activeSessionId = null;
      pc.activeSession = null;
    }
  } else if (session.type === "CONSOLE" && session.consoleId) {
    const con = store.consoles.find((c) => c.id === session.consoleId);
    if (con) {
      con.status = "AVAILABLE";
      con.currentGame = null;
      con.activeSessionId = null;
      con.activeSession = null;
    }
  }

  // Create Transaction Record
  const newTrx: TransactionRecord = {
    id: `trx-${Date.now()}`,
    invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
    memberId: session.memberId,
    memberName: session.memberName || session.guestName || "Guest",
    cashierName: params.cashierName || "Admin",
    type: "SESSION",
    subtotal: params.totalAmount,
    tax: 0,
    discount: 0,
    totalAmount: params.totalAmount,
    cashReceived: params.cashReceived,
    cashChange: change,
    paymentMethod: "CASH",
    status: "PAID",
    items: [
      {
        id: `item-${Date.now()}`,
        description: `Biling ${session.type} (${session.pcStationNumber || session.consoleStationNumber}) - ${session.durationMinutes} menit`,
        unitPrice: session.totalPrice,
        quantity: 1,
        subtotal: session.totalPrice,
      },
    ],
    createdAt: new Date().toISOString(),
  };

  store.transactions.unshift(newTrx);

  return { success: true, message: "Sesi selesai & pembayaran tunai sukses!", transaction: newTrx };
}

// POS & Store checkout
export function checkoutPOS(params: {
  memberId?: string | null;
  items: { productId: string; quantity: number; unitPrice: number }[];
  cashReceived: number;
  cashierName?: string;
  notes?: string | null;
}): { success: boolean; message: string; transaction?: TransactionRecord } {
  // Validate stock
  for (const item of params.items) {
    const prod = store.products.find((p) => p.id === item.productId);
    if (!prod) return { success: false, message: `Produk ID ${item.productId} tidak ditemukan` };
    if (prod.stock < item.quantity) {
      return { success: false, message: `Stok produk "${prod.name}" tidak mencukupi! Sisa stok: ${prod.stock}` };
    }
  }

  // Calculate total
  const subtotal = params.items.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);

  if (params.cashReceived < subtotal) {
    return {
      success: false,
      message: `Uang tunai kurang! Diterima: ${params.cashReceived}, Total: ${subtotal}`,
    };
  }

  const change = params.cashReceived - subtotal;
  const member = params.memberId ? store.members.find((m) => m.id === params.memberId) : null;

  // Decrease stock & log inventory
  const transactionItems = params.items.map((item) => {
    const prod = store.products.find((p) => p.id === item.productId)!;
    const prevStock = prod.stock;
    prod.stock -= item.quantity;

    store.inventoryLogs.unshift({
      id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: prod.id,
      productName: prod.name,
      action: "STOCK_OUT",
      quantity: item.quantity,
      previousStock: prevStock,
      newStock: prod.stock,
      reason: "Penjualan POS Kasir",
      recordedBy: params.cashierName || "Kasir",
      createdAt: new Date().toISOString(),
    });

    return {
      id: `trx-it-${Date.now()}-${Math.random()}`,
      description: prod.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.unitPrice * item.quantity,
    };
  });

  const newTrx: TransactionRecord = {
    id: `trx-${Date.now()}`,
    invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
    memberId: member ? member.id : null,
    memberName: member ? member.fullName : "Pelanggan Toko",
    cashierName: params.cashierName || "Admin",
    type: "STORE",
    subtotal,
    tax: 0,
    discount: 0,
    totalAmount: subtotal,
    cashReceived: params.cashReceived,
    cashChange: change,
    paymentMethod: "CASH",
    status: "PAID",
    items: transactionItems,
    createdAt: new Date().toISOString(),
  };

  store.transactions.unshift(newTrx);

  return { success: true, message: "Pembayaran kasir toko berhasil!", transaction: newTrx };
}

// Inventory Adjustment
export function adjustInventoryStock(params: {
  productId: string;
  action: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";
  quantity: number;
  reason: string;
  recordedBy?: string;
}): { success: boolean; message: string; product?: ProductItem } {
  const prod = store.products.find((p) => p.id === params.productId);
  if (!prod) return { success: false, message: "Produk tidak ditemukan" };

  const prevStock = prod.stock;
  let newStock = prevStock;

  if (params.action === "STOCK_IN") {
    newStock = prevStock + params.quantity;
  } else if (params.action === "STOCK_OUT") {
    if (prevStock < params.quantity) {
      return { success: false, message: "Kuantitas keluar melebihi stok yang tersedia!" };
    }
    newStock = prevStock - params.quantity;
  } else if (params.action === "ADJUSTMENT") {
    newStock = params.quantity;
  }

  prod.stock = newStock;

  store.inventoryLogs.unshift({
    id: `inv-${Date.now()}`,
    productId: prod.id,
    productName: prod.name,
    action: params.action,
    quantity: params.quantity,
    previousStock: prevStock,
    newStock,
    reason: params.reason,
    recordedBy: params.recordedBy || "Admin",
    createdAt: new Date().toISOString(),
  });

  return { success: true, message: "Stok inventaris berhasil diperbarui", product: prod };
}

// Booking System with Conflict Prevention
export function createBooking(params: {
  memberId: string;
  type: "PC" | "CONSOLE";
  stationId: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:mm
  durationHours: number;
  notes?: string | null;
}): { success: boolean; message: string; booking?: BookingItem } {
  const member = store.members.find((m) => m.id === params.memberId);
  if (!member) return { success: false, message: "Member tidak terdaftar" };

  let stationNumber = "";
  let hourlyRate = 10000;

  if (params.type === "PC") {
    const pc = store.pcs.find((p) => p.id === params.stationId);
    if (!pc) return { success: false, message: "PC tidak ditemukan" };
    stationNumber = pc.stationNumber;
    hourlyRate = pc.hourlyRate;
  } else {
    const con = store.consoles.find((c) => c.id === params.stationId);
    if (!con) return { success: false, message: "Konsol tidak ditemukan" };
    stationNumber = con.stationNumber;
    hourlyRate = con.hourlyRate;
  }

  // Calculate start and end time strings
  const [startH, startM] = params.startTime.split(":").map(Number);
  const endH = startH + params.durationHours;
  const endTime = `${endH.toString().padStart(2, "0")}:${startM.toString().padStart(2, "0")}`;

  // Check Conflict on same date and station
  const conflict = store.bookings.find((b) => {
    if (b.status === "CANCELLED") return false;
    if (b.bookingDate !== params.bookingDate) return false;
    const sameStation = params.type === "PC" ? b.pcId === params.stationId : b.consoleId === params.stationId;
    if (!sameStation) return false;

    // Time overlap check: startA < endB and endA > startB
    return params.startTime < b.endTime && endTime > b.startTime;
  });

  if (conflict) {
    return {
      success: false,
      message: `Jadwal bentrok! Station ${stationNumber} sudah dibooking pada jam ${conflict.startTime} - ${conflict.endTime} oleh ${conflict.memberName}`,
    };
  }

  const newBooking: BookingItem = {
    id: `book-${Date.now()}`,
    bookingCode: `BK-${params.bookingDate.replace(/-/g, "")}-${Math.floor(10 + Math.random() * 90)}`,
    type: params.type,
    pcId: params.type === "PC" ? params.stationId : null,
    pcStationNumber: params.type === "PC" ? stationNumber : null,
    consoleId: params.type === "CONSOLE" ? params.stationId : null,
    consoleStationNumber: params.type === "CONSOLE" ? stationNumber : null,
    memberId: member.id,
    memberName: `${member.fullName} (${member.username})`,
    bookingDate: params.bookingDate,
    startTime: params.startTime,
    endTime,
    durationHours: params.durationHours,
    totalPrice: params.durationHours * hourlyRate,
    status: "CONFIRMED",
    notes: params.notes || null,
  };

  store.bookings.unshift(newBooking);

  return { success: true, message: `Booking berhasil dibuat untuk ${stationNumber}`, booking: newBooking };
}

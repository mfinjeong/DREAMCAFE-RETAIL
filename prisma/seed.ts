import { PrismaClient, StationZone, PCStatus, ConsoleType, ConsoleStatus, MemberTier, SessionStatus, PaymentStatus, BookingStatus } from "@prisma/client";

const prisma = new PrismaClient();

export const SEED_DATA = {
  users: [
    {
      username: "admin_dream",
      email: "admin@dreamcafe.id",
      passwordHash: "scrypt:dummy_hash_for_demo",
      fullName: "Budi Santoso",
      role: "ADMIN" as const,
    },
    {
      username: "op_reza",
      email: "reza@dreamcafe.id",
      passwordHash: "scrypt:dummy_hash_for_demo",
      fullName: "Reza Pratama",
      role: "OPERATOR" as const,
    },
  ],
  categories: [
    { name: "Minuman Dingin", slug: "beverages", description: "Soft drink, energy drink, kopi dingin" },
    { name: "Makanan Berat", slug: "food", description: "Mie instan, nasi goreng, bento" },
    { name: "Snack & Cemilan", slug: "snacks", description: "Keripik, kacang, wafer" },
    { name: "Gaming Gear & Aksesoris", slug: "accessories", description: "Finger sleeve, mousepad, kabel" },
  ],
  products: [
    { name: "Teh Pucuk Harum 350ml", barcode: "8992753123456", categorySlug: "beverages", price: 6000, costPrice: 3800, stock: 48, minStockAlert: 10, unit: "botol" },
    { name: "Kratingdaeng Red Bull 150ml", barcode: "8992753123457", categorySlug: "beverages", price: 12000, costPrice: 8500, stock: 24, minStockAlert: 8, unit: "botol" },
    { name: "Kopi Kenangan Mantan Can", barcode: "8992753123458", categorySlug: "beverages", price: 15000, costPrice: 10500, stock: 30, minStockAlert: 5, unit: "kaleng" },
    { name: "Aqua 600ml", barcode: "8992753123459", categorySlug: "beverages", price: 5000, costPrice: 2800, stock: 60, minStockAlert: 15, unit: "botol" },
    { name: "Indomie Goreng Double + Telur", barcode: "8992753123460", categorySlug: "food", price: 18000, costPrice: 9000, stock: 50, minStockAlert: 12, unit: "porsi" },
    { name: "Nasi Goreng Spesial DREAMCAFE", barcode: "8992753123461", categorySlug: "food", price: 25000, costPrice: 13000, stock: 35, minStockAlert: 8, unit: "porsi" },
    { name: "Chitatos Sapi Panggang 68g", barcode: "8992753123462", categorySlug: "snacks", price: 13000, costPrice: 9000, stock: 25, minStockAlert: 6, unit: "bungkus" },
    { name: "Pringles Original 107g", barcode: "8992753123463", categorySlug: "snacks", price: 24000, costPrice: 17500, stock: 15, minStockAlert: 4, unit: "tabung" },
    { name: "Gaming Finger Sleeve (Pair)", barcode: "8992753123464", categorySlug: "accessories", price: 15000, costPrice: 7000, stock: 18, minStockAlert: 5, unit: "pasang" },
  ],
  members: [
    {
      memberCode: "DC-00101",
      fullName: "Muhammad Fadhil",
      username: "Vandal_God",
      phoneNumber: "081288990011",
      email: "fadhil.vandal@gmail.com",
      tier: MemberTier.VIP,
      balance: 150000,
      dreamCoins: 1250,
      xp: 8400,
      level: 18,
    },
    {
      memberCode: "DC-00102",
      fullName: "Dimas Arya Putra",
      username: "ShadowSniper",
      phoneNumber: "081399881122",
      email: "dimas.arya@gmail.com",
      tier: MemberTier.PRO,
      balance: 320000,
      dreamCoins: 3100,
      xp: 15200,
      level: 32,
    },
    {
      memberCode: "DC-00103",
      fullName: "Kevin Christian",
      username: "Acedia",
      phoneNumber: "081122334455",
      email: "kevin.christian@gmail.com",
      tier: MemberTier.REGULAR,
      balance: 45000,
      dreamCoins: 350,
      xp: 2300,
      level: 5,
    },
    {
      memberCode: "DC-00104",
      fullName: "Ananda Rizky",
      username: "RizkyClutch",
      phoneNumber: "085677889900",
      email: "ananda.rizky@gmail.com",
      tier: MemberTier.VIP,
      balance: 95000,
      dreamCoins: 890,
      xp: 6100,
      level: 14,
    },
    {
      memberCode: "DC-00105",
      fullName: "Farhan Maulana",
      username: "HanzoMain",
      phoneNumber: "087711223344",
      email: "farhan.m@gmail.com",
      tier: MemberTier.REGULAR,
      balance: 20000,
      dreamCoins: 120,
      xp: 1100,
      level: 3,
    },
  ],
  pcs: [
    {
      stationNumber: "PC 01",
      name: "Predator Station 01",
      zone: StationZone.REGULAR,
      status: PCStatus.AVAILABLE,
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
    },
    {
      stationNumber: "PC 02",
      name: "Predator Station 02",
      zone: StationZone.VIP,
      status: PCStatus.IN_USE,
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
    },
    {
      stationNumber: "PC 03",
      name: "Predator Station 03",
      zone: StationZone.VIP,
      status: PCStatus.AVAILABLE,
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
    },
    {
      stationNumber: "PC 04",
      name: "Predator Station 04",
      zone: StationZone.REGULAR,
      status: PCStatus.IN_USE,
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
    },
    {
      stationNumber: "PC 05",
      name: "Predator Station 05",
      zone: StationZone.REGULAR,
      status: PCStatus.AVAILABLE,
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
    },
    {
      stationNumber: "PC 06",
      name: "Predator Station 06",
      zone: StationZone.ARENA,
      status: PCStatus.IN_USE,
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
    },
    {
      stationNumber: "PC 07",
      name: "Predator Station 07",
      zone: StationZone.ARENA,
      status: PCStatus.AVAILABLE,
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
    },
    {
      stationNumber: "PC 08",
      name: "Predator Station 08",
      zone: StationZone.REGULAR,
      status: PCStatus.AVAILABLE,
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
    },
    {
      stationNumber: "PC 09",
      name: "Predator Station 09",
      zone: StationZone.REGULAR,
      status: PCStatus.OFFLINE,
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
    },
    {
      stationNumber: "PC 10",
      name: "Predator Station 10",
      zone: StationZone.ARENA,
      status: PCStatus.MAINTENANCE,
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
    },
  ],
  consoles: [
    {
      stationNumber: "CON 01",
      name: "PlayStation 5 Lounge A",
      consoleType: ConsoleType.PS5,
      status: ConsoleStatus.AVAILABLE,
      hourlyRate: 20000,
      controllersCount: 2,
      installedGames: ["EA Sports FC 24", "Tekken 8", "Spider-Man 2", "Mortal Kombat 1", "Gran Turismo 7"],
      specsDisplay: "Sony Bravia XR 55\" 4K 120Hz OLED + DualSense Edge",
      currentGame: null,
    },
    {
      stationNumber: "CON 02",
      name: "PlayStation 5 Lounge B",
      consoleType: ConsoleType.PS5,
      status: ConsoleStatus.IN_USE,
      hourlyRate: 20000,
      controllersCount: 4,
      installedGames: ["EA Sports FC 24", "NBA 2K24", "Tekken 8", "Street Fighter 6", "It Takes Two"],
      specsDisplay: "LG C3 55\" 4K 120Hz OLED + 4x DualSense Controllers",
      currentGame: "EA Sports FC 24",
    },
    {
      stationNumber: "CON 03",
      name: "PlayStation 4 Pro Arena",
      consoleType: ConsoleType.PS4,
      status: ConsoleStatus.AVAILABLE,
      hourlyRate: 15000,
      controllersCount: 2,
      installedGames: ["PES 2021 Season Update", "FIFA 23", "Tekken 7", "GTA V", "God of War Ragnarok"],
      specsDisplay: "Samsung 50\" Crystal UHD 4K",
      currentGame: null,
    },
    {
      stationNumber: "CON 04",
      name: "Nintendo Switch Party Zone",
      consoleType: ConsoleType.SWITCH,
      status: ConsoleStatus.AVAILABLE,
      hourlyRate: 15000,
      controllersCount: 4,
      installedGames: ["Super Smash Bros Ultimate", "Mario Kart 8 Deluxe", "Overcooked 2", "Mario Party Superstars"],
      specsDisplay: "Xiaomi 55\" 4K UHD + 4x Joy-Con + 2x Pro Controller",
      currentGame: null,
    },
  ],
  games: [
    {
      title: "Valorant",
      genre: "Tactical FPS",
      publisher: "Riot Games",
      minGpuRequired: "GTX 1050 Ti",
      popularityRank: 1,
      isInstalledOnPc: true,
      isInstalledConsole: false,
      tags: ["Competitive", "Esports", "Shooter", "5v5"],
    },
    {
      title: "Counter-Strike 2",
      genre: "Competitive FPS",
      publisher: "Valve Corporation",
      minGpuRequired: "RTX 3060",
      popularityRank: 2,
      isInstalledOnPc: true,
      isInstalledConsole: false,
      tags: ["FPS", "Classic", "Tactical", "Esports"],
    },
    {
      title: "Dota 2",
      genre: "MOBA",
      publisher: "Valve Corporation",
      minGpuRequired: "GTX 1650",
      popularityRank: 3,
      isInstalledOnPc: true,
      isInstalledConsole: false,
      tags: ["Strategy", "MOBA", "Esports", "Team"],
    },
    {
      title: "EA Sports FC 24",
      genre: "Sports / Football",
      publisher: "Electronic Arts",
      minGpuRequired: "RTX 3060",
      popularityRank: 4,
      isInstalledOnPc: true,
      isInstalledConsole: true,
      tags: ["Football", "Multiplayer", "Controller Friendly"],
    },
    {
      title: "Tekken 8",
      genre: "Fighting Game",
      publisher: "Bandai Namco",
      minGpuRequired: "RTX 3060 Ti",
      popularityRank: 5,
      isInstalledOnPc: true,
      isInstalledConsole: true,
      tags: ["Fighting", "Versus", "Arcade"],
    },
    {
      title: "Mobile Legends",
      genre: "MOBA",
      publisher: "Moonton",
      minGpuRequired: "GTX 1050",
      popularityRank: 6,
      isInstalledOnPc: true,
      isInstalledConsole: false,
      tags: ["MOBA", "Emulator", "Mobile Esports", "5v5"],
    },
    {
      title: "Genshin Impact",
      genre: "Action RPG",
      publisher: "HoYoverse",
      minGpuRequired: "GTX 1660",
      popularityRank: 7,
      isInstalledOnPc: true,
      isInstalledConsole: true,
      tags: ["Open World", "RPG", "Anime", "Co-op"],
    },
    {
      title: "Honkai: Star Rail",
      genre: "Turn-Based RPG",
      publisher: "HoYoverse",
      minGpuRequired: "GTX 1060",
      popularityRank: 8,
      isInstalledOnPc: true,
      isInstalledConsole: true,
      tags: ["Sci-Fi", "Turn-Based", "RPG", "Anime"],
    },
    {
      title: "Minecraft",
      genre: "Sandbox / Survival",
      publisher: "Mojang Studios",
      minGpuRequired: "GTX 1050",
      popularityRank: 9,
      isInstalledOnPc: true,
      isInstalledConsole: true,
      tags: ["Sandbox", "Survival", "Multiplayer", "Creative"],
    },
  ],
};

async function main() {
  console.log("🌱 Starting DREAMCAFE Database Seeding...");

  // Seed Users
  for (const user of SEED_DATA.users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: user,
    });
  }

  // Seed Categories
  const categoryMap = new Map<string, string>();
  for (const cat of SEED_DATA.categories) {
    const created = await prisma.productCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap.set(cat.slug, created.id);
  }

  // Seed Products
  for (const prod of SEED_DATA.products) {
    const categoryId = categoryMap.get(prod.categorySlug);
    if (!categoryId) continue;
    await prisma.product.upsert({
      where: { barcode: prod.barcode },
      update: {},
      create: {
        name: prod.name,
        barcode: prod.barcode,
        categoryId,
        price: prod.price,
        costPrice: prod.costPrice,
        stock: prod.stock,
        minStockAlert: prod.minStockAlert,
        unit: prod.unit,
      },
    });
  }

  // Seed Members
  const memberMap = new Map<string, string>();
  for (const m of SEED_DATA.members) {
    const created = await prisma.member.upsert({
      where: { memberCode: m.memberCode },
      update: {},
      create: m,
    });
    memberMap.set(m.username, created.id);
  }

  // Seed PCs
  const pcMap = new Map<string, string>();
  for (const pc of SEED_DATA.pcs) {
    const created = await prisma.pC.upsert({
      where: { stationNumber: pc.stationNumber },
      update: {},
      create: pc,
    });
    pcMap.set(pc.stationNumber, created.id);
  }

  // Seed Consoles
  const consoleMap = new Map<string, string>();
  for (const con of SEED_DATA.consoles) {
    const created = await prisma.console.upsert({
      where: { stationNumber: con.stationNumber },
      update: {},
      create: con,
    });
    consoleMap.set(con.stationNumber, created.id);
  }

  // Seed Games
  for (const g of SEED_DATA.games) {
    await prisma.game.upsert({
      where: { title: g.title },
      update: {},
      create: g,
    });
  }

  // Seed active demo sessions
  const fadhilId = memberMap.get("Vandal_God");
  const pc2Id = pcMap.get("PC 02");
  if (pc2Id && fadhilId) {
    const now = new Date();
    const startTime = new Date(now.getTime() - 75 * 60 * 1000); // 75 mins ago
    await prisma.session.create({
      data: {
        sessionNumber: "SES-20261005-001",
        type: "PC",
        pcId: pc2Id,
        memberId: fadhilId,
        startTime,
        durationMinutes: 120,
        remainingMinutes: 45,
        hourlyRate: 15000,
        totalPrice: 30000,
        status: SessionStatus.ACTIVE,
        paymentStatus: PaymentStatus.PAID,
        notes: "Valorant ranked match with squad",
      },
    });
  }

  console.log("✅ DREAMCAFE Database Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

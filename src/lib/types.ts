export type PCStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OFFLINE";
export type ConsoleType = "PS5" | "PS4" | "SWITCH";
export type ConsoleStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OFFLINE";
export type StationZone = "REGULAR" | "VIP" | "ARENA";
export type SessionType = "PC" | "CONSOLE";
export type SessionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED";
export type PaymentMethod = "CASH";
export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type MemberTier = "REGULAR" | "VIP" | "PRO";
export type InventoryAction = "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";
export type MaintenanceStatus = "SCHEDULED" | "IN_PROGRESS" | "RESOLVED";

export interface PCStation {
  id: string;
  stationNumber: string;
  name: string;
  zone: StationZone;
  status: PCStatus;
  hourlyRate: number;
  ipAddress?: string | null;
  macAddress?: string | null;
  specsCpu: string;
  specsGpu: string;
  specsRam: string;
  specsMonitor: string;
  specsStorage: string;
  specsPeripherals: string;
  currentGame?: string | null;
  activeSessionId?: string | null;
  activeSession?: SessionItem | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConsoleStation {
  id: string;
  stationNumber: string;
  name: string;
  consoleType: ConsoleType;
  status: ConsoleStatus;
  hourlyRate: number;
  controllersCount: number;
  installedGames: string[];
  specsDisplay: string;
  currentGame?: string | null;
  activeSessionId?: string | null;
  activeSession?: SessionItem | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionItem {
  id: string;
  sessionNumber: string;
  type: SessionType;
  pcId?: string | null;
  pcStationNumber?: string | null;
  consoleId?: string | null;
  consoleStationNumber?: string | null;
  memberId?: string | null;
  memberName?: string | null;
  guestName?: string | null;
  startTime: string; // ISO
  endTime?: string | null;
  durationMinutes: number;
  remainingMinutes: number;
  hourlyRate: number;
  totalPrice: number;
  status: SessionStatus;
  paymentStatus: PaymentStatus;
  currentGame?: string | null;
  notes?: string | null;
}

export interface MemberItem {
  id: string;
  memberCode: string;
  fullName: string;
  username: string;
  phoneNumber?: string | null;
  email?: string | null;
  tier: MemberTier;
  balance: number;
  dreamCoins: number;
  xp: number;
  level: number;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  totalSessions?: number;
  totalTransactions?: number;
}

export interface ProductItem {
  id: string;
  name: string;
  barcode?: string | null;
  categoryId: string;
  categoryName?: string;
  price: number;
  costPrice: number;
  stock: number;
  minStockAlert: number;
  unit: string;
  isActive: boolean;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
  lastMovement?: {
    action: InventoryAction;
    quantity: number;
    createdAt: string;
    reason: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventorySummaryDTO {
  totalProducts: number;
  totalStock: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValuation: number;
}

export interface ProductCategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface POSCartItem {
  product: ProductItem;
  quantity: number;
}

export interface InventoryLogItem {
  id: string;
  productId: string;
  productName: string;
  categoryName?: string;
  action: InventoryAction;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  recordedBy: string;
  createdAt: string;
}

export interface TransactionItemDTO {
  id: string;
  description: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface TransactionRecord {
  id: string;
  invoiceNumber: string;
  memberId?: string | null;
  memberName?: string | null;
  cashierName: string;
  type: "SESSION" | "STORE" | "MIXED";
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  cashReceived: number;
  cashChange: number;
  paymentMethod: "CASH";
  status: "PAID";
  items: TransactionItemDTO[];
  createdAt: string;
}

export interface BookingItem {
  id: string;
  bookingCode: string;
  type: SessionType;
  pcId?: string | null;
  pcStationNumber?: string | null;
  consoleId?: string | null;
  consoleStationNumber?: string | null;
  stationId?: string;
  stationNumber?: string;
  stationName?: string;
  memberId: string;
  memberName: string;
  username?: string | null;
  phoneNumber?: string | null;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationHours: number;
  totalPrice: number;
  status: BookingStatus;
  notes?: string | null;
  createdAt?: string;
}

export interface GameItem {
  id: string;
  title: string;
  genre: string;
  publisher: string;
  minGpuRequired: string;
  popularityRank: number;
  isInstalledOnPc: boolean;
  isInstalledConsole: boolean;
  tags: string[];
}

export interface MaintenanceItem {
  id: string;
  type: SessionType;
  stationId: string | null;
  stationNumber: string;
  stationName: string;
  title: string;
  description: string;
  cost: number;
  technician: string;
  status: MaintenanceStatus;
  reportedAt: string;
  resolvedAt?: string | null;
}

export interface DailyRevenueItem {
  date: string;
  revenue: number;
  transactionCount: number;
  sessionRevenue: number;
  storeRevenue: number;
}

export interface RevenueSummaryDTO {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  cashReceived: number;
  cashChange: number;
  sessionRevenue: number;
  sessionCount: number;
  storeRevenue: number;
  storeCount: number;
  mixedRevenue: number;
  mixedCount: number;
}

export interface SessionAnalyticsDTO {
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  cancelledSessions: number;
  totalPlayHours: number;
  averageDurationMinutes: number;
  totalSessionRevenue: number;
  pcSessionsCount: number;
  pcPlayHours: number;
  pcRevenue: number;
  consoleSessionsCount: number;
  consolePlayHours: number;
  consoleRevenue: number;
}

export interface StationPerformanceItem {
  id: string;
  stationNumber: string;
  name: string;
  type: "PC" | "CONSOLE";
  sessionCount: number;
  totalPlayHours: number;
  revenue: number;
}

export interface StationUtilizationDTO {
  pcUsageHours: number;
  consoleUsageHours: number;
  totalSessions: number;
  mostUsedPC: string | null;
  mostUsedConsole: string | null;
  leastUsedStation: string | null;
  stations: StationPerformanceItem[];
}

export interface BookingAnalyticsDTO {
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  totalBookingValue: number;
  completionRate: number;
}

export interface MemberAnalyticsDTO {
  totalMembers: number;
  newMembers: number;
  activeMembers: number;
  memberRevenue: number;
  memberTransactionCount: number;
  guestRevenue: number;
  guestTransactionCount: number;
}

export interface TopProductItem {
  productId: string;
  productName: string;
  categoryName?: string;
  unitsSold: number;
  revenue: number;
  averagePrice: number;
}

export interface ProductAnalyticsDTO {
  storeRevenue: number;
  totalUnitsSold: number;
  uniqueProductsSold: number;
  topProducts: TopProductItem[];
}

export interface InventoryAnalyticsDTO {
  stockInCount: number;
  stockInUnits: number;
  stockOutCount: number;
  stockOutUnits: number;
  adjustmentCount: number;
  totalStockMovement: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValuation: number;
}

export interface ComprehensiveReportDTO {
  period: string;
  startDate: string;
  endDate: string;
  revenueSummary: RevenueSummaryDTO;
  dailyRevenue: DailyRevenueItem[];
  sessionAnalytics: SessionAnalyticsDTO;
  stationUtilization: StationUtilizationDTO;
  bookingAnalytics: BookingAnalyticsDTO;
  memberAnalytics: MemberAnalyticsDTO;
  productAnalytics: ProductAnalyticsDTO;
  inventoryAnalytics: InventoryAnalyticsDTO;
  recentTransactions: TransactionRecord[];
}

// ==========================================
// GAME LIBRARY & GAMING PROFILE TYPES
// ==========================================

export interface GameItem {
  id: string;
  title: string;
  slug?: string | null;
  genre: string;
  publisher: string;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  minGpuRequired: string;
  popularityRank: number;
  isInstalledOnPc: boolean;
  isInstalledConsole: boolean;
  isActive: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  totalSessions?: number;
  totalPlayMinutes?: number;
}

export interface MemberGameStatItem {
  id: string;
  memberId: string;
  gameId: string;
  gameTitle: string;
  gameGenre: string;
  gameIconUrl?: string | null;
  totalSessions: number;
  totalPlayMinutes: number;
  totalPlayHours: number;
  wins: number;
  losses: number;
  xp: number;
  lastPlayedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GamingActivityItem {
  id: string;
  sessionNumber: string;
  gameId?: string | null;
  gameTitle?: string | null;
  stationType: string;
  stationNumber: string;
  durationMinutes: number;
  startTime: string;
  endTime?: string | null;
  status: string;
  xpEarned: number;
}


export interface GamingProfileDTO {
  member: {
    id: string;
    memberCode: string;
    fullName: string;
    username: string;
    tier: MemberTier;
    avatarUrl?: string | null;
    dreamCoins: number;
    xp: number;
    level: number;
    createdAt: string;
  };
  stats: {
    totalSessions: number;
    totalPlayMinutes: number;
    totalPlayHours: number;
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    progressPercent: number;
    xpRemaining: number;
  };
  favoriteGames: MemberGameStatItem[];
  gamesPlayed: MemberGameStatItem[];
  recentActivity: GamingActivityItem[];
}
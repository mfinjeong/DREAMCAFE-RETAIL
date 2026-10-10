import { prisma } from "@/lib/prisma";
import { PaymentStatus, SessionStatus, BookingStatus, InventoryAction } from "@prisma/client";
import {
  ComprehensiveReportDTO,
  RevenueSummaryDTO,
  DailyRevenueItem,
  SessionAnalyticsDTO,
  StationUtilizationDTO,
  StationPerformanceItem,
  BookingAnalyticsDTO,
  MemberAnalyticsDTO,
  ProductAnalyticsDTO,
  TopProductItem,
  InventoryAnalyticsDTO,
  TransactionRecord,
} from "@/lib/types";

export interface ReportFilterParams {
  period?: "today" | "yesterday" | "this_week" | "this_month" | "custom";
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

// Format UTC date to YYYY-MM-DD in Asia/Jakarta timezone
export function getJakartaDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Convert YYYY-MM-DD to exact UTC boundaries for Asia/Jakarta (UTC+7)
export function getJakartaDateBoundaries(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  const end = new Date(`${dateStr}T23:59:59.999+07:00`);
  return { start, end };
}

// Resolve user-selected period or date range into explicit Jakarta date boundaries
export function resolveDateRange(params: ReportFilterParams = {}): {
  period: string;
  startDateStr: string;
  endDateStr: string;
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const todayStr = getJakartaDateString(now);
  const period = params.period || "today";

  let startDateStr = todayStr;
  let endDateStr = todayStr;

  if (period === "yesterday") {
    const d = new Date(`${todayStr}T12:00:00+07:00`);
    d.setDate(d.getDate() - 1);
    const yesterdayStr = getJakartaDateString(d);
    startDateStr = yesterdayStr;
    endDateStr = yesterdayStr;
  } else if (period === "this_week") {
    const d = new Date(`${todayStr}T12:00:00+07:00`);
    const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek);
    startDateStr = getJakartaDateString(monday);
    endDateStr = todayStr;
  } else if (period === "this_month") {
    const parts = todayStr.split("-");
    startDateStr = `${parts[0]}-${parts[1]}-01`;
    endDateStr = todayStr;
  } else if (period === "custom") {
    startDateStr = params.startDate || todayStr;
    endDateStr = params.endDate || todayStr;
  }

  const { start: startDate } = getJakartaDateBoundaries(startDateStr);
  const { end: endDate } = getJakartaDateBoundaries(endDateStr);

  return {
    period,
    startDateStr,
    endDateStr,
    startDate,
    endDate,
  };
}

export async function getRevenueSummary(startDate: Date, endDate: Date): Promise<RevenueSummaryDTO> {
  const transactions = await prisma.transaction.findMany({
    where: {
      status: PaymentStatus.PAID,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      totalAmount: true,
      cashReceived: true,
      cashChange: true,
      type: true,
    },
  });

  let totalRevenue = 0;
  let cashReceived = 0;
  let cashChange = 0;
  let sessionRevenue = 0;
  let sessionCount = 0;
  let storeRevenue = 0;
  let storeCount = 0;
  let mixedRevenue = 0;
  let mixedCount = 0;

  for (const t of transactions) {
    const amount = Math.round(t.totalAmount);
    totalRevenue += amount;
    cashReceived += Math.round(t.cashReceived);
    cashChange += Math.round(t.cashChange);

    if (t.type === "SESSION") {
      sessionRevenue += amount;
      sessionCount++;
    } else if (t.type === "STORE") {
      storeRevenue += amount;
      storeCount++;
    } else if (t.type === "MIXED") {
      mixedRevenue += amount;
      mixedCount++;
    }
  }

  const totalTransactions = transactions.length;
  const averageTransactionValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  return {
    totalRevenue,
    totalTransactions,
    averageTransactionValue,
    cashReceived,
    cashChange,
    sessionRevenue,
    sessionCount,
    storeRevenue,
    storeCount,
    mixedRevenue,
    mixedCount,
  };
}

export async function getDailyRevenue(startDate: Date, endDate: Date): Promise<DailyRevenueItem[]> {
  const transactions = await prisma.transaction.findMany({
    where: {
      status: PaymentStatus.PAID,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      totalAmount: true,
      type: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const dailyMap = new Map<string, { revenue: number; count: number; sessionRev: number; storeRev: number }>();

  for (const t of transactions) {
    const dayKey = getJakartaDateString(new Date(t.createdAt));
    const current = dailyMap.get(dayKey) || { revenue: 0, count: 0, sessionRev: 0, storeRev: 0 };
    const amount = Math.round(t.totalAmount);

    current.revenue += amount;
    current.count++;
    if (t.type === "SESSION") current.sessionRev += amount;
    if (t.type === "STORE" || t.type === "MIXED") current.storeRev += amount;

    dailyMap.set(dayKey, current);
  }

  const result: DailyRevenueItem[] = [];
  const sortedKeys = Array.from(dailyMap.keys()).sort();

  for (const key of sortedKeys) {
    const data = dailyMap.get(key)!;
    result.push({
      date: key,
      revenue: data.revenue,
      transactionCount: data.count,
      sessionRevenue: data.sessionRev,
      storeRevenue: data.storeRev,
    });
  }

  return result;
}

export async function getSessionAnalytics(startDate: Date, endDate: Date): Promise<SessionAnalyticsDTO> {
  const sessions = await prisma.session.findMany({
    where: {
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      type: true,
      status: true,
      durationMinutes: true,
      totalPrice: true,
      paymentStatus: true,
    },
  });

  let completedSessions = 0;
  let activeSessions = 0;
  let cancelledSessions = 0;
  let totalPlayMinutes = 0;
  let totalSessionRevenue = 0;

  let pcSessionsCount = 0;
  let pcPlayMinutes = 0;
  let pcRevenue = 0;

  let consoleSessionsCount = 0;
  let consolePlayMinutes = 0;
  let consoleRevenue = 0;

  for (const s of sessions) {
    if (s.status === SessionStatus.COMPLETED) completedSessions++;
    if (s.status === SessionStatus.ACTIVE) activeSessions++;
    if (s.status === SessionStatus.CANCELLED) cancelledSessions++;

    const minutes = s.durationMinutes || 0;
    totalPlayMinutes += minutes;

    const price = Math.round(s.totalPrice || 0);
    if (s.paymentStatus === PaymentStatus.PAID || s.status === SessionStatus.COMPLETED) {
      totalSessionRevenue += price;
    }

    if (s.type === "PC") {
      pcSessionsCount++;
      pcPlayMinutes += minutes;
      if (s.paymentStatus === PaymentStatus.PAID || s.status === SessionStatus.COMPLETED) {
        pcRevenue += price;
      }
    } else {
      consoleSessionsCount++;
      consolePlayMinutes += minutes;
      if (s.paymentStatus === PaymentStatus.PAID || s.status === SessionStatus.COMPLETED) {
        consoleRevenue += price;
      }
    }
  }

  const totalSessions = sessions.length;
  const totalPlayHours = Math.round((totalPlayMinutes / 60) * 10) / 10;
  const pcPlayHours = Math.round((pcPlayMinutes / 60) * 10) / 10;
  const consolePlayHours = Math.round((consolePlayMinutes / 60) * 10) / 10;
  const averageDurationMinutes = totalSessions > 0 ? Math.round(totalPlayMinutes / totalSessions) : 0;

  return {
    totalSessions,
    completedSessions,
    activeSessions,
    cancelledSessions,
    totalPlayHours,
    averageDurationMinutes,
    totalSessionRevenue,
    pcSessionsCount,
    pcPlayHours,
    pcRevenue,
    consoleSessionsCount,
    consolePlayHours,
    consoleRevenue,
  };
}

export async function getStationUtilization(startDate: Date, endDate: Date): Promise<StationUtilizationDTO> {
  const [pcs, consoles, sessions] = await Promise.all([
    prisma.pC.findMany({ select: { id: true, stationNumber: true, name: true } }),
    prisma.console.findMany({ select: { id: true, stationNumber: true, name: true } }),
    prisma.session.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        pcId: true,
        consoleId: true,
        durationMinutes: true,
        totalPrice: true,
        status: true,
      },
    }),
  ]);

  const stationMap = new Map<string, { count: number; minutes: number; revenue: number }>();

  for (const s of sessions) {
    const stationId = s.pcId || s.consoleId;
    if (!stationId) continue;

    const cur = stationMap.get(stationId) || { count: 0, minutes: 0, revenue: 0 };
    cur.count++;
    cur.minutes += s.durationMinutes || 0;
    if (s.status === SessionStatus.COMPLETED) {
      cur.revenue += Math.round(s.totalPrice || 0);
    }
    stationMap.set(stationId, cur);
  }

  const stations: StationPerformanceItem[] = [];
  let pcUsageMinutes = 0;
  let consoleUsageMinutes = 0;

  for (const pc of pcs) {
    const data = stationMap.get(pc.id) || { count: 0, minutes: 0, revenue: 0 };
    pcUsageMinutes += data.minutes;
    stations.push({
      id: pc.id,
      stationNumber: pc.stationNumber,
      name: pc.name,
      type: "PC",
      sessionCount: data.count,
      totalPlayHours: Math.round((data.minutes / 60) * 10) / 10,
      revenue: data.revenue,
    });
  }

  for (const con of consoles) {
    const data = stationMap.get(con.id) || { count: 0, minutes: 0, revenue: 0 };
    consoleUsageMinutes += data.minutes;
    stations.push({
      id: con.id,
      stationNumber: con.stationNumber,
      name: con.name,
      type: "CONSOLE",
      sessionCount: data.count,
      totalPlayHours: Math.round((data.minutes / 60) * 10) / 10,
      revenue: data.revenue,
    });
  }

  // Sort by session count descending
  stations.sort((a, b) => b.sessionCount - a.sessionCount);

  const pcStations = stations.filter((s) => s.type === "PC");
  const conStations = stations.filter((s) => s.type === "CONSOLE");

  const mostUsedPC = pcStations.length > 0 && pcStations[0].sessionCount > 0 ? pcStations[0].stationNumber : null;
  const mostUsedConsole = conStations.length > 0 && conStations[0].sessionCount > 0 ? conStations[0].stationNumber : null;
  const leastUsedStation = stations.length > 0 ? stations[stations.length - 1].stationNumber : null;

  return {
    pcUsageHours: Math.round((pcUsageMinutes / 60) * 10) / 10,
    consoleUsageHours: Math.round((consoleUsageMinutes / 60) * 10) / 10,
    totalSessions: sessions.length,
    mostUsedPC,
    mostUsedConsole,
    leastUsedStation,
    stations,
  };
}

export async function getBookingAnalytics(startDate: Date, endDate: Date): Promise<BookingAnalyticsDTO> {
  const bookings = await prisma.booking.findMany({
    where: {
      bookingDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      status: true,
      totalPrice: true,
    },
  });

  let confirmedBookings = 0;
  let completedBookings = 0;
  let cancelledBookings = 0;
  let pendingBookings = 0;
  let totalBookingValue = 0;

  for (const b of bookings) {
    totalBookingValue += Math.round(b.totalPrice);
    if (b.status === BookingStatus.CONFIRMED) confirmedBookings++;
    if (b.status === BookingStatus.COMPLETED) completedBookings++;
    if (b.status === BookingStatus.CANCELLED) cancelledBookings++;
    if (b.status === BookingStatus.PENDING) pendingBookings++;
  }

  const totalBookings = bookings.length;
  const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

  return {
    totalBookings,
    confirmedBookings,
    completedBookings,
    cancelledBookings,
    pendingBookings,
    totalBookingValue,
    completionRate,
  };
}

export async function getMemberAnalytics(startDate: Date, endDate: Date): Promise<MemberAnalyticsDTO> {
  const [totalMembers, newMembers, paidTransactions, activeSessions] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    prisma.transaction.findMany({
      where: {
        status: PaymentStatus.PAID,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        memberId: true,
        totalAmount: true,
      },
    }),
    prisma.session.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        memberId: { not: null },
      },
      select: {
        memberId: true,
      },
    }),
  ]);

  let memberRevenue = 0;
  let memberTransactionCount = 0;
  let guestRevenue = 0;
  let guestTransactionCount = 0;

  const activeMemberIds = new Set<string>();

  for (const t of paidTransactions) {
    const amount = Math.round(t.totalAmount);
    if (t.memberId) {
      memberRevenue += amount;
      memberTransactionCount++;
      activeMemberIds.add(t.memberId);
    } else {
      guestRevenue += amount;
      guestTransactionCount++;
    }
  }

  for (const s of activeSessions) {
    if (s.memberId) activeMemberIds.add(s.memberId);
  }

  return {
    totalMembers,
    newMembers,
    activeMembers: activeMemberIds.size,
    memberRevenue,
    memberTransactionCount,
    guestRevenue,
    guestTransactionCount,
  };
}

export async function getProductAnalytics(startDate: Date, endDate: Date, limit: number = 10): Promise<ProductAnalyticsDTO> {
  const items = await prisma.transactionItem.findMany({
    where: {
      transaction: {
        status: PaymentStatus.PAID,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
    include: {
      product: {
        include: { category: true },
      },
    },
  });

  const productMap = new Map<string, {
    productId: string;
    productName: string;
    categoryName?: string;
    units: number;
    revenue: number;
  }>();

  let storeRevenue = 0;
  let totalUnitsSold = 0;

  for (const item of items) {
    const key = item.productId || item.description;
    const cur = productMap.get(key) || {
      productId: item.productId || key,
      productName: item.description,
      categoryName: item.product?.category?.name,
      units: 0,
      revenue: 0,
    };

    cur.units += item.quantity;
    const lineTotal = Math.round(item.subtotal || item.unitPrice * item.quantity);
    cur.revenue += lineTotal;

    storeRevenue += lineTotal;
    totalUnitsSold += item.quantity;
    productMap.set(key, cur);
  }

  const topProducts: TopProductItem[] = Array.from(productMap.values())
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, limit)
    .map((p) => ({
      productId: p.productId,
      productName: p.productName,
      categoryName: p.categoryName,
      unitsSold: p.units,
      revenue: p.revenue,
      averagePrice: p.units > 0 ? Math.round(p.revenue / p.units) : 0,
    }));

  return {
    storeRevenue,
    totalUnitsSold,
    uniqueProductsSold: productMap.size,
    topProducts,
  };
}

export async function getInventoryAnalytics(startDate?: Date, endDate?: Date): Promise<InventoryAnalyticsDTO> {
  const whereLogs: { createdAt?: { gte: Date; lte: Date } } = {};
  if (startDate && endDate) {
    whereLogs.createdAt = { gte: startDate, lte: endDate };
  }

  const [logs, products] = await Promise.all([
    prisma.inventoryLog.findMany({
      where: whereLogs,
      select: { action: true, quantity: true },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { stock: true, costPrice: true, minStockAlert: true },
    }),
  ]);

  let stockInCount = 0;
  let stockInUnits = 0;
  let stockOutCount = 0;
  let stockOutUnits = 0;
  let adjustmentCount = 0;
  let totalStockMovement = 0;

  for (const log of logs) {
    totalStockMovement += log.quantity;
    if (log.action === InventoryAction.STOCK_IN) {
      stockInCount++;
      stockInUnits += log.quantity;
    } else if (log.action === InventoryAction.STOCK_OUT) {
      stockOutCount++;
      stockOutUnits += log.quantity;
    } else if (log.action === InventoryAction.ADJUSTMENT) {
      adjustmentCount++;
    }
  }

  let lowStockProducts = 0;
  let outOfStockProducts = 0;
  let totalValuation = 0;

  for (const p of products) {
    if (p.stock <= 0) {
      outOfStockProducts++;
    } else if (p.stock <= p.minStockAlert) {
      lowStockProducts++;
    }
    totalValuation += Math.round(p.stock * p.costPrice);
  }

  return {
    stockInCount,
    stockInUnits,
    stockOutCount,
    stockOutUnits,
    adjustmentCount,
    totalStockMovement,
    lowStockProducts,
    outOfStockProducts,
    totalValuation,
  };
}

export async function getComprehensiveReports(params: ReportFilterParams = {}): Promise<ComprehensiveReportDTO> {
  const { period, startDateStr, endDateStr, startDate, endDate } = resolveDateRange(params);

  const [
    revenueSummary,
    dailyRevenue,
    sessionAnalytics,
    stationUtilization,
    bookingAnalytics,
    memberAnalytics,
    productAnalytics,
    inventoryAnalytics,
    recentTransactionsRaw,
  ] = await Promise.all([
    getRevenueSummary(startDate, endDate),
    getDailyRevenue(startDate, endDate),
    getSessionAnalytics(startDate, endDate),
    getStationUtilization(startDate, endDate),
    getBookingAnalytics(startDate, endDate),
    getMemberAnalytics(startDate, endDate),
    getProductAnalytics(startDate, endDate, 10),
    getInventoryAnalytics(startDate, endDate),
    prisma.transaction.findMany({
      where: {
        status: PaymentStatus.PAID,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        member: true,
        items: true,
      },
    }),
  ]);

  const recentTransactions: TransactionRecord[] = recentTransactionsRaw.map((t) => ({
    id: t.id,
    invoiceNumber: t.invoiceNumber,
    memberId: t.memberId,
    memberName: t.member?.fullName || "Guest",
    cashierName: t.cashierName,
    type: t.type as "SESSION" | "STORE" | "MIXED",
    subtotal: Math.round(t.subtotal),
    tax: Math.round(t.tax),
    discount: Math.round(t.discount),
    totalAmount: Math.round(t.totalAmount),
    cashReceived: Math.round(t.cashReceived),
    cashChange: Math.round(t.cashChange),
    paymentMethod: "CASH",
    status: "PAID",
    items: t.items.map((i) => ({
      id: i.id,
      description: i.description,
      unitPrice: Math.round(i.unitPrice),
      quantity: i.quantity,
      subtotal: Math.round(i.subtotal),
    })),
    createdAt: t.createdAt.toISOString(),
  }));

  return {
    period,
    startDate: startDateStr,
    endDate: endDateStr,
    revenueSummary,
    dailyRevenue,
    sessionAnalytics,
    stationUtilization,
    bookingAnalytics,
    memberAnalytics,
    productAnalytics,
    inventoryAnalytics,
    recentTransactions,
  };
}

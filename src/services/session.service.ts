import { prisma } from "@/lib/prisma";
import { SessionStatus, PaymentStatus, PaymentMethod, PCStatus, ConsoleStatus, SessionType, Prisma, InventoryAction } from "@prisma/client";
import { addMemberXP } from "./member.service";
import { recordSessionCompletion } from "./gaming-profile.service";

export interface StartSessionInput {
  stationId: string;
  type?: "PC" | "CONSOLE";
  memberId?: string | null;
  guestName?: string | null;
  durationMinutes: number;
  gameId?: string | null;
  currentGame?: string | null;
  notes?: string | null;
}

export interface CheckoutProductItem {
  productId: string;
  quantity: number;
}

export interface CheckoutSessionInput {
  sessionId: string;
  products?: CheckoutProductItem[];
  cashReceived: number;
  cashierName?: string;
  notes?: string | null;
}

export async function listSessions(filters: {
  status?: string | null;
  type?: string | null;
  memberId?: string | null;
  limit?: number;
} = {}) {
  const where: Prisma.SessionWhereInput = {};
  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status as SessionStatus;
  }
  if (filters.type && filters.type !== "ALL") {
    where.type = filters.type as SessionType;
  }
  if (filters.memberId) {
    where.memberId = filters.memberId;
  }

  const sessions = await prisma.session.findMany({
    where,
    orderBy: { startTime: "desc" },
    take: filters.limit || 50,
    include: {
      pc: true,
      console: true,
      member: true,
      transaction: true,
      game: true,
    },
  });

  const now = Date.now();

  return sessions.map((s) => {
    const elapsedMinutes = Math.floor((now - new Date(s.startTime).getTime()) / 60000);
    const remainingMinutes = Math.max(0, s.durationMinutes - elapsedMinutes);
    const stationName = s.pc ? s.pc.name : s.console ? s.console.name : "Station";
    const stationNumber = s.pc ? s.pc.stationNumber : s.console ? s.console.stationNumber : "-";

    return {
      id: s.id,
      sessionNumber: s.sessionNumber,
      type: s.type,
      stationId: s.pcId || s.consoleId || "",
      stationNumber,
      stationName,
      memberId: s.memberId,
      memberName: s.member?.fullName || s.guestName || "Guest",
      username: s.member?.username || null,
      guestName: s.guestName,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime?.toISOString() || null,
      durationMinutes: s.durationMinutes,
      remainingMinutes: s.status === SessionStatus.ACTIVE ? remainingMinutes : s.remainingMinutes,
      hourlyRate: s.hourlyRate,
      totalPrice: s.totalPrice,
      status: s.status,
      paymentStatus: s.paymentStatus,
      gameId: s.gameId,
      currentGame: s.game?.title || s.pc?.currentGame || s.console?.currentGame || null,
      notes: s.notes,
      transactionId: s.transactionId,
      invoiceNumber: s.transaction?.invoiceNumber || null,
      createdAt: s.createdAt.toISOString(),
    };
  });
}

export async function getActiveSessions() {
  return await listSessions({ status: SessionStatus.ACTIVE });
}

export async function getSessionById(id: string) {
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      pc: true,
      console: true,
      member: true,
      transaction: {
        include: { items: true },
      },
    },
  });

  if (!session) return null;

  const now = Date.now();
  const elapsedMinutes = Math.floor((now - new Date(session.startTime).getTime()) / 60000);
  const remainingMinutes = Math.max(0, session.durationMinutes - elapsedMinutes);

  return {
    ...session,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime?.toISOString() || null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    calculatedRemainingMinutes: session.status === SessionStatus.ACTIVE ? remainingMinutes : session.remainingMinutes,
  };
}

export async function startSession(data: StartSessionInput) {
  const type = data.type || "PC";

  // Validate member if provided
  if (data.memberId) {
    const member = await prisma.member.findUnique({
      where: { id: data.memberId },
    });
    if (!member) {
      throw new Error("Member tidak ditemukan (ID tidak valid)");
    }
  }

  // Validate station and prevent duplicate session
  let hourlyRate = 10000;
  let stationNumber = "";

  if (type === "PC") {
    const pc = await prisma.pC.findUnique({
      where: { id: data.stationId },
      include: {
        sessions: { where: { status: SessionStatus.ACTIVE } },
      },
    });

    if (!pc) {
      throw new Error("PC Station tidak ditemukan (ID tidak valid)");
    }

    if (pc.status === PCStatus.IN_USE) {
      throw new Error(`Station ${pc.stationNumber} sedang digunakan (Status: IN_USE)`);
    }
    if (pc.status === PCStatus.MAINTENANCE) {
      throw new Error(`Station ${pc.stationNumber} sedang dalam pemeliharaan (Status: MAINTENANCE)`);
    }
    if (pc.status === PCStatus.OFFLINE) {
      throw new Error(`Station ${pc.stationNumber} sedang offline (Status: OFFLINE)`);
    }
    if (pc.sessions.length > 0) {
      throw new Error(`PC ${pc.stationNumber} sudah memiliki sesi aktif yang sedang berjalan`);
    }

    hourlyRate = pc.hourlyRate;
    stationNumber = pc.stationNumber;
  } else {
    const con = await prisma.console.findUnique({
      where: { id: data.stationId },
      include: {
        sessions: { where: { status: SessionStatus.ACTIVE } },
      },
    });

    if (!con) {
      throw new Error("Console Station tidak ditemukan (ID tidak valid)");
    }

    if (con.status === ConsoleStatus.IN_USE) {
      throw new Error(`Station ${con.stationNumber} sedang digunakan (Status: IN_USE)`);
    }
    if (con.status === ConsoleStatus.MAINTENANCE) {
      throw new Error(`Station ${con.stationNumber} sedang dalam pemeliharaan (Status: MAINTENANCE)`);
    }
    if (con.status === ConsoleStatus.OFFLINE) {
      throw new Error(`Station ${con.stationNumber} sedang offline (Status: OFFLINE)`);
    }
    if (con.sessions.length > 0) {
      throw new Error(`Console ${con.stationNumber} sudah memiliki sesi aktif yang sedang berjalan`);
    }

    hourlyRate = con.hourlyRate;
    stationNumber = con.stationNumber;
  }

  // Resolve Game if provided
  let resolvedGameId: string | null = null;
  let resolvedGameTitle: string | null = data.currentGame || null;

  if (data.gameId) {
    const game = await prisma.game.findUnique({
      where: { id: data.gameId },
    });
    if (!game) {
      throw new Error("Game tidak ditemukan (ID tidak valid)");
    }
    resolvedGameId = game.id;
    resolvedGameTitle = game.title;
  } else if (data.currentGame && data.currentGame.trim()) {
    const matched = await prisma.game.findFirst({
      where: { title: { equals: data.currentGame.trim(), mode: "insensitive" } },
    });
    if (matched) {
      resolvedGameId = matched.id;
      resolvedGameTitle = matched.title;
    }
  }

  // Calculate server-authoritative price using integer Rupiah arithmetic
  const durationMinutes = Math.max(15, data.durationMinutes);
  const totalPrice = Math.round((durationMinutes * hourlyRate) / 60);

  // Generate unique session number: SES-YYYYMMDD-XXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.session.count();
  const sessionNumber = `SES-${dateStr}-${String(count + 1).padStart(3, "0")}`;

  return await prisma.$transaction(async (tx) => {
    // 1. Create Session
    const session = await tx.session.create({
      data: {
        sessionNumber,
        type,
        pcId: type === "PC" ? data.stationId : null,
        consoleId: type === "CONSOLE" ? data.stationId : null,
        memberId: data.memberId || null,
        guestName: data.memberId ? null : (data.guestName || "Guest"),
        startTime: new Date(),
        durationMinutes,
        remainingMinutes: durationMinutes,
        hourlyRate,
        totalPrice,
        status: SessionStatus.ACTIVE,
        paymentStatus: PaymentStatus.PENDING,
        notes: data.notes || null,
        gameId: resolvedGameId,
      },
      include: {
        member: true,
        game: true,
      },
    });

    // 2. Update Station status to IN_USE
    if (type === "PC") {
      await tx.pC.update({
        where: { id: data.stationId },
        data: {
          status: PCStatus.IN_USE,
          currentGame: resolvedGameTitle || "Online Session",
        },
      });
    } else {
      await tx.console.update({
        where: { id: data.stationId },
        data: {
          status: ConsoleStatus.IN_USE,
          currentGame: resolvedGameTitle || "Gaming Session",
        },
      });
    }

    return session;
  }, { maxWait: 15000, timeout: 30000 });
}

export async function addSessionTime(sessionId: string, additionalMinutes: number) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error("Sesi tidak ditemukan");
  }

  if (session.status !== SessionStatus.ACTIVE) {
    throw new Error("Hanya sesi aktif yang dapat ditambah durasinya");
  }

  const newDuration = session.durationMinutes + additionalMinutes;
  const newRemaining = session.remainingMinutes + additionalMinutes;
  const additionalPrice = Math.round((additionalMinutes * session.hourlyRate) / 60);
  const newTotalPrice = session.totalPrice + additionalPrice;

  return await prisma.session.update({
    where: { id: sessionId },
    data: {
      durationMinutes: newDuration,
      remainingMinutes: newRemaining,
      totalPrice: newTotalPrice,
    },
  });
}

export async function stopSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { pc: true, console: true },
  });

  if (!session) {
    throw new Error("Sesi tidak ditemukan");
  }

  if (session.status !== SessionStatus.ACTIVE) {
    throw new Error("Sesi sudah tidak aktif atau sudah selesai");
  }

  const endedAt = new Date();
  const durationMs = endedAt.getTime() - new Date(session.startTime).getTime();
  let durationMinutes = Math.round(durationMs / 60000);
  if (durationMinutes < 1) {
    durationMinutes = session.durationMinutes || 1;
  }
  const totalPrice = Math.round((durationMinutes * session.hourlyRate) / 60);

  return await prisma.$transaction(async (tx) => {
    // Update session status to COMPLETED
    const updatedSession = await tx.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        remainingMinutes: 0,
        endTime: endedAt,
        durationMinutes,
        totalPrice,
      },
    });

    // Update PC or Console status to AVAILABLE
    if (session.pcId) {
      await tx.pC.update({
        where: { id: session.pcId },
        data: {
          status: PCStatus.AVAILABLE,
          currentGame: null,
        },
      });
    } else if (session.consoleId) {
      await tx.console.update({
        where: { id: session.consoleId },
        data: {
          status: ConsoleStatus.AVAILABLE,
          currentGame: null,
        },
      });
    }

    return updatedSession;
  }, { maxWait: 15000, timeout: 30000 }).then(async (updatedSession) => {
    // Record server-authoritative session completion, XP, and game stats
    await recordSessionCompletion(sessionId);
    return updatedSession;
  });
}

export async function checkoutSession(data: CheckoutSessionInput) {
  const session = await prisma.session.findUnique({
    where: { id: data.sessionId },
    include: {
      pc: true,
      console: true,
      member: true,
    },
  });

  if (!session) {
    throw new Error("Sesi tidak ditemukan");
  }

  // Prevent double checkout
  if (session.status === SessionStatus.COMPLETED && session.paymentStatus === PaymentStatus.PAID) {
    throw new Error("Sesi ini sudah diselesaikan dan dibayar sebelumnya");
  }

  if (session.status === SessionStatus.CANCELLED) {
    throw new Error("Sesi sudah dibatalkan");
  }

  // 1. Calculate session price and duration
  const endedAt = session.endTime || new Date();
  let durationMinutes = session.durationMinutes;
  let sessionPrice = session.totalPrice;

  if (session.status === SessionStatus.ACTIVE) {
    const durationMs = endedAt.getTime() - new Date(session.startTime).getTime();
    durationMinutes = Math.round(durationMs / 60000);
    if (durationMinutes < 1) {
      durationMinutes = session.durationMinutes || 1;
    }
    sessionPrice = Math.round((durationMinutes * session.hourlyRate) / 60);
  }

  // 2. Validate and calculate products if any
  let productsTotal = 0;
  const verifiedProducts: {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    previousStock: number;
    newStock: number;
  }[] = [];

  if (data.products && data.products.length > 0) {
    for (const item of data.products) {
      if (item.quantity <= 0) {
        throw new Error("Kuantitas produk harus lebih dari 0");
      }

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Produk dengan ID '${item.productId}' tidak ditemukan`);
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Stok produk '${product.name}' tidak mencukupi (Tersedia: ${product.stock}, Diminta: ${item.quantity})`
        );
      }

      const subtotal = product.price * item.quantity;
      productsTotal += subtotal;
      verifiedProducts.push({
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        subtotal,
        previousStock: product.stock,
        newStock: product.stock - item.quantity,
      });
    }
  }

  // 3. Authoritative total amount
  const totalAmount = sessionPrice + productsTotal;

  // 4. CASH-ONLY validation
  if (data.cashReceived < totalAmount) {
    const shortage = totalAmount - data.cashReceived;
    throw new Error(
      `Uang tunai kurang Rp${shortage.toLocaleString("id-ID")} (Total: Rp${totalAmount.toLocaleString("id-ID")}, Diterima: Rp${data.cashReceived.toLocaleString("id-ID")})`
    );
  }

  const cashChange = data.cashReceived - totalAmount;

  // Generate unique invoice number: INV-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const txCount = await prisma.transaction.count();
  const invoiceNumber = `INV-${dateStr}-${String(txCount + 1).padStart(4, "0")}`;

  const stationName = session.pc
    ? session.pc.stationNumber
    : session.console
    ? session.console.stationNumber
    : "Station";

  return await prisma.$transaction(async (tx) => {
    // A. Deduct product stocks and record inventory logs
    for (const p of verifiedProducts) {
      await tx.product.update({
        where: { id: p.productId },
        data: { stock: p.newStock },
      });

      await tx.inventoryLog.create({
        data: {
          productId: p.productId,
          action: InventoryAction.STOCK_OUT,
          quantity: p.quantity,
          previousStock: p.previousStock,
          newStock: p.newStock,
          reason: `Penjualan Kasir Checkout Sesi (${invoiceNumber})`,
          recordedBy: data.cashierName || "Admin",
        },
      });
    }

    // B. Create Transaction (Cash Only, PAID)
    const transaction = await tx.transaction.create({
      data: {
        invoiceNumber,
        memberId: session.memberId,
        cashierName: data.cashierName || "Admin",
        type: verifiedProducts.length > 0 ? "MIXED" : "SESSION",
        subtotal: totalAmount,
        tax: 0,
        discount: 0,
        totalAmount,
        cashReceived: data.cashReceived,
        cashChange,
        paymentMethod: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        notes: data.notes || `Pembayaran biling ${stationName} (${durationMinutes} menit)${verifiedProducts.length > 0 ? " + Produk" : ""}`,
        items: {
          create: [
            {
              description: `Sewa Station ${stationName} - ${durationMinutes} Menit`,
              unitPrice: sessionPrice,
              quantity: 1,
              subtotal: sessionPrice,
            },
            ...verifiedProducts.map((p) => ({
              productId: p.productId,
              description: p.productName,
              unitPrice: p.unitPrice,
              quantity: p.quantity,
              subtotal: p.subtotal,
            })),
          ],
        },
      },
      include: {
        items: true,
      },
    });

    // C. Mark Session COMPLETED & PAID
    const updatedSession = await tx.session.update({
      where: { id: session.id },
      data: {
        status: SessionStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        remainingMinutes: 0,
        durationMinutes,
        totalPrice: sessionPrice,
        endTime: endedAt,
        transactionId: transaction.id,
      },
    });

    // D. Return Station to AVAILABLE
    if (session.pcId) {
      await tx.pC.update({
        where: { id: session.pcId },
        data: {
          status: PCStatus.AVAILABLE,
          currentGame: null,
        },
      });
    } else if (session.consoleId) {
      await tx.console.update({
        where: { id: session.consoleId },
        data: {
          status: ConsoleStatus.AVAILABLE,
          currentGame: null,
        },
      });
    }

    return {
      session: updatedSession,
      transaction: {
        ...transaction,
        memberName: session.member?.fullName || session.guestName || "Guest",
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
      },
      totalAmount,
      sessionPrice,
      productsTotal,
      cashReceived: data.cashReceived,
      cashChange,
    };
  }, { maxWait: 15000, timeout: 30000 }).then(async (result) => {
    // Record server-authoritative session completion, XP, and game stats
    await recordSessionCompletion(session.id);
    return result;
  });
}

import { prisma } from "@/lib/prisma";
import { PaymentMethod, PaymentStatus, InventoryAction, Prisma } from "@prisma/client";
import { addMemberXP } from "./member.service";

export interface PosCheckoutInput {
  memberId?: string | null;
  items: {
    productId: string;
    quantity: number;
  }[];
  cashReceived: number;
  cashierName?: string;
  notes?: string | null;
}

export async function listTransactions(filters: {
  type?: string | null;
  memberId?: string | null;
  limit?: number;
} = {}) {
  const where: Prisma.TransactionWhereInput = {};
  if (filters.type && filters.type !== "ALL") {
    where.type = filters.type;
  }
  if (filters.memberId) {
    where.memberId = filters.memberId;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters.limit || 50,
    include: {
      member: true,
      items: {
        include: { product: true },
      },
      sessions: true,
    },
  });

  return transactions.map((t) => ({
    id: t.id,
    invoiceNumber: t.invoiceNumber,
    memberId: t.memberId,
    memberName: t.member?.fullName || null,
    username: t.member?.username || null,
    cashierName: t.cashierName,
    type: t.type,
    subtotal: t.subtotal,
    tax: t.tax,
    discount: t.discount,
    totalAmount: t.totalAmount,
    cashReceived: t.cashReceived,
    cashChange: t.cashChange,
    paymentMethod: t.paymentMethod,
    status: t.status,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
    items: t.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product?.name || i.description,
      description: i.description,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })),
  }));
}

export async function getTransactionById(id: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      member: true,
      items: {
        include: { product: true },
      },
      sessions: {
        include: { pc: true, console: true },
      },
    },
  });

  if (!transaction) return null;

  return {
    ...transaction,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

export async function createPosCheckout(data: PosCheckoutInput) {
  if (!data.items || data.items.length === 0) {
    throw new Error("Keranjang belanja tidak boleh kosong");
  }

  // 1. Fetch all requested products and verify prices and stock strictly on server
  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  let calculatedTotal = 0;
  const verifiedItems: {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    previousStock: number;
    newStock: number;
  }[] = [];

  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
    }

    if (item.quantity <= 0) {
      throw new Error(`Kuantitas produk ${product.name} harus lebih dari 0`);
    }

    // Strict stock validation: prevent negative stock!
    if (product.stock < item.quantity) {
      throw new Error(
        `Stok produk '${product.name}' tidak mencukupi (Tersedia: ${product.stock}, Diminta: ${item.quantity})`
      );
    }

    const subtotal = product.price * item.quantity;
    calculatedTotal += subtotal;

    verifiedItems.push({
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      subtotal,
      previousStock: product.stock,
      newStock: product.stock - item.quantity,
    });
  }

  // 2. CASH PAYMENT VALIDATION
  if (data.cashReceived < calculatedTotal) {
    const shortage = calculatedTotal - data.cashReceived;
    throw new Error(
      `Uang tunai kurang Rp${shortage.toLocaleString("id-ID")} (Total: Rp${calculatedTotal.toLocaleString("id-ID")}, Diterima: Rp${data.cashReceived.toLocaleString("id-ID")})`
    );
  }

  const cashChange = data.cashReceived - calculatedTotal;

  // 3. Generate unique invoice number: INV-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const txCount = await prisma.transaction.count();
  const invoiceNumber = `INV-${dateStr}-${String(txCount + 1).padStart(4, "0")}`;

  // 4. ATOMIC DATABASE TRANSACTION
  return await prisma.$transaction(async (tx) => {
    // A. Deduct stock and log inventory mutation for each item
    for (const item of verifiedItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: item.newStock },
      });

      await tx.inventoryLog.create({
        data: {
          productId: item.productId,
          action: InventoryAction.STOCK_OUT,
          quantity: item.quantity,
          previousStock: item.previousStock,
          newStock: item.newStock,
          reason: `Penjualan Kasir POS (${invoiceNumber})`,
          recordedBy: data.cashierName || "Admin",
        },
      });
    }

    // B. Create Transaction (Cash Only, PAID)
    const transaction = await tx.transaction.create({
      data: {
        invoiceNumber,
        memberId: data.memberId || null,
        cashierName: data.cashierName || "Admin",
        type: "STORE",
        subtotal: calculatedTotal,
        tax: 0,
        discount: 0,
        totalAmount: calculatedTotal,
        cashReceived: data.cashReceived,
        cashChange,
        paymentMethod: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        notes: data.notes || "Penjualan Toko / POS DREAMCAFE",
        items: {
          create: verifiedItems.map((item) => ({
            productId: item.productId,
            description: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        items: true,
        member: true,
      },
    });

    return {
      transaction: {
        ...transaction,
        memberName: transaction.member?.fullName || "Guest (Non-Member)",
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
      },
      totalAmount: calculatedTotal,
      cashReceived: data.cashReceived,
      cashChange,
    };
  }).then(async (result) => {
    // If buyer is a member, award XP & DreamCoins
    if (data.memberId) {
      const xpEarned = Math.floor(calculatedTotal / 1000); // 1 XP per Rp 1.000 spent
      await addMemberXP(data.memberId, xpEarned);
    }
    return result;
  });
}

export async function getFinancialReports() {
  const transactions = await prisma.transaction.findMany({
    where: { status: PaymentStatus.PAID },
    orderBy: { createdAt: "desc" },
    include: { member: true },
  });

  const totalRevenue = transactions.reduce((acc, t) => acc + t.totalAmount, 0);
  const sessionRevenue = transactions
    .filter((t) => t.type === "SESSION")
    .reduce((acc, t) => acc + t.totalAmount, 0);
  const storeRevenue = transactions
    .filter((t) => t.type === "STORE" || t.type === "MIXED")
    .reduce((acc, t) => acc + t.totalAmount, 0);

  // Today's revenue
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayRevenue = transactions
    .filter((t) => new Date(t.createdAt) >= todayStart)
    .reduce((acc, t) => acc + t.totalAmount, 0);

  return {
    totalRevenue,
    sessionRevenue,
    storeRevenue,
    todayRevenue,
    transactionCount: transactions.length,
    recentTransactions: transactions.slice(0, 20).map((t) => ({
      id: t.id,
      invoiceNumber: t.invoiceNumber,
      memberId: t.memberId,
      memberName: t.member?.fullName || "Guest",
      type: t.type,
      totalAmount: t.totalAmount,
      cashReceived: t.cashReceived,
      cashChange: t.cashChange,
      cashierName: t.cashierName,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

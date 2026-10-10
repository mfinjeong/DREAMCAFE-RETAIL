import { prisma } from "@/lib/prisma";
import { InventoryAction, Prisma } from "@prisma/client";

export interface StockAdjustmentInput {
  productId: string;
  action: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";
  quantity: number;
  reason: string;
  recordedBy?: string;
}

export async function listInventoryLogs(filters: {
  productId?: string | null;
  action?: string | null;
  limit?: number;
} = {}) {
  const where: Prisma.InventoryLogWhereInput = {};
  if (filters.productId && filters.productId !== "ALL") {
    where.productId = filters.productId;
  }
  if (filters.action && filters.action !== "ALL") {
    where.action = filters.action as InventoryAction;
  }

  const logs = await prisma.inventoryLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters.limit || 100,
    include: {
      product: {
        include: { category: true },
      },
    },
  });

  return logs.map((l) => ({
    id: l.id,
    productId: l.productId,
    productName: l.product?.name || "Produk",
    categoryName: l.product?.category?.name || "Kategori",
    action: l.action,
    quantity: l.quantity,
    previousStock: l.previousStock,
    newStock: l.newStock,
    reason: l.reason,
    recordedBy: l.recordedBy || "Admin",
    createdAt: l.createdAt.toISOString(),
  }));
}

export async function getInventorySummary() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
  });

  const totalProducts = products.length;
  let totalStock = 0;
  let lowStockProducts = 0;
  let outOfStockProducts = 0;
  let totalValuation = 0;

  for (const p of products) {
    totalStock += p.stock;
    totalValuation += p.costPrice * p.stock;
    if (p.stock === 0) {
      outOfStockProducts++;
    } else if (p.stock <= p.minStockAlert) {
      lowStockProducts++;
    }
  }

  return {
    totalProducts,
    totalStock,
    lowStockProducts,
    outOfStockProducts,
    totalValuation,
  };
}

export async function adjustStock(data: StockAdjustmentInput) {
  if (!Number.isInteger(data.quantity)) {
    throw new Error("Jumlah stok harus berupa bilangan bulat");
  }

  const product = await prisma.product.findUnique({
    where: { id: data.productId },
  });

  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  const previousStock = product.stock;
  let newStock = previousStock;
  let logQuantity = data.quantity;

  if (data.action === "STOCK_IN") {
    if (data.quantity <= 0) {
      throw new Error("Jumlah penambahan stok harus lebih dari 0");
    }
    newStock = previousStock + data.quantity;
    logQuantity = data.quantity;
  } else if (data.action === "STOCK_OUT") {
    if (data.quantity <= 0) {
      throw new Error("Jumlah pengurangan stok harus lebih dari 0");
    }
    if (previousStock - data.quantity < 0) {
      throw new Error(
        `Stok tidak mencukupi! Tersedia: ${previousStock}, Diminta kurangi: ${data.quantity}. Stok produk tidak boleh negatif.`
      );
    }
    newStock = previousStock - data.quantity;
    logQuantity = data.quantity;
  } else if (data.action === "ADJUSTMENT") {
    if (data.quantity < 0) {
      throw new Error("Stok fisik hasil opname tidak boleh negatif");
    }
    newStock = data.quantity;
    logQuantity = Math.abs(newStock - previousStock);
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Update Product stock
    const updatedProduct = await tx.product.update({
      where: { id: data.productId },
      data: { stock: newStock },
      include: { category: true },
    });

    // 2. Create Audit Log
    const log = await tx.inventoryLog.create({
      data: {
        productId: data.productId,
        action: data.action as InventoryAction,
        quantity: logQuantity,
        previousStock,
        newStock,
        reason: data.reason,
        recordedBy: data.recordedBy || "Admin",
      },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    return {
      product: updatedProduct,
      log,
      previousStock,
      newStock,
      difference: newStock - previousStock,
    };
  });
}

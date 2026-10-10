import { NextResponse } from "next/server";
import { adjustStock } from "@/services/inventory.service";
import { inventoryAdjustmentSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = inventoryAdjustmentSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await adjustStock({
      productId: validated.data.productId,
      action: validated.data.action,
      quantity: validated.data.quantity,
      reason: validated.data.reason,
      recordedBy: validated.data.recordedBy,
    });

    return NextResponse.json({
      success: true,
      data: result.product,
      log: result.log,
      previousStock: result.previousStock,
      newStock: result.newStock,
      difference: result.difference,
      message: `Stok ${result.product.name} berhasil diperbarui (${result.previousStock} -> ${result.newStock})`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menyesuaikan stok inventaris";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}

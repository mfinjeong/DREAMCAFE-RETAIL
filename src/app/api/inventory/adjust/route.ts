import { NextResponse } from "next/server";
import { adjustStock } from "@/services/inventory.service";
import { inventoryAdjustmentSchema } from "@/lib/validators";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
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
      recordedBy: user.fullName || user.username,
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
    return apiErrorResponse(err, "Gagal menyesuaikan stok inventaris", 400);
  }
}

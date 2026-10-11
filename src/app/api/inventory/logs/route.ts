import { NextResponse } from "next/server";
import { listInventoryLogs } from "@/services/inventory.service";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const action = searchParams.get("action");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    const logs = await listInventoryLogs({ productId, action, limit });
    return NextResponse.json({ success: true, data: logs });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Terjadi kesalahan server saat memuat log inventaris", 500);
  }
}

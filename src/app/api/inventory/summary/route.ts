import { NextResponse } from "next/server";
import { getInventorySummary } from "@/services/inventory.service";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();
    const summary = await getInventorySummary();
    return NextResponse.json({ success: true, data: summary });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal memuat ringkasan inventaris", 500);
  }
}

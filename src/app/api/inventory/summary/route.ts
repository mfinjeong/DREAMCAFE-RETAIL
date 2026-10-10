import { NextResponse } from "next/server";
import { getInventorySummary } from "@/services/inventory.service";

export async function GET() {
  try {
    const summary = await getInventorySummary();
    return NextResponse.json({ success: true, data: summary });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memuat ringkasan inventaris";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

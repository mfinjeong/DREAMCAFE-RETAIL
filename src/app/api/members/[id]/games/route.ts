import { NextResponse } from "next/server";
import { getMemberGameStats } from "@/services/gaming-profile.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stats = await getMemberGameStats(id);
    return NextResponse.json({ success: true, data: stats });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memuat riwayat game member";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

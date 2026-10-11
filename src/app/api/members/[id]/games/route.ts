import { NextResponse } from "next/server";
import { getMemberGameStats } from "@/services/gaming-profile.service";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const stats = await getMemberGameStats(id);
    return NextResponse.json({ success: true, data: stats });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal memuat riwayat game member", 500);
  }
}

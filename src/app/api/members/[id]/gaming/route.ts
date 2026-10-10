import { NextResponse } from "next/server";
import { getGamingProfile } from "@/services/gaming-profile.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await getGamingProfile(id);
    return NextResponse.json({ success: true, data: profile });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memuat profil gaming member";
    const status = msg.includes("tidak ditemukan") ? 404 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}
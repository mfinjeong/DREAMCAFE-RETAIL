import { NextResponse } from "next/server";
import { getGamingProfile } from "@/services/gaming-profile.service";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const profile = await getGamingProfile(id);
    return NextResponse.json({ success: true, data: profile });
  } catch (err: unknown) {
    const status = err instanceof Error && err.message.includes("tidak ditemukan") ? 404 : 500;
    return apiErrorResponse(err, "Gagal memuat profil gaming member", status);
  }
}
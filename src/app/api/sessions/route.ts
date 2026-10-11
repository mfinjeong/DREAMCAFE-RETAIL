import { NextResponse } from "next/server";
import { listSessions, startSession } from "@/services/session.service";
import { startSessionSchema } from "@/lib/validators";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const memberId = searchParams.get("memberId");

    const sessions = await listSessions({ status, type, memberId });
    return NextResponse.json({ success: true, data: sessions });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Terjadi kesalahan server saat memuat sesi", 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const validated = startSessionSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const session = await startSession({
      stationId: validated.data.stationId,
      type: validated.data.type,
      memberId: validated.data.memberId,
      guestName: validated.data.guestName,
      durationMinutes: validated.data.durationMinutes,
      gameId: validated.data.gameId,
      currentGame: validated.data.currentGame,
      notes: validated.data.notes,
    });

    return NextResponse.json({
      success: true,
      data: session,
      message: `Sesi ${session.sessionNumber} berhasil dimulai`,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal memulai sesi baru", 400);
  }
}

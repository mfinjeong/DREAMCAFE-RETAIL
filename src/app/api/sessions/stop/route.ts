import { NextResponse } from "next/server";
import { stopSession } from "@/services/session.service";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const sessionId = body?.sessionId;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { success: false, message: "ID Sesi diperlukan untuk menghentikan sesi" },
        { status: 400 }
      );
    }

    const session = await stopSession(sessionId, user.id);

    return NextResponse.json({
      success: true,
      data: session,
      message: `Sesi ${session.sessionNumber} berhasil dihentikan`,
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Gagal menghentikan sesi aktif", 400);
  }
}

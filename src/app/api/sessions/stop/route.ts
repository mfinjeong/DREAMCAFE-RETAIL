import { NextResponse } from "next/server";
import { stopSession } from "@/services/session.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = body?.sessionId;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { success: false, message: "ID Sesi diperlukan untuk menghentikan sesi" },
        { status: 400 }
      );
    }

    const session = await stopSession(sessionId);

    return NextResponse.json({
      success: true,
      data: session,
      message: `Sesi ${session.sessionNumber} berhasil dihentikan`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menghentikan sesi aktif";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}

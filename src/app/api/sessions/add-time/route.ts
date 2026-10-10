import { NextResponse } from "next/server";
import { addSessionTime } from "@/services/session.service";
import { addSessionTimeSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = addSessionTimeSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const session = await addSessionTime(
      validated.data.sessionId,
      validated.data.additionalMinutes
    );

    return NextResponse.json({
      success: true,
      data: session,
      message: `Waktu biling berhasil ditambah ${validated.data.additionalMinutes} menit`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menambah waktu sesi";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}

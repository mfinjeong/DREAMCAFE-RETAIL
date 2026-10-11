import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, authErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = z.object({ sessionId: z.string().cuid() }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "ID sesi tidak valid" }, { status: 400 });
    }

    const session = await prisma.sessionToken.findUnique({
      where: { id: parsed.data.sessionId },
      select: { userId: true, revokedAt: true },
    });

    if (!session) {
      return NextResponse.json({ success: false, message: "Sesi tidak ditemukan" }, { status: 404 });
    }

    if (session.userId !== user.id) {
      const authError = authErrorResponse(new Error("FORBIDDEN"));
      return NextResponse.json({ success: false, message: authError.message }, { status: authError.status });
    }

    if (session.revokedAt) {
      return NextResponse.json({ success: false, message: "Sesi sudah dicabut" }, { status: 400 });
    }

    await prisma.sessionToken.update({
      where: { id: parsed.data.sessionId },
      data: { revokedAt: new Date(), revokedReason: "Revoked by user" },
    });

    return NextResponse.json({ success: true, message: "Sesi berhasil dicabut" });
  } catch (error) {
    const authError = authErrorResponse(error);
    return NextResponse.json({ success: false, message: authError.message }, { status: authError.status });
  }
}

import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const sessions = await prisma.sessionToken.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, expiresAt: true },
    });

    return NextResponse.json({ success: true, data: { ...user, sessions } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

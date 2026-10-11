import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, authErrorResponse, verifyPassword, hashPassword, clearSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, createRateLimitKey, getClientIp } from "@/lib/rate-limit";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Validasi gagal" },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const clientIp = getClientIp(request);
    if (clientIp) {
      const ipLimitKey = createRateLimitKey("change-password-ip", clientIp);
      if (ipLimitKey) {
        const ipLimit = checkRateLimit({
          key: ipLimitKey,
          limit: 5,
          windowMs: 15 * 60 * 1000,
        });
        if (!ipLimit.success) {
          return NextResponse.json(
            { success: false, message: "Terlalu banyak percobaan. Coba lagi nanti." },
            { status: 429 }
          );
        }
      }
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!dbUser) {
      const authError = authErrorResponse(new Error("UNAUTHENTICATED"));
      return NextResponse.json({ success: false, message: authError.message }, { status: authError.status });
    }

    const isMatch = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Password lama salah" },
        { status: 401 }
      );
    }

    const newHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });

      await tx.sessionToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: "Password changed" },
      });
    });

    await clearSessionCookie();

    return NextResponse.json({ success: true, message: "Password berhasil diubah. Silakan login kembali." });
  } catch (error) {
    const authError = authErrorResponse(error);
    return NextResponse.json({ success: false, message: authError.message }, { status: authError.status });
  }
}
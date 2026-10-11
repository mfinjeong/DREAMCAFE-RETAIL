import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { executePasswordReset } from "@/lib/password-reset";
import { checkRateLimit, createRateLimitKey, getClientIp } from "@/lib/rate-limit";

function logAuthError(scope: string, error: unknown): void {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error(`[auth:${scope}] ${errorName}`);
}

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token wajib diisi"),
  newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
});

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    // Rate limit: max 5 attempts per IP per 15 minutes (if IP available)
    if (clientIp) {
      const ipLimitKey = createRateLimitKey("reset-password-ip", clientIp);
      if (ipLimitKey) {
        const ipLimit = checkRateLimit({
          key: ipLimitKey,
          limit: 5,
          windowMs: 15 * 60 * 1000,
        });
        if (!ipLimit.success) {
          return NextResponse.json(
            {
              success: false,
              message: "Terlalu banyak percobaan. Coba lagi nanti.",
            },
            { status: 429 }
          );
        }
      }
    }

    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Validasi gagal" },
        { status: 400 }
      );
    }

    const { token, newPassword } = parsed.data;
    const newHash = await hashPassword(newPassword);

    const result = await executePasswordReset(token, newHash);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: "Token tidak valid atau sudah kedaluwarsa" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err) {
    logAuthError("reset-password", err);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

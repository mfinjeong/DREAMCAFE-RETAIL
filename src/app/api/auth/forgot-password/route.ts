import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/password-reset";
import { checkRateLimit, createRateLimitKey, getClientIp } from "@/lib/rate-limit";
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from "@/lib/password-reset-email";

const requestSchema = z.object({
  identifier: z.string().min(1),
});

function logAuthError(scope: string, error: unknown): void {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error(`[auth:${scope}] ${errorName}`);
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    // Rate limit: per IP (if available) and per identifier
    if (clientIp) {
      const ipLimitKey = createRateLimitKey("forgot-ip", clientIp);
      if (ipLimitKey) {
        const ipLimit = checkRateLimit({
          key: ipLimitKey,
          limit: 5,
          windowMs: 15 * 60 * 1000,
        });
        if (!ipLimit.success) {
          return NextResponse.json(
            { success: true, message: "Permintaan diproses jika akun terdaftar." },
            { status: 429 }
          );
        }
      }
    }

    const json = await req.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: true, message: "Permintaan diproses jika akun terdaftar." });
    }

    const { identifier } = parsed.data;

    const identifierKey = createRateLimitKey("forgot-id", clientIp, identifier);
    if (identifierKey) {
      const identifierLimit = checkRateLimit({
        key: identifierKey,
        limit: 3,
        windowMs: 15 * 60 * 1000,
      });
      if (!identifierLimit.success) {
        return NextResponse.json({ success: true, message: "Permintaan diproses jika akun terdaftar." });
      }
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: identifier, mode: "insensitive" } },
          { email: { equals: identifier, mode: "insensitive" } },
        ],
      },
      select: { id: true, email: true },
    });

    if (user?.email && isPasswordResetEmailConfigured()) {
      const rawToken = await createPasswordResetToken(user.id);
      await sendPasswordResetEmail({ recipient: user.email, resetToken: rawToken });
    }

    return NextResponse.json({ success: true, message: "Permintaan diproses jika akun terdaftar." });
  } catch (err) {
    logAuthError("forgot-password", err);
    return NextResponse.json({ success: true, message: "Permintaan diproses jika akun terdaftar." });
  }
}


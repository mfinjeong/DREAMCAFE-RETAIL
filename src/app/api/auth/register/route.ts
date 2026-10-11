import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, apiErrorResponse } from "@/lib/auth";
import { checkRateLimit, createRateLimitKey, getClientIp } from "@/lib/rate-limit";
import { registerSchema, duplicateRegistrationResponse } from "@/lib/auth-register";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { username, email, fullName, password } = parsed.data;
    const clientIp = getClientIp(request);

    if (clientIp) {
      const ipLimitKey = createRateLimitKey("register-ip", clientIp);
      if (ipLimitKey && !checkRateLimit({ key: ipLimitKey, limit: 5, windowMs: 15 * 60 * 1000 }).success) {
        return NextResponse.json({ success: false, message: "Terlalu banyak percobaan pendaftaran. Coba lagi nanti." }, { status: 429 });
      }
    }

    const identifierKey = createRateLimitKey("register-id", clientIp, username);
    if (identifierKey && !checkRateLimit({ key: identifierKey, limit: 3, windowMs: 15 * 60 * 1000 }).success) {
      return NextResponse.json({ success: false, message: "Terlalu banyak percobaan pendaftaran. Coba lagi nanti." }, { status: 429 });
    }

    const existingUsername = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingUsername) {
      return NextResponse.json({ success: false, message: "Username sudah digunakan" }, { status: 409 });
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingEmail) {
      return NextResponse.json({ success: false, message: "Email sudah terdaftar" }, { status: 409 });
    }

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        fullName,
        passwordHash: await hashPassword(password),
        role: "OPERATOR",
      },
      select: { id: true, username: true, email: true, fullName: true, role: true },
    });

    await createSession(newUser, request);

    return NextResponse.json({
      success: true,
      message: "Pendaftaran berhasil",
      data: { id: newUser.id, username: newUser.username, fullName: newUser.fullName, role: newUser.role },
    });
  } catch (err) {
    const duplicate = duplicateRegistrationResponse(err);
    if (duplicate) return duplicate;
    return apiErrorResponse(err, "Terjadi kesalahan pada server saat pendaftaran");
  }
}

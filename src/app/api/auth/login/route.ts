import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { username, password } = parsed.data;

    // Search user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: { equals: username, mode: "insensitive" } }, { email: { equals: username, mode: "insensitive" } }],
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Username atau password salah" }, { status: 401 });
    }

    // Reject dummy hash explicitly
    if (user.passwordHash.startsWith("scrypt:dummy_hash_for_demo")) {
      return NextResponse.json(
        {
          success: false,
          message: "Akun belum dikonfigurasi password awal. Jalankan CLI setup password terlebih dahulu.",
        },
        { status: 403 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: "Username atau password salah" }, { status: 401 });
    }

    await createSession(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: `Login berhasil sebagai ${user.fullName} (${user.role})`,
      data: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan pada server saat login";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

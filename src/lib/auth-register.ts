import { z } from "zod";
import { NextResponse } from "next/server";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(60, "Username maksimal 60 karakter")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username hanya boleh huruf, angka, underscore, dan dash"),
  email: z.string().trim().email("Format email tidak valid").max(255, "Email terlalu panjang"),
  fullName: z
    .string()
    .trim()
    .min(2, "Nama lengkap minimal 2 karakter")
    .max(100, "Nama lengkap terlalu panjang"),
  password: z.string().min(8, "Password minimal 8 karakter").max(128, "Password terlalu panjang"),
});

export function duplicateRegistrationResponse(error: unknown): NextResponse | null {
  if (!(error instanceof Error)) return null;
  if (error.constructor?.name !== "PrismaClientKnownRequestError") return null;
  if ((error as any).code !== "P2002") return null;
  return NextResponse.json({ success: false, message: "Username atau email sudah digunakan" }, { status: 409 });
}

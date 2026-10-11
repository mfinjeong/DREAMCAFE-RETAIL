import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Role, User } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "dreamcafe_session";
const SESSION_DAYS = 7;

export type AuthUser = Pick<User, "id" | "username" | "email" | "fullName" | "role">;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function createSession(user: AuthUser, request?: Request): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const requestHeaders = request ? new Headers(request.headers) : await headers();

  await prisma.sessionToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: requestHeaders.get("user-agent") || null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.sessionToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;

  return {
    id: session.user.id,
    username: session.user.username,
    email: session.user.email,
    fullName: session.user.fullName,
    role: session.user.role,
  };
}

export async function requireUser(roles?: Role[]): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (roles && !roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.sessionToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "logout" },
    });
  }
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
}

export function authErrorResponse(error: unknown): { status: number; message: string } {
  if (error instanceof Error && error.message === "UNAUTHENTICATED") return { status: 401, message: "Sesi login tidak valid" };
  if (error instanceof Error && error.message === "FORBIDDEN") return { status: 403, message: "Anda tidak memiliki izin untuk operasi ini" };
  return { status: 500, message: "Terjadi kesalahan server" };
}

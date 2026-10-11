import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
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

  try {
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
  } catch (error) {
    // DB connection failure or query error: fail closed, do not assume anonymous
    console.error("Auth DB query failed:", error instanceof Error ? error.message : String(error));
    throw new Error("AUTH_DB_ERROR");
  }
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

function isPrismaOrInternalError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  const name = err.constructor.name;
  return (
    msg === "AUTH_DB_ERROR" ||
    name.includes("Prisma") ||
    msg.includes("\nInvalid `prisma.") ||
    msg.includes("PrismaClient") ||
    msg.includes("Can't reach database server") ||
    /timed out fetching a (new )?connection/i.test(msg)
  );
}

export function safeErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  if (isPrismaOrInternalError(err)) {
    console.error("[Internal Error]", err.constructor.name, err.message.slice(0, 200));
    return fallback;
  }
  return err.message;
}

export function prismaErrorCode(err: unknown): string | null {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string" && /^P\d{4}$/.test(code)) return code;
  }
  return null;
}

export class ApiConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConflictError";
  }
}

export type ApiErrorCategory = "auth" | "internal" | "business" | "conflict";

export function classifyApiError(err: unknown): ApiErrorCategory {
  if (err instanceof Error && (err.message === "UNAUTHENTICATED" || err.message === "FORBIDDEN")) {
    return "auth";
  }
  if (err instanceof ApiConflictError) return "conflict";
  if (prismaErrorCode(err) === "P2002") return "conflict";
  if (isPrismaOrInternalError(err)) return "internal";
  return "business";
}

export function apiErrorStatus(
  err: unknown,
  businessStatus = 400
): number {
  const category = classifyApiError(err);
  if (category === "auth") {
    return err instanceof Error && err.message === "FORBIDDEN" ? 403 : 401;
  }
  if (category === "conflict") return 409;
  if (category === "internal") return 500;
  return businessStatus;
}

export function apiErrorResponse(
  err: unknown,
  fallbackMessage: string,
  businessStatus = 400
): NextResponse {
  if (err instanceof Error && (err.message === "UNAUTHENTICATED" || err.message === "FORBIDDEN")) {
    return authErrorResponse(err);
  }
  const status = apiErrorStatus(err, businessStatus);
  let message = safeErrorMessage(err, fallbackMessage);
  if (status === 409 && message === fallbackMessage) {
    message = "Konflik data: akun atau sesi sudah memiliki alokasi aktif.";
  }
  return NextResponse.json({ success: false, message }, { status });
}

export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return NextResponse.json({ success: false, message: "Sesi login tidak valid" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ success: false, message: "Anda tidak memiliki izin untuk operasi ini" }, { status: 403 });
  }
  return NextResponse.json({ success: false, message: "Terjadi kesalahan server" }, { status: 500 });
}

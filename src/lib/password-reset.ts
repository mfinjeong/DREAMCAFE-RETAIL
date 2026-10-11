import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const RESET_TOKEN_HOURS = 1;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordResetToken.create({ data: { userId, tokenHash: hashResetToken(token), expiresAt } }),
  ]);
  return token;
}

export async function validatePasswordResetToken(token: string) {
  const tokenHash = hashResetToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt !== null || record.expiresAt <= new Date()) return null;
  return record;
}

export interface ExecuteResetResult {
  success: boolean;
  code: "SUCCESS" | "INVALID_OR_EXPIRED" | "ALREADY_USED" | "ERROR";
  message: string;
}

/**
 * Atomically consumes a reset token, updates the user's password,
 * and revokes all active session tokens for the user in a single database transaction.
 * If password update fails or concurrent consumption occurs, token will NOT be marked as used.
 */
export async function executePasswordReset(
  token: string,
  newPasswordHash: string
): Promise<ExecuteResetResult> {
  const tokenHash = hashResetToken(token);
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Find token record
      const record = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
      });

      if (!record || record.usedAt !== null || record.expiresAt <= now) {
        return {
          success: false,
          code: "INVALID_OR_EXPIRED",
          message: "Token tidak valid atau sudah kedaluwarsa",
        };
      }

      // 2. Atomic consumption guard: only update if usedAt is still null
      const updateResult = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          usedAt: now,
        },
      });

      if (updateResult.count === 0) {
        return {
          success: false,
          code: "ALREADY_USED",
          message: "Token sudah pernah digunakan",
        };
      }

      // 3. Update user password
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash: newPasswordHash },
      });

      // 4. Revoke all active sessions for this user
      await tx.sessionToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: {
          revokedAt: now,
          revokedReason: "Password reset",
        },
      });

      return {
        success: true,
        code: "SUCCESS",
        message: "Password berhasil direset. Silakan login.",
      };
    });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`[auth:executePasswordReset] ${errorName}`);
    return {
      success: false,
      code: "ERROR",
      message: "Terjadi kesalahan server",
    };
  }
}


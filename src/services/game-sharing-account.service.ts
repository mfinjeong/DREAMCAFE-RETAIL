import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  gameSharingAccountCreateSchema,
  gameSharingAccountUpdateSchema,
  allocateAccountSchema,
  releaseAllocationSchema,
  changeAccountStatusSchema,
  auditLogFilterSchema,
  type GameSharingAccountCreateInput,
  type GameSharingAccountUpdateInput,
  type AllocateAccountInput,
  type ReleaseAllocationInput,
  type ChangeAccountStatusInput,
  type AuditLogFilter,
} from "@/lib/game-sharing-account-validators";
import {
  sanitizeRentalAccountForClient,
  getConfiguredSecretProvider,
  isValidSecretRefFormat,
} from "@/lib/secret-manager";
import { SharingAccountStatus, type Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

// Row lock serializes status/isActive changes with allocateAccount's conditional
// update, so the active-allocation check below sees committed allocations.
async function lockAccountRow(tx: Tx, accountId: string) {
  await tx.$queryRaw`SELECT "id" FROM "GameSharingAccount" WHERE "id" = ${accountId} FOR UPDATE`;
}

// Helper: lookup existing active allocation by session id.
async function getActiveAllocationBySessionId(tx: Tx, sessionId: string) {
  return tx.gameSharingAccountAllocation.findFirst({
    where: { sessionId, status: "ACTIVE" },
  });
}

/**
 * Releases an ACTIVE allocation inside the caller's transaction. Lifecycle callers
 * (stopSession / checkoutSession) pass their own tx so release commits or rolls back
 * together with session completion. The allocation is claimed with a conditional
 * updateMany so two concurrent releases cannot both succeed.
 */
export async function releaseAllocationInTx(
  tx: Tx,
  allocationId: string,
  action: "RELEASED" | "ALLOCATION_CANCELLED",
  performedByUserId: string
) {
  const alloc = await tx.gameSharingAccountAllocation.findUniqueOrThrow({
    where: { id: allocationId },
  });

  await lockAccountRow(tx, alloc.accountId);

  const claimed = await tx.gameSharingAccountAllocation.updateMany({
    where: { id: allocationId, status: "ACTIVE" },
    data: { status: "RELEASED", releasedAt: new Date() },
  });

  if (claimed.count !== 1) {
    // Allocation was already released or never active.
    return { allocationId, accountStatus: null };
  }

  const account = await tx.gameSharingAccount.findUniqueOrThrow({
    where: { id: alloc.accountId },
  });

  let newStatus = account.status;

  // If account is currently IN_USE and still active, restore it to AVAILABLE
  // only when it is not pinned to MAINTENANCE or OFFLINE.
  if (account.status === "IN_USE" && account.isActive) {
    newStatus = "AVAILABLE";
    await tx.gameSharingAccount.update({
      where: { id: account.id },
      data: { status: "AVAILABLE" },
    });
  }

  await tx.gameSharingAccountAuditLog.create({
    data: {
      accountId: account.id,
      accountCodeSnapshot: account.accountCode,
      gameIdSnapshot: account.gameId,
      allocationId: alloc.id,
      action,
      previousStatus: account.status,
      newStatus,
      performedByUserId,
      details: `${action === "RELEASED" ? "Released" : "Cancelled"} allocation for session ${alloc.sessionId}`,
    },
  });

  return { allocationId, accountStatus: newStatus };
}

/**
 * Find and release any active allocation for a session, idempotently. Intended to be
 * called inside stopSession/checkoutSession transactions.
 */
export async function releaseActiveAllocationForSessionInTx(
  tx: Tx,
  sessionId: string,
  performedByUserId: string
) {
  const alloc = await tx.gameSharingAccountAllocation.findFirst({
    where: { sessionId, status: "ACTIVE" },
  });
  if (!alloc) return null;
  return releaseAllocationInTx(tx, alloc.id, "RELEASED", performedByUserId);
}

export class GameSharingAccountService {
  // Create account
  async createAccount(input: GameSharingAccountCreateInput, performedByUserId: string) {
    const data = gameSharingAccountCreateSchema.parse(input);
    if (data.secretRef && !isValidSecretRefFormat(data.secretRef)) {
      throw new Error("Invalid secret reference format");
    }

    return prisma.$transaction(async (tx) => {
      const account = await tx.gameSharingAccount.create({
        data: {
          accountCode: data.accountCode,
          gameId: data.gameId,
          status: data.status ?? "AVAILABLE",
          secretRef: data.secretRef,
          notes: data.notes,
        },
      });

      await tx.gameSharingAccountAuditLog.create({
        data: {
          accountId: account.id,
          accountCodeSnapshot: account.accountCode,
          gameIdSnapshot: account.gameId,
          action: "CREATED",
          newStatus: account.status,
          performedByUserId,
          details: `Account created with status ${account.status}`,
        },
      });

      return sanitizeRentalAccountForClient(account);
    });
  }

  // Update account (notes, secretRef, isActive). Status changes must use changeStatus.
  async updateAccount(accountId: string, input: GameSharingAccountUpdateInput, performedByUserId: string) {
    const data = gameSharingAccountUpdateSchema.parse(input);
    if (data.secretRef && !isValidSecretRefFormat(data.secretRef)) {
      throw new Error("Invalid secret reference format");
    }

    return prisma.$transaction(async (tx) => {
      await lockAccountRow(tx, accountId);
      const current = await tx.gameSharingAccount.findUniqueOrThrow({ where: { id: accountId } });

      // Prevent deactivation or isActive=false when an allocation is active.
      const activeAlloc = await tx.gameSharingAccountAllocation.findFirst({
        where: { accountId, status: "ACTIVE" },
      });
      if (activeAlloc) {
        if (data.isActive === false) {
          throw new Error("Cannot deactivate account with active allocation. Release through session end flow.");
        }
      }

      const updated = await tx.gameSharingAccount.update({
        where: { id: accountId },
        data: {
          secretRef: data.secretRef,
          notes: data.notes,
          isActive: data.isActive,
        },
      });

      await tx.gameSharingAccountAuditLog.create({
        data: {
          accountId: updated.id,
          accountCodeSnapshot: updated.accountCode,
          gameIdSnapshot: updated.gameId,
          action: "UPDATED",
          previousStatus: current.status,
          newStatus: updated.status,
          performedByUserId,
          details: `Account updated: isActive ${current.isActive} -> ${updated.isActive}`,
        },
      });

      return sanitizeRentalAccountForClient(updated);
    });
  }

  // Change status with validation. IN_USE can only be set by allocateAccount.
  async changeStatus(input: ChangeAccountStatusInput, performedByUserId: string) {
    const data = changeAccountStatusSchema.parse(input);

    return prisma.$transaction(async (tx) => {
      await lockAccountRow(tx, data.accountId);
      const current = await tx.gameSharingAccount.findUniqueOrThrow({ where: { id: data.accountId } });

      const activeAlloc = await tx.gameSharingAccountAllocation.findFirst({
        where: { accountId: data.accountId, status: "ACTIVE" },
      });
      if (activeAlloc) {
        throw new Error("Cannot change status of account with active allocation. Release through session end flow.");
      }

      const updated = await tx.gameSharingAccount.update({
        where: { id: data.accountId },
        data: { status: data.status },
      });

      await tx.gameSharingAccountAuditLog.create({
        data: {
          accountId: updated.id,
          accountCodeSnapshot: updated.accountCode,
          gameIdSnapshot: updated.gameId,
          action: "STATUS_CHANGED",
          previousStatus: current.status,
          newStatus: updated.status,
          performedByUserId,
          details: data.notes ?? `Status changed from ${current.status} to ${updated.status}`,
        },
      });

      return sanitizeRentalAccountForClient(updated);
    });
  }

  // Allocate account to session (atomic, row lock + conditional update + unique indexes)
  async allocateAccount(input: AllocateAccountInput, performedByUserId: string) {
    const data = allocateAccountSchema.parse(input);

    return prisma.$transaction(async (tx) => {
      // Validate session exists and is active
      const session = await tx.session.findUniqueOrThrow({ where: { id: data.sessionId } });
      if (session.status !== "ACTIVE") {
        throw new Error("Session is not active");
      }

      // Validate session does not already have an active sharing account allocation
      const existingAlloc = await getActiveAllocationBySessionId(tx, data.sessionId);
      if (existingAlloc) {
        throw new Error("Session already has an active sharing account allocation");
      }

      // Lock account row BEFORE any checks to serialize concurrent operations
      await lockAccountRow(tx, data.accountId);

      // Validate account exists, is active, and AVAILABLE (after lock)
      const account = await tx.gameSharingAccount.findUniqueOrThrow({ where: { id: data.accountId } });
      if (!account.isActive) {
        throw new Error("Account is not active");
      }
      if (account.status !== "AVAILABLE") {
        throw new Error(`Account is not available (current: ${account.status})`);
      }

      // Validate game match (session must have a gameId and it must match account)
      if (!session.gameId || session.gameId !== account.gameId) {
        throw new Error("Session game does not match account game");
      }

      // Conditional update: only if still AVAILABLE after lock
      const updated = await tx.gameSharingAccount.updateMany({
        where: { id: data.accountId, status: "AVAILABLE", isActive: true },
        data: { status: "IN_USE" },
      });
      if (updated.count === 0) {
        throw new Error("Account no longer available or was allocated concurrently");
      }

      // Create allocation
      const allocation = await tx.gameSharingAccountAllocation.create({
        data: {
          accountId: data.accountId,
          sessionId: data.sessionId,
          status: "ACTIVE",
        },
      });

      // Audit
      await tx.gameSharingAccountAuditLog.create({
        data: {
          accountId: account.id,
          accountCodeSnapshot: account.accountCode,
          gameIdSnapshot: account.gameId,
          allocationId: allocation.id,
          action: "ALLOCATED",
          newStatus: "IN_USE",
          performedByUserId,
          details: `Allocated to session ${data.sessionId}`,
        },
      });

      return {
        allocation,
        account: sanitizeRentalAccountForClient({ ...account, status: "IN_USE" }),
      };
    });
  }

  // Release allocation (standalone wrapper; lifecycle callers use releaseAllocationInTx inside their own transaction)
  async releaseAllocation(input: ReleaseAllocationInput, performedByUserId: string) {
    const data = releaseAllocationSchema.parse(input);
    return prisma.$transaction((tx) =>
      releaseAllocationInTx(tx, data.allocationId, "RELEASED", performedByUserId)
    );
  }

  // Cancel allocation (admin override, same as release but different action)
  async cancelAllocation(input: ReleaseAllocationInput, performedByUserId: string) {
    const data = releaseAllocationSchema.parse(input);
    return prisma.$transaction((tx) =>
      releaseAllocationInTx(tx, data.allocationId, "ALLOCATION_CANCELLED", performedByUserId)
    );
  }

  // Get account by ID (sanitized)
  async getAccount(accountId: string) {
    const account = await prisma.gameSharingAccount.findUnique({ where: { id: accountId } });
    return account ? sanitizeRentalAccountForClient(account) : null;
  }

  // List accounts with optional filters
  async listAccounts(filter?: { gameId?: string; status?: string }, performedByUserId?: string) {
    // performedByUserId unused; keep for backward compatibility with route call
    const where: Prisma.GameSharingAccountWhereInput = {};
    if (filter?.gameId) where.gameId = filter.gameId;
    if (filter?.status) where.status = filter.status as SharingAccountStatus;

    const accounts = await prisma.gameSharingAccount.findMany({
      where,
      orderBy: { accountCode: "asc" },
        include: {
          allocations: {
            where: { status: "ACTIVE" },
            take: 1,
            include: {
              session: {
                select: {
                  id: true,
                  sessionNumber: true,
                  pc: { select: { name: true } },
                  console: { select: { name: true } },
                },
              },
            },
          },
        },
      });
      return accounts.map((a) => {
        const sanitized = sanitizeRentalAccountForClient(a);
        const activeAlloc = a.allocations[0];
        return {
          ...sanitized,
          activeAllocation: activeAlloc
            ? {
                id: activeAlloc.id,
                sessionId: activeAlloc.sessionId,
                session: activeAlloc.session
                  ? {
                      sessionNumber: activeAlloc.session.sessionNumber,
                      pc: activeAlloc.session.pc,
                      console: activeAlloc.session.console,
                    }
                  : null,
              }
            : null,
        };
      });
    }

  // Get accounts by game
  async getAccountsByGame(gameId: string) {
    const accounts = await prisma.gameSharingAccount.findMany({
      where: { gameId },
      orderBy: { accountCode: "asc" },
      include: {
        allocations: {
          where: { status: "ACTIVE" },
          take: 1,
          include: {
            session: {
              select: {
                id: true,
                sessionNumber: true,
                pc: { select: { name: true } },
                console: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    return accounts.map((a) => {
      const sanitized = sanitizeRentalAccountForClient(a);
      const activeAlloc = a.allocations[0];
      return {
        ...sanitized,
        activeAllocation: activeAlloc
          ? {
              id: activeAlloc.id,
              sessionId: activeAlloc.sessionId,
              session: activeAlloc.session
                ? {
                    sessionNumber: activeAlloc.session.sessionNumber,
                    pc: activeAlloc.session.pc,
                    console: activeAlloc.session.console,
                  }
                : null,
            }
          : null,
      };
    });
  }

  // Get active allocation for session
  async getActiveAllocationBySession(sessionId: string) {
    return prisma.gameSharingAccountAllocation.findFirst({
      where: { sessionId, status: "ACTIVE" },
      include: {
        account: {
          select: {
            id: true,
            accountCode: true,
            gameId: true,
            status: true,
            notes: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  // Get active allocation for account
  async getActiveAllocationByAccount(accountId: string) {
    return prisma.gameSharingAccountAllocation.findFirst({
      where: { accountId, status: "ACTIVE" },
      include: { session: true },
    });
  }

  // List audit logs
  async listAuditLogs(filter: AuditLogFilter) {
    const data = auditLogFilterSchema.parse(filter);
    return prisma.gameSharingAccountAuditLog.findMany({
      where: {
        accountId: data.accountId,
        allocationId: data.allocationId,
        createdAt: { gte: data.startDate, lte: data.endDate },
        action: data.action,
        performedByUserId: data.performedByUserId,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  // Resolve credentials (fail-closed, requires server-authenticated role check)
  async getCredentials(accountId: string, performedByUserId: string) {
    const account = await prisma.gameSharingAccount.findUniqueOrThrow({ where: { id: accountId } });
    if (!account.secretRef) {
      return null;
    }

    const secretProvider = getConfiguredSecretProvider();
    const secret = await secretProvider.resolveSecret(account.secretRef);

    // Fail closed: return null if secret manager not configured or secret not found.
    // Never return mock credentials.
    return secret || null;
  }
}

export const gameSharingAccountService = new GameSharingAccountService();

-- DRAFT ONLY — DO NOT APPLY
-- Game Sharing Account Management. Additive proposal only.
-- Do not move this file into prisma/migrations without approved schema review.

CREATE TYPE "SharingAccountStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OFFLINE');
CREATE TYPE "SharingAccountAllocationStatus" AS ENUM ('ACTIVE', 'RELEASED');

CREATE TABLE "GameSharingAccount" (
  "id" TEXT NOT NULL,
  "accountCode" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "status" "SharingAccountStatus" NOT NULL DEFAULT 'AVAILABLE',
  "secretRef" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameSharingAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GameSharingAccount_accountCode_key" ON "GameSharingAccount"("accountCode");
CREATE INDEX "GameSharingAccount_gameId_idx" ON "GameSharingAccount"("gameId");
CREATE INDEX "GameSharingAccount_status_idx" ON "GameSharingAccount"("status");
CREATE INDEX "GameSharingAccount_isActive_idx" ON "GameSharingAccount"("isActive");
CREATE INDEX "GameSharingAccount_gameId_status_idx" ON "GameSharingAccount"("gameId", "status");
ALTER TABLE "GameSharingAccount" ADD CONSTRAINT "GameSharingAccount_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "GameSharingAccountAllocation" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "status" "SharingAccountAllocationStatus" NOT NULL DEFAULT 'ACTIVE',
  "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  CONSTRAINT "GameSharingAccountAllocation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GameSharingAccountAllocation_accountId_idx" ON "GameSharingAccountAllocation"("accountId");
CREATE INDEX "GameSharingAccountAllocation_sessionId_idx" ON "GameSharingAccountAllocation"("sessionId");
CREATE INDEX "GameSharingAccountAllocation_status_idx" ON "GameSharingAccountAllocation"("status");
CREATE UNIQUE INDEX "GameSharingAccountAllocation_accountId_active_key"
  ON "GameSharingAccountAllocation"("accountId") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "GameSharingAccountAllocation_sessionId_active_key"
  ON "GameSharingAccountAllocation"("sessionId") WHERE "status" = 'ACTIVE';
ALTER TABLE "GameSharingAccountAllocation" ADD CONSTRAINT "GameSharingAccountAllocation_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "GameSharingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameSharingAccountAllocation" ADD CONSTRAINT "GameSharingAccountAllocation_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "GameSharingAccountAuditLog" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "accountCodeSnapshot" TEXT NOT NULL,
  "gameIdSnapshot" TEXT NOT NULL,
  "allocationId" TEXT,
  "action" TEXT NOT NULL,
  "previousStatus" TEXT,
  "newStatus" TEXT,
  "performedByUserId" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameSharingAccountAuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GameSharingAccountAuditLog_action_check" CHECK (
    "action" IN (
      'CREATED', 'UPDATED', 'STATUS_CHANGED', 'ALLOCATED', 'RELEASED',
      'ALLOCATION_CANCELLED'
    )
  )
);
CREATE INDEX "GameSharingAccountAuditLog_accountId_idx" ON "GameSharingAccountAuditLog"("accountId");
CREATE INDEX "GameSharingAccountAuditLog_allocationId_idx" ON "GameSharingAccountAuditLog"("allocationId");
CREATE INDEX "GameSharingAccountAuditLog_createdAt_idx" ON "GameSharingAccountAuditLog"("createdAt");
ALTER TABLE "GameSharingAccountAuditLog" ADD CONSTRAINT "GameSharingAccountAuditLog_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "GameSharingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameSharingAccountAuditLog" ADD CONSTRAINT "GameSharingAccountAuditLog_performedByUserId_fkey"
  FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Required schema relations, not applied here:
-- Game.sharingAccounts GameSharingAccount[]
-- Session.sharingAllocations GameSharingAccountAllocation[]
-- User.sharingAccountAuditLogs GameSharingAccountAuditLog[]
-- No account hourlyRate, allocation durationMinutes, price snapshot, or extension fields.

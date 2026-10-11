-- CreateEnum
CREATE TYPE "SharingAccountStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "SharingAccountAllocationStatus" AS ENUM ('ACTIVE', 'RELEASED');

-- CreateTable
CREATE TABLE "GameSharingAccount" (
    "id" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "status" "SharingAccountStatus" NOT NULL DEFAULT 'AVAILABLE',
    "secretRef" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSharingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSharingAccountAllocation" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "SharingAccountAllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "GameSharingAccountAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "GameSharingAccountAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameSharingAccount_accountCode_key" ON "GameSharingAccount"("accountCode");

-- CreateIndex
CREATE INDEX "GameSharingAccount_gameId_idx" ON "GameSharingAccount"("gameId");

-- CreateIndex
CREATE INDEX "GameSharingAccount_status_idx" ON "GameSharingAccount"("status");

-- CreateIndex
CREATE INDEX "GameSharingAccount_isActive_idx" ON "GameSharingAccount"("isActive");

-- CreateIndex
CREATE INDEX "GameSharingAccount_gameId_status_idx" ON "GameSharingAccount"("gameId", "status");

-- CreateIndex
CREATE INDEX "GameSharingAccountAllocation_accountId_idx" ON "GameSharingAccountAllocation"("accountId");

-- CreateIndex
CREATE INDEX "GameSharingAccountAllocation_sessionId_idx" ON "GameSharingAccountAllocation"("sessionId");

-- CreateIndex
CREATE INDEX "GameSharingAccountAllocation_status_idx" ON "GameSharingAccountAllocation"("status");

-- CreateIndex (Partial unique - one ACTIVE allocation per account)
CREATE UNIQUE INDEX "GameSharingAccountAllocation_accountId_active_key" ON "GameSharingAccountAllocation"("accountId") WHERE "status" = 'ACTIVE';

-- CreateIndex (Partial unique - one ACTIVE allocation per session)
CREATE UNIQUE INDEX "GameSharingAccountAllocation_sessionId_active_key" ON "GameSharingAccountAllocation"("sessionId") WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE INDEX "GameSharingAccountAuditLog_accountId_idx" ON "GameSharingAccountAuditLog"("accountId");

-- CreateIndex
CREATE INDEX "GameSharingAccountAuditLog_allocationId_idx" ON "GameSharingAccountAuditLog"("allocationId");

-- CreateIndex
CREATE INDEX "GameSharingAccountAuditLog_createdAt_idx" ON "GameSharingAccountAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "GameSharingAccount" ADD CONSTRAINT "GameSharingAccount_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSharingAccountAllocation" ADD CONSTRAINT "GameSharingAccountAllocation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "GameSharingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSharingAccountAllocation" ADD CONSTRAINT "GameSharingAccountAllocation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSharingAccountAuditLog" ADD CONSTRAINT "GameSharingAccountAuditLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "GameSharingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSharingAccountAuditLog" ADD CONSTRAINT "GameSharingAccountAuditLog_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddConstraint (Check for valid audit actions)
ALTER TABLE "GameSharingAccountAuditLog" ADD CONSTRAINT "GameSharingAccountAuditLog_action_check" CHECK ("action" IN ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'ALLOCATED', 'RELEASED', 'ALLOCATION_CANCELLED'));

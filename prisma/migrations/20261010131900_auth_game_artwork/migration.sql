-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHashSalt" TEXT;

-- CreateEnum
CREATE TYPE "GameImageSource" AS ENUM ('AUTO_STEAM', 'MANUAL', 'FALLBACK');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "imageSource" "GameImageSource" NOT NULL DEFAULT 'AUTO_STEAM';
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "steamAppId" INTEGER;
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "artworkVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "manualImagePath" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SessionToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "SessionToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SessionToken_userId_idx" ON "SessionToken"("userId");
CREATE INDEX IF NOT EXISTS "SessionToken_tokenHash_idx" ON "SessionToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "SessionToken_expiresAt_idx" ON "SessionToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "SessionToken_createdAt_idx" ON "SessionToken"("createdAt");

-- AddForeignKey
ALTER TABLE "SessionToken" ADD CONSTRAINT "SessionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert seed admin password update via later script
-- Password will be updated via environment variable using bcrypt hash, not directly in migration
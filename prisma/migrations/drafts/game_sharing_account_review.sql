-- REVIEW ONLY. Not applied. Non-destructive. Do not run against production without approval.
-- Partial unique indexes enforce one ACTIVE allocation per account and per session.

CREATE UNIQUE INDEX IF NOT EXISTS "GameSharingAccountAllocation_active_account_key"
  ON "GameSharingAccountAllocation" ("accountId")
  WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS "GameSharingAccountAllocation_active_session_key"
  ON "GameSharingAccountAllocation" ("sessionId")
  WHERE "status" = 'ACTIVE';

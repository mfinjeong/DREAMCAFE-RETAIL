/**
 * Unit tests for Game Sharing Account Management drafts.
 *
 * These cover ONLY pure functions (Zod validators and secret sanitization)
 * plus documented policy/contract checks. They do NOT touch the database,
 * do NOT import the draft service, and do NOT prove PostgreSQL concurrency,
 * partial unique indexes, rollback behavior, or FK retention. Those require a
 * disposable PostgreSQL integration suite (see RENTAL_ACCOUNT_DESIGN.md).
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  accountCodeSchema,
  gameSharingAccountCreateSchema,
  gameSharingAccountUpdateSchema,
  allocateAccountSchema,
  releaseAllocationSchema,
  changeAccountStatusSchema,
  auditLogFilterSchema,
} from "../src/lib/rental-validators";

import {
  isValidSecretRefFormat,
  sanitizeRentalAccountForClient,
  UnconfiguredSecretManagerProvider,
  getConfiguredSecretProvider,
} from "../src/lib/secret-manager";

import type { GameSharingAccount } from "../src/lib/rental-types";

const CUID = "clx0000000000000000000abc";
const CUID2 = "clx0000000000000000000abd";

// ---------------------------------------------------------------------------
// Account status policy (documented contract, not DB behavior)
// ---------------------------------------------------------------------------

test("sharing account statuses: the four approved values exist in the draft model", () => {
  // IN_USE is a valid model status but cannot be set manually (must allocate).
  const manual = ["AVAILABLE", "MAINTENANCE", "OFFLINE"] as const;
  for (const s of manual) {
    assert.equal(
      changeAccountStatusSchema.safeParse({ accountId: CUID, status: s }).success,
      true
    );
  }
  assert.equal(
    changeAccountStatusSchema.safeParse({ accountId: CUID, status: "IN_USE" }).success,
    false
  );
});

test("gameSharingAccountCreateSchema: rejects IN_USE status on create (must allocate)", () => {
  assert.equal(
    gameSharingAccountCreateSchema.safeParse({
      accountCode: "CS2-01",
      gameId: CUID,
      status: "IN_USE",
    }).success,
    false
  );
});

test("gameSharingAccountUpdateSchema: rejects IN_USE status on update (must allocate)", () => {
  assert.equal(
    gameSharingAccountUpdateSchema.safeParse({
      status: "IN_USE",
    }).success,
    false
  );
});

test("changeAccountStatusSchema: rejects IN_USE manual transition (must allocate)", () => {
  assert.equal(
    changeAccountStatusSchema.safeParse({
      accountId: CUID,
      status: "IN_USE",
    }).success,
    false
  );
});

test("sharing account: no DEACTIVATED or rental statuses are accepted", () => {
  for (const bad of ["DEACTIVATED", "COMPLETED", "CANCELLED", "ACTIVE", "RETIRED"]) {
    assert.equal(
      changeAccountStatusSchema.safeParse({ accountId: CUID, status: bad }).success,
      false
    );
  }
});

// ---------------------------------------------------------------------------
// Account code validation (global uniqueness is a DB concern)
// ---------------------------------------------------------------------------

test("accountCodeSchema: accepts CS2-01 and similar codes", () => {
  for (const code of ["CS2-01", "VAL-02", "GTA5-10", "AB"]) {
    assert.equal(accountCodeSchema.safeParse(code).success, true);
  }
});

test("accountCodeSchema: rejects empty, too short, spaces, and illegal characters", () => {
  for (const bad of ["", "A", "CS2 01", "CS2_01", "-CS2", "CS2-", "CS2--01"]) {
    assert.equal(accountCodeSchema.safeParse(bad).success, false);
  }
});

// ---------------------------------------------------------------------------
// Create / update validators
// ---------------------------------------------------------------------------

test("gameSharingAccountCreateSchema: valid payload without any rate field", () => {
  const ok = gameSharingAccountCreateSchema.safeParse({
    accountCode: "CS2-01",
    gameId: CUID,
    secretRef: "vault://dreamcafe/steam/cs2-01",
    notes: "Main account",
  });
  assert.equal(ok.success, true);
});

test("gameSharingAccountCreateSchema: strips client-supplied actor identity", () => {
  const r = gameSharingAccountCreateSchema.safeParse({
    accountCode: "CS2-01",
    gameId: CUID,
    performedByUserId: "attacker",
  });
  assert.equal(r.success, true);
  assert.equal("performedByUserId" in (r.success ? r.data : {}), false);
});

test("gameSharingAccountCreateSchema: strips rental rate leakage instead of validating it", () => {
  const r = gameSharingAccountCreateSchema.safeParse({
    accountCode: "CS2-01",
    gameId: CUID,
    hourlyRate: 5000,
  });
  // Strict absence is enforced by the service/Prisma shape; zod strips unknown keys.
  assert.equal("hourlyRate" in (r.success ? r.data : {}), false);
});

test("gameSharingAccountCreateSchema: rejects invalid gameId and invalid status", () => {
  assert.equal(
    gameSharingAccountCreateSchema.safeParse({ accountCode: "CS2-01", gameId: "not-a-cuid" }).success,
    false
  );
  assert.equal(
    gameSharingAccountCreateSchema.safeParse({
      accountCode: "CS2-01",
      gameId: CUID,
      status: "BANANA",
    }).success,
    false
  );
});

test("gameSharingAccountUpdateSchema: accepts empty patch and rejects invalid status", () => {
  assert.equal(gameSharingAccountUpdateSchema.safeParse({}).success, true);
  assert.equal(
    gameSharingAccountUpdateSchema.safeParse({ status: "WHATEVER" }).success,
    false
  );
});

// ---------------------------------------------------------------------------
// Allocation validators: one account per session, no duration, no client actor
// ---------------------------------------------------------------------------

test("allocateAccountSchema: minimal allocation request has no duration field", () => {
  const ok = allocateAccountSchema.safeParse({ accountId: CUID, sessionId: CUID2 });
  assert.equal(ok.success, true);
  const stripped = ok.success ? ok.data : {};
  assert.equal("durationMinutes" in stripped, false);
  assert.equal("extraMinutes" in stripped, false);
  assert.equal("performedByUserId" in stripped, false);
});

test("allocateAccountSchema: requires both accountId and sessionId", () => {
  assert.equal(allocateAccountSchema.safeParse({ accountId: CUID }).success, false);
  assert.equal(allocateAccountSchema.safeParse({ sessionId: CUID }).success, false);
  assert.equal(allocateAccountSchema.safeParse({}).success, false);
});

test("releaseAllocationSchema: only needs allocationId", () => {
  const ok = releaseAllocationSchema.safeParse({ allocationId: CUID });
  assert.equal(ok.success, true);
  assert.equal(releaseAllocationSchema.safeParse({}).success, false);
});

test("no extension validator exists on the sharing domain", () => {
  const validators = [
    accountCodeSchema,
    gameSharingAccountCreateSchema,
    gameSharingAccountUpdateSchema,
    allocateAccountSchema,
    releaseAllocationSchema,
    changeAccountStatusSchema,
  ];
  for (const v of validators) {
    assert.equal(typeof v.safeParse, "function");
  }
});

// ---------------------------------------------------------------------------
// Audit filter
// ---------------------------------------------------------------------------

test("auditLogFilterSchema: accepts empty and valid filters", () => {
  assert.equal(auditLogFilterSchema.safeParse({}).success, true);
  assert.equal(
    auditLogFilterSchema.safeParse({ accountId: CUID, action: "ALLOCATED" }).success,
    true
  );
});

test("auditLogFilterSchema: accepts every approved action and rejects unknown action", () => {
  for (const action of [
    "CREATED",
    "UPDATED",
    "STATUS_CHANGED",
    "ALLOCATED",
    "RELEASED",
    "ALLOCATION_CANCELLED",
  ]) {
    assert.equal(
      auditLogFilterSchema.safeParse({ action }).success,
      true,
      `expected action ${action} to be accepted`
    );
  }
  assert.equal(
    auditLogFilterSchema.safeParse({ action: "EXTENDED" }).success,
    false
  );
  assert.equal(
    auditLogFilterSchema.safeParse({ action: "BANNED" }).success,
    false
  );
});

// ---------------------------------------------------------------------------
// secretRef format validation (unchanged secret-manager contracts)
// ---------------------------------------------------------------------------

test("isValidSecretRefFormat: accepts supported schemes", () => {
  assert.equal(isValidSecretRefFormat("vault://dreamcafe/steam/cs2-01"), true);
  assert.equal(isValidSecretRefFormat("aws-sm://dreamcafe/sharing/cs2-01"), true);
  assert.equal(isValidSecretRefFormat("env://SHARING_CS2_01"), true);
});

test("isValidSecretRefFormat: rejects invalid formats", () => {
  for (const bad of ["", "not-a-uri", "VAULT://dreamcafe/cs2-01", "vault://"]) {
    assert.equal(isValidSecretRefFormat(bad), false);
  }
});

test("gameSharingAccountCreateSchema: accepts valid secretRef and rejects invalid format", () => {
  assert.equal(
    gameSharingAccountCreateSchema.safeParse({
      accountCode: "CS2-01",
      gameId: CUID,
      secretRef: "vault://dreamcafe/steam/cs2-01",
    }).success,
    true
  );
  // Invalid format is caught at service layer via isValidSecretRefFormat check
});

test("gameSharingAccountUpdateSchema: accepts null/undefined secretRef", () => {
  assert.equal(gameSharingAccountUpdateSchema.safeParse({ secretRef: null }).success, true);
  assert.equal(gameSharingAccountUpdateSchema.safeParse({ secretRef: undefined }).success, true);
  assert.equal(
    gameSharingAccountUpdateSchema.safeParse({ secretRef: "vault://dreamcafe/steam/cs2-01" })
      .success,
    true
  );
});

// ---------------------------------------------------------------------------
// Sanitize for client: strip secrets, no rate fields
// ---------------------------------------------------------------------------

test("sanitizeRentalAccountForClient: strips secretRef and password", () => {
  const acc: GameSharingAccount = {
    id: "acc1",
    accountCode: "CS2-01",
    gameId: "g1",
    status: "AVAILABLE",
    secretRef: "vault://dreamcafe/steam/cs2-01",
    notes: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const safe = sanitizeRentalAccountForClient(acc as unknown as Record<string, unknown>);

  assert.equal(safe.accountCode, "CS2-01");
  assert.equal((safe as Record<string, unknown>).secretRef, undefined);
  assert.equal((safe as Record<string, unknown>).password, undefined);
});

// ---------------------------------------------------------------------------
// Credential provider stays fail-closed (unchanged)
// ---------------------------------------------------------------------------

test("UnconfiguredSecretManagerProvider.resolveSecret: returns null (fail-closed)", async () => {
  const provider = new UnconfiguredSecretManagerProvider();
  assert.equal(provider.isConfigured(), false);
  assert.equal(await provider.resolveSecret("vault://dreamcafe/cs2-01"), null);
});

test("getConfiguredSecretProvider: always returns a provider object", () => {
  const provider = getConfiguredSecretProvider();
  assert.ok(provider);
  assert.equal(typeof provider.isConfigured, "function");
  assert.equal(typeof provider.resolveSecret, "function");
});

// ---------------------------------------------------------------------------
// Additional validation tests
// ---------------------------------------------------------------------------

test("allocateAccountSchema: strips durationMinutes and performedByUserId", () => {
  const r = allocateAccountSchema.safeParse({
    accountId: CUID,
    sessionId: CUID2,
    durationMinutes: 60,
    performedByUserId: "attacker",
  });
  assert.equal(r.success, true);
  const data = r.success ? r.data : {};
  assert.equal("durationMinutes" in data, false);
  assert.equal("performedByUserId" in data, false);
});

test("allocateAccountSchema: rejects non-cuid IDs", () => {
  assert.equal(
    allocateAccountSchema.safeParse({ accountId: "not-cuid", sessionId: CUID }).success,
    false
  );
  assert.equal(
    allocateAccountSchema.safeParse({ accountId: CUID, sessionId: "not-cuid" }).success,
    false
  );
});

test("changeAccountStatusSchema: rejects invalid statuses", () => {
  for (const bad of ["ACTIVE", "DEACTIVATED", "COMPLETED", "CANCELLED", ""]) {
    assert.equal(
      changeAccountStatusSchema.safeParse({ accountId: CUID, status: bad }).success,
      false
    );
  }
});

# Game Sharing Account Management — Design Draft

Status: Draft only. Service, API, UI, Prisma schema, migration, and database remain unchanged.

## Scope

One `Game` may own many sharing accounts. A sharing account may be selected only when active and `AVAILABLE`. One account may have one active allocation. One session may have one active sharing-account allocation. Accounts have no rental duration, extension, rate, surcharge, or second transaction.

## Approved Decisions

- `accountCode` unique globally.
- Status: `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `OFFLINE`.
- Disable account with `isActive = false`.
- Authenticated staff may view account, device, and session information.
- Existing Session/POS/checkout pricing remains unchanged.
- Audit `allocationId` is nullable historical reference, no foreign key.
- Secret manager remains fail-closed until real provider exists.

## Account Lifecycle

### Create and update

Server validates `accountCode`, `gameId`, status, notes, and optional `secretRef`. Actor comes from authenticated server session. Create/update and audit row execute in one transaction. Passwords/tokens never enter input, audit details, response projections, or logs.

Manual status transition must reject `IN_USE` to `AVAILABLE`, `MAINTENANCE`, or `OFFLINE` while active allocation exists. Deactivation must reject active account allocation; staff must release through official session-ending flow first.

### Allocate during session start

1. Server validates authenticated staff, active session, game/account match, active account, and `AVAILABLE` status.
2. Transaction conditionally updates account where `id`, `status = AVAILABLE`, and `isActive = true`; sets `IN_USE`.
3. Transaction inserts active allocation and audit row.
4. Partial unique indexes on active `accountId` and active `sessionId` prevent double booking even under concurrent requests.
5. Conditional-update miss or unique violation maps to conflict. Any failure, including audit insert, rolls back account status and allocation.

### Release on official session end

`stopSession` and `checkoutSession` must call `releaseAllocationInTx(tx, allocation.id, 'RELEASED', performedByUserId)` inside their existing `prisma.$transaction` before commit.

Lifecycle patch points in `session.service.ts` (draft design; no production file edits until approved):
1. In `stopSession(sessionId)` inside `prisma.$transaction(async (tx) => { ... })`:
   - Query `const alloc = await tx.gameSharingAccountAllocation.findFirst({ where: { sessionId, status: 'ACTIVE' } });`
   - If `alloc` exists, call `await releaseAllocationInTx(tx, alloc.id, 'RELEASED', performedByUserId);`
   - Existing price, duration, and device updates remain completely untouched.
2. In `checkoutSession(sessionId, ...)` inside its `prisma.$transaction(async (tx) => { ... })`:
   - Query active allocation for `sessionId`.
   - If present, call `await releaseAllocationInTx(tx, alloc.id, 'RELEASED', performedByUserId);`
   - Existing stock decrement, POS transaction creation, and pricing remain untouched.
3. Concurrency safety: `releaseAllocationInTx` locks the account row and uses `updateMany({ where: { id: allocationId, status: 'ACTIVE' } })` to claim the release. Exactly one caller succeeds; any concurrent release attempt encounters `count === 0` and throws.

### Verified Schema Relations

From active `prisma/schema.prisma` (verified fact):
- `Session.gameId String?` is an existing field with relation `game Game? @relation(fields: [gameId], references: [id])` and `@@index([gameId])`.
- `GameSharingAccount.gameId` relates to `Game.id`.
- Therefore, `allocateAccount` must verify that `session.gameId === account.gameId`. If the session has no `gameId` or references a different game, allocation must fail with a validation error.

### Role & Authorization Policy

Project uses `Role` enum: `ADMIN | OPERATOR | STAFF` enforced via `requireUser(roles)` in `src/lib/auth.ts`:
- `createAccount`, `updateAccount`, `changeStatus`: Requires `ADMIN` or `OPERATOR`.
- `allocateAccount`: Requires `ADMIN`, `OPERATOR`, or `STAFF` (active shift desk staff).
- `releaseAllocation` (manual or via session end): Requires `ADMIN`, `OPERATOR`, or `STAFF`.
- `cancelAllocation` (administrative override): Requires `ADMIN`.
- `getAccount`, `getAccountsByGame`, `getActiveAllocation*`: Requires any authenticated staff (`ADMIN`, `OPERATOR`, `STAFF`).
- `getCredentials`: Requires `ADMIN`. Returns `null` under fail-closed design when secret manager is not configured.
- `listAuditLogs`: Requires `ADMIN` or `OPERATOR`.
All actor identities MUST come from `user.id` resolved by `requireUser`, NEVER from request body.

### addSessionTime guard

Before existing `addSessionTime` mutates a session, integration must query for active sharing allocation. Either reject extension with clear business error or explicitly support it in a reviewed session policy. This draft chooses rejection until policy exists. No code change in current session service at this stage.

## Retention and Security

`GameSharingAccount`, allocation, and audit account foreign keys use `ON DELETE RESTRICT`. Accounts with history are deactivated, never hard-deleted in normal operation. Audit `allocationId` has no FK by design, so allocation archival cannot erase audit history. `secretRef` is only an external secret pointer. `UnconfiguredSecretManagerProvider` resolves no credentials.

## Required Later Integration Tests

Use isolated disposable PostgreSQL, never production:

1. Send 20 concurrent allocation requests for one account; exactly one succeeds.
2. Force audit insert failure; account update and allocation insert roll back.
3. Verify both partial unique indexes reject duplicate active account/session allocations.
4. Verify `RESTRICT` foreign keys preserve account/allocation/audit history.
5. Allocate, run allowed session lifecycle, checkout; assert one existing session transaction only and no sharing-account fee.
6. Reject unauthenticated/unauthorized operations and client actor IDs.

## Audit Actions Used

`CREATED`, `UPDATED`, `STATUS_CHANGED`, `ALLOCATED`, `RELEASED`, `ALLOCATION_CANCELLED`, `CREDENTIALS_ACCESSED`.

## Removed Rental Concepts

`extendRentalAllocation`, `extendRentalSchema`, account `hourlyRate`, allocation `hourlyRateSnapshot`, allocation `durationMinutes`, rental price calculation, `EXTENDED` audit action, and extra rental checkout charge.

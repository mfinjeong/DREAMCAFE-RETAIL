/**
 * In-memory rate limiter for serverless application routes.
 * 
 * LIMITATION NOTICE (Serverless / Vercel):
 * In serverless environments such as Vercel, in-memory state is maintained per container/lambda instance.
 * Requests distributed across different container instances do not share this in-memory cache.
 * This provides robust protection against burst flood attacks per container instance,
 * but does not provide a globally unified counter across horizontally scaled lambda instances.
 * For globally synchronized limits across multi-instance deployments, an external centralized
 * store (e.g., Upstash Redis or a database rate-limit table) must be connected.
 */

import { createHash } from "node:crypto";

export interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  get(key: string): RateLimitRecord | undefined;
  set(key: string, record: RateLimitRecord): void;
  delete(key: string): void;
  entries(): IterableIterator<[string, RateLimitRecord]>;
}

const store: RateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries periodically to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of store.entries()) {
    if (record.resetAt <= now) {
      store.delete(key);
    }
  }
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  cleanupStaleEntries();

  const now = Date.now();
  const existing = store.get(options.key);

  if (!existing || existing.resetAt <= now) {
    const record: RateLimitRecord = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    store.set(options.key, record);
    return {
      success: true,
      limit: options.limit,
      remaining: Math.max(0, options.limit - 1),
      resetAt: record.resetAt,
    };
  }

  if (existing.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  return {
    success: true,
    limit: options.limit,
    remaining: Math.max(0, options.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}

export function getClientIp(request: Request): string | null {
  // Vercel docs: The `x-forwarded-for` header is overwritten by Vercel's platform and contains the client's public IP.
  // External IPs are not forwarded; the value is guaranteed to be the client IP that reached Vercel.
  // Next.js 15+ NextRequest does not have an `ip` property. Use the platform-injected header.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}

export function normalizeIdentifier(raw: string): string {
  return raw.trim().toLowerCase();
}

export function hashRateLimitIdentifier(identifier: string): string {
  return createHash("sha256").update(normalizeIdentifier(identifier)).digest("hex");
}

export function createRateLimitKey(scope: string, clientIp: string | null, identifier?: string): string | null {
  if (identifier !== undefined) {
    const normalized = normalizeIdentifier(identifier);
    if (!normalized) return null;
    return `${scope}:${hashRateLimitIdentifier(normalized)}`;
  }
  if (!clientIp) return null;
  return `${scope}:${hashRateLimitIdentifier(clientIp)}`;
}

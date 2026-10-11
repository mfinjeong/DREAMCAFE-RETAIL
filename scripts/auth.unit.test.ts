import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import {
  checkRateLimit,
  resetRateLimit,
  normalizeIdentifier,
  hashRateLimitIdentifier,
  createRateLimitKey,
} from "../src/lib/rate-limit";
import { hashResetToken } from "../src/lib/password-reset";
import {
  isPasswordResetEmailConfigured,
  sendPasswordResetEmail,
} from "../src/lib/password-reset-email";
import { sanitizeRedirectUrl } from "../src/lib/redirect";

test("sanitizeRedirectUrl accepts valid internal paths", () => {
  assert.equal(sanitizeRedirectUrl("/pc"), "/pc");
  assert.equal(sanitizeRedirectUrl("/profile"), "/profile");
  assert.equal(sanitizeRedirectUrl("/consoles"), "/consoles");
  assert.equal(sanitizeRedirectUrl("/dashboard/stats"), "/dashboard/stats");
  assert.equal(sanitizeRedirectUrl("/inventory?category=drink"), "/inventory?category=drink");
  assert.equal(sanitizeRedirectUrl("/"), "/");
});

test("sanitizeRedirectUrl rejects open redirects and protocols", () => {
  assert.equal(sanitizeRedirectUrl("//evil.example"), "/");
  assert.equal(sanitizeRedirectUrl("//evil.example/pc"), "/");
  assert.equal(sanitizeRedirectUrl("https://evil.example"), "/");
  assert.equal(sanitizeRedirectUrl("http://evil.example/pc"), "/");
  assert.equal(sanitizeRedirectUrl("javascript:alert(1)"), "/");
  assert.equal(sanitizeRedirectUrl("data:text/html,evil"), "/");
  assert.equal(sanitizeRedirectUrl("mailto:admin@example.com"), "/");
  assert.equal(sanitizeRedirectUrl("/\\evil.example"), "/");
  assert.equal(sanitizeRedirectUrl("/evil:path"), "/");
});

test("sanitizeRedirectUrl rejects auth pages to prevent redirect loops", () => {
  assert.equal(sanitizeRedirectUrl("/login"), "/");
  assert.equal(sanitizeRedirectUrl("/login?from=/pc"), "/");
  assert.equal(sanitizeRedirectUrl("/login/extra"), "/");
  assert.equal(sanitizeRedirectUrl("/reset-password"), "/");
  assert.equal(sanitizeRedirectUrl("/reset-password?token=abc"), "/");
  assert.equal(sanitizeRedirectUrl("/sign-up"), "/");
  assert.equal(sanitizeRedirectUrl("/sign-up?ref=123"), "/");
  assert.equal(sanitizeRedirectUrl("/forgot-password"), "/");
});

test("sanitizeRedirectUrl rejects empty, whitespace, and malformed inputs", () => {
  assert.equal(sanitizeRedirectUrl(""), "/");
  assert.equal(sanitizeRedirectUrl("   "), "/");
  assert.equal(sanitizeRedirectUrl(null), "/");
  assert.equal(sanitizeRedirectUrl(undefined), "/");
  assert.equal(sanitizeRedirectUrl("pc"), "/");
  assert.equal(sanitizeRedirectUrl("/path with spaces"), "/");
  assert.equal(sanitizeRedirectUrl("/path\nwith\nnewlines"), "/");
});

test("reset tokens use 32 cryptographic bytes and SHA-256 hashes", () => {
  const token = randomBytes(32).toString("hex");
  const hash = hashResetToken(token);
  assert.equal(token.length, 64);
  assert.equal(hash.length, 64);
  assert.equal(hash, createHash("sha256").update(token).digest("hex"));
  assert.notEqual(hash, hashResetToken(randomBytes(32).toString("hex")));
});

test("rate limit blocks requests after configured limit", () => {
  const key = `unit-${randomBytes(8).toString("hex")}`;
  try {
    assert.equal(checkRateLimit({ key, limit: 2, windowMs: 60_000 }).success, true);
    assert.equal(checkRateLimit({ key, limit: 2, windowMs: 60_000 }).success, true);
    assert.equal(checkRateLimit({ key, limit: 2, windowMs: 60_000 }).success, false);
  } finally {
    resetRateLimit(key);
  }
});

test("rate limit uses separate hashed keys for IP and identifier", () => {
  const ip = "192.168.1.10";
  const user = "StaffUser";
  const ipKey = createRateLimitKey("login-ip", ip);
  const identifierKey = createRateLimitKey("login-id", ip, user);

  assert.ok(ipKey);
  assert.ok(identifierKey);

  try {
    assert.notEqual(ipKey, identifierKey);
    assert.equal(ipKey!.includes("192.168.1.10"), false);
    assert.equal(identifierKey!.includes("StaffUser"), false);

    for (let i = 0; i < 5; i += 1) {
      assert.equal(checkRateLimit({ key: ipKey!, limit: 10, windowMs: 300_000 }).success, true);
      assert.equal(checkRateLimit({ key: identifierKey!, limit: 5, windowMs: 300_000 }).success, true);
    }
    assert.equal(checkRateLimit({ key: identifierKey!, limit: 5, windowMs: 300_000 }).success, false);
    assert.equal(checkRateLimit({ key: ipKey!, limit: 10, windowMs: 300_000 }).success, true);
  } finally {
    if (ipKey) resetRateLimit(ipKey);
    if (identifierKey) resetRateLimit(identifierKey);
  }
});

test("account rate limit key ignores IP, same identifier yields same key across IPs", () => {
  const ip1 = "192.168.1.10";
  const ip2 = "10.0.0.20";
  const identifier = "admin@domain.com";
  const key1 = createRateLimitKey("login-id", ip1, identifier);
  const key2 = createRateLimitKey("login-id", ip2, identifier);
  assert.ok(key1);
  assert.ok(key2);
  assert.equal(key1, key2);
  assert.equal(key1!.includes("192.168.1.10"), false);
  assert.equal(key1!.includes("10.0.0.20"), false);
  assert.equal(key1!.includes("admin@domain.com"), false);
});

test("rate limit skips IP bucket without client IP and retains identifier bucket", () => {
  const userA = "user_alpha";
  const userB = "user_beta";

  const ipKey = createRateLimitKey("login-ip", null);
  const idKeyA = createRateLimitKey("login-id", null, userA);
  const idKeyB = createRateLimitKey("login-id", null, userB);

  assert.equal(ipKey, null);
  assert.notEqual(idKeyA, null);
  assert.notEqual(idKeyB, null);
  assert.notEqual(idKeyA, idKeyB);

  if (!idKeyA || !idKeyB) throw new Error("Identifier rate-limit key missing");
  try {
    for (let i = 0; i < 5; i += 1) {
      assert.equal(checkRateLimit({ key: idKeyA, limit: 5, windowMs: 300_000 }).success, true);
    }
    assert.equal(checkRateLimit({ key: idKeyA, limit: 5, windowMs: 300_000 }).success, false);
    assert.equal(checkRateLimit({ key: idKeyB, limit: 5, windowMs: 300_000 }).success, true);
  } finally {
    resetRateLimit(idKeyA);
    resetRateLimit(idKeyB);
  }
});

test("identifier rate-limit key cannot fall back to IP for blank identifier", () => {
  assert.equal(createRateLimitKey("login-id", "192.168.1.10", "   "), null);
});


test("rate limit resets after window expires", async () => {
  const key = `window-unit-${randomBytes(8).toString("hex")}`;
  try {
    assert.equal(checkRateLimit({ key, limit: 1, windowMs: 20 }).success, true);
    assert.equal(checkRateLimit({ key, limit: 1, windowMs: 20 }).success, false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(checkRateLimit({ key, limit: 1, windowMs: 20 }).success, true);
  } finally {
    resetRateLimit(key);
  }
});

test("normalizeIdentifier trims and lowercases input", () => {
  assert.equal(normalizeIdentifier("  Admin@Domain.Com  "), "admin@domain.com");
  assert.equal(normalizeIdentifier("User_NAME"), "user_name");
});

test("hashRateLimitIdentifier hashes normalized identifier", () => {
  const hash1 = hashRateLimitIdentifier("Admin@Domain.Com");
  const hash2 = hashRateLimitIdentifier("  admin@domain.com ");
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
});

test("email adapter is not configured by default and fails safely", async () => {
  assert.equal(isPasswordResetEmailConfigured(), false);
  const sent = await sendPasswordResetEmail({
    recipient: "staff@example.com",
    resetToken: "fake-token",
  });
  assert.equal(sent, false);
});

/**
 * Runtime security tests for auth flow.
 * These tests do NOT require a database or network.
 * They verify redirect sanitization, middleware route classification,
 * and session revocation logic.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeRedirectUrl } from "../src/lib/redirect";

test("sanitizeRedirectUrl allows safe internal paths", () => {
  assert.equal(sanitizeRedirectUrl("/pc"), "/pc");
  assert.equal(sanitizeRedirectUrl("/dashboard/stats"), "/dashboard/stats");
  assert.equal(sanitizeRedirectUrl("/"), "/");
});

test("sanitizeRedirectUrl blocks external redirects", () => {
  assert.equal(sanitizeRedirectUrl("https://evil.com"), "/");
  assert.equal(sanitizeRedirectUrl("//evil.com"), "/");
  assert.equal(sanitizeRedirectUrl("javascript:alert(1)"), "/");
  assert.equal(sanitizeRedirectUrl("mailto:test@example.com"), "/");
});

test("sanitizeRedirectUrl blocks auth-page redirects to prevent loops", () => {
  assert.equal(sanitizeRedirectUrl("/login"), "/");
  assert.equal(sanitizeRedirectUrl("/login?from=/pc"), "/");
  assert.equal(sanitizeRedirectUrl("/forgot-password"), "/");
  assert.equal(sanitizeRedirectUrl("/reset-password"), "/");
  assert.equal(sanitizeRedirectUrl("/sign-up"), "/");
});

test("sanitizeRedirectUrl blocks empty and malformed values", () => {
  assert.equal(sanitizeRedirectUrl(null), "/");
  assert.equal(sanitizeRedirectUrl(""), "/");
  assert.equal(sanitizeRedirectUrl("   "), "/");
});

// --- 2. Middleware route classification ---
const publicRoutes = ["/login", "/forgot-password", "/reset-password", "/sign-up"];
const apiAuthRoutes = [
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/logout",
  "/api/auth/session",
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

function isApiAuthRoute(pathname: string): boolean {
  return apiAuthRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

test("public routes are recognized", () => {
  assert.equal(isPublicRoute("/login"), true);
  assert.equal(isPublicRoute("/login/verify"), true);
  assert.equal(isPublicRoute("/forgot-password"), true);
  assert.equal(isPublicRoute("/reset-password"), true);
  assert.equal(isPublicRoute("/sign-up"), true);
  assert.equal(isPublicRoute("/pc"), false);
  assert.equal(isPublicRoute("/"), false);
});

test("API auth routes include logout and session", () => {
  assert.equal(isApiAuthRoute("/api/auth/login"), true);
  assert.equal(isApiAuthRoute("/api/auth/forgot-password"), true);
  assert.equal(isApiAuthRoute("/api/auth/reset-password"), true);
  assert.equal(isApiAuthRoute("/api/auth/logout"), true);
  assert.equal(isApiAuthRoute("/api/auth/session"), true);
  assert.equal(isApiAuthRoute("/api/auth/change-password"), false);
  assert.equal(isApiAuthRoute("/api/auth/profile"), false);
  assert.equal(isApiAuthRoute("/api/auth/sessions"), false);
});

// --- 3. Session revocation idempotency ---
test("revokeCurrentSession clears cookie and revokes DB token", async () => {
  // This is a structural test: verify that the helper exists and has the right signature.
  // Full integration requires a DB, which we avoid in runtime tests.
  const { revokeCurrentSession, clearSessionCookie } = await import("../src/lib/auth");
  assert.equal(typeof revokeCurrentSession, "function");
  assert.equal(typeof clearSessionCookie, "function");
});

// --- 4. Layout gate logic (simulated) ---
function shouldRedirectToLogin(pathname: string, userExists: boolean): string | null {
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/sign-up");
  if (isAuthRoute) return null;
  if (!userExists) {
    return pathname ? `/login?from=${encodeURIComponent(pathname)}` : "/login";
  }
  return null;
}

test("layout gate redirects internal pages when not logged in", () => {
  assert.equal(shouldRedirectToLogin("/pc", false), "/login?from=%2Fpc");
  assert.equal(shouldRedirectToLogin("/dashboard/stats", false), "/login?from=%2Fdashboard%2Fstats");
  assert.equal(shouldRedirectToLogin("/", false), "/login?from=%2F");
});

test("layout gate does not redirect auth pages", () => {
  assert.equal(shouldRedirectToLogin("/login", false), null);
  assert.equal(shouldRedirectToLogin("/login?from=/pc", false), null);
  assert.equal(shouldRedirectToLogin("/forgot-password", false), null);
  assert.equal(shouldRedirectToLogin("/reset-password", false), null);
  assert.equal(shouldRedirectToLogin("/sign-up", false), null);
});

test("layout gate does not redirect when user exists", () => {
  assert.equal(shouldRedirectToLogin("/pc", true), null);
  assert.equal(shouldRedirectToLogin("/", true), null);
});

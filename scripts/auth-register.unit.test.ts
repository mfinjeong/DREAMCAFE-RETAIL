import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { registerSchema } from "../src/lib/auth-register";
import { hashPassword, verifyPassword } from "../src/lib/auth";

function stripForbiddenFields(payload: Record<string, unknown>): Record<string, unknown> {
  const { role, isAdmin, ...rest } = payload as Record<string, unknown> & { role?: unknown; isAdmin?: unknown };
  return rest;
}

test("registerSchema accepts a valid payload", () => {
  const valid = {
    username: "kasir_baru",
    email: "kasir.baru@dreamcafe.id",
    fullName: "Kasir Baru",
    password: "Password123!",
  };
  const result = registerSchema.safeParse(valid);
  assert.ok(result.success, `Expected valid register to pass: ${result.error?.message}`);
});

test("registerSchema trims username, email, and fullName", () => {
  const valid = {
    username: "  trimmed_user  ",
    email: "  USER@example.com  ",
    fullName: "  Trimmed Name  ",
    password: "Password123!",
  };
  const result = registerSchema.safeParse(valid);
  assert.ok(result.success, `Expected trimmed register to pass: ${result.error?.message}`);
  assert.equal(result.data?.username, "trimmed_user");
  assert.equal(result.data?.email, "USER@example.com");
  assert.equal(result.data?.fullName, "Trimmed Name");
});

test("registerSchema rejects username shorter than 3 characters", () => {
  const invalid = {
    username: "ab",
    email: "user@example.com",
    fullName: "Valid Name",
    password: "Password123!",
  };
  const result = registerSchema.safeParse(invalid);
  assert.ok(!result.success);
  assert.match(result.error?.errors[0]?.message || "", /Username minimal 3 karakter/);
});

test("registerSchema rejects username with invalid characters", () => {
  const invalid = {
    username: "bad name!",
    email: "user@example.com",
    fullName: "Valid Name",
    password: "Password123!",
  };
  const result = registerSchema.safeParse(invalid);
  assert.ok(!result.success);
  assert.match(result.error?.errors[0]?.message || "", /huruf, angka, underscore, dan dash/);
});

test("registerSchema rejects username longer than 60 characters", () => {
  const invalid = {
    username: "a".repeat(61),
    email: "user@example.com",
    fullName: "Valid Name",
    password: "Password123!",
  };
  const result = registerSchema.safeParse(invalid);
  assert.ok(!result.success);
  assert.match(result.error?.errors[0]?.message || "", /Username maksimal 60 karakter/);
});

test("registerSchema rejects invalid email format", () => {
  const invalid = {
    username: "valid_user",
    email: "not-an-email",
    fullName: "Valid Name",
    password: "Password123!",
  };
  const result = registerSchema.safeParse(invalid);
  assert.ok(!result.success);
  assert.match(result.error?.errors[0]?.message || "", /Format email tidak valid/);
});

test("registerSchema rejects email longer than 255 characters", () => {
  const longLocal = "a".repeat(250);
  const invalid = {
    username: "valid_user",
    email: `${longLocal}@example.com`,
    fullName: "Valid Name",
    password: "Password123!",
  };
  const result = registerSchema.safeParse(invalid);
  assert.ok(!result.success);
});

test("registerSchema rejects fullName shorter than 2 characters", () => {
  const invalid = {
    username: "valid_user",
    email: "user@example.com",
    fullName: "A",
    password: "Password123!",
  };
  const result = registerSchema.safeParse(invalid);
  assert.ok(!result.success);
  assert.match(result.error?.errors[0]?.message || "", /Nama lengkap minimal 2 karakter/);
});

test("registerSchema rejects password shorter than 8 characters", () => {
  const invalid = {
    username: "valid_user",
    email: "user@example.com",
    fullName: "Valid Name",
    password: "Short1!",
  };
  const result = registerSchema.safeParse(invalid);
  assert.ok(!result.success);
  assert.match(result.error?.errors[0]?.message || "", /Password minimal 8 karakter/);
});

test("registerSchema rejects password longer than 128 characters", () => {
  const invalid = {
    username: "valid_user",
    email: "user@example.com",
    fullName: "Valid Name",
    password: "P".repeat(129),
  };
  const result = registerSchema.safeParse(invalid);
  assert.ok(!result.success);
  assert.match(result.error?.errors[0]?.message || "", /Password terlalu panjang/);
});

test("registerSchema ignores forged role field (admin attempt is dropped)", () => {
  const forged = {
    username: "sneaky_user",
    email: "sneaky@example.com",
    fullName: "Sneaky User",
    password: "Password123!",
    role: "ADMIN",
  };
  const stripped = stripForbiddenFields(forged);
  const result = registerSchema.safeParse(stripped);
  assert.ok(result.success, `Expected stripped payload to pass: ${result.error?.message}`);
  assert.equal((result.data as Record<string, unknown>).role, undefined);
});

test("registerSchema ignores forged isAdmin flag", () => {
  const forged = {
    username: "sneaky_user",
    email: "sneaky@example.com",
    fullName: "Sneaky User",
    password: "Password123!",
    isAdmin: true,
  };
  const stripped = stripForbiddenFields(forged);
  const result = registerSchema.safeParse(stripped);
  assert.ok(result.success);
  assert.equal((result.data as Record<string, unknown>).isAdmin, undefined);
});

test("registerSchema rejects missing email", () => {
  const invalid = {
    username: "valid_user",
    fullName: "Valid Name",
    password: "Password123!",
  };
  const result = registerSchema.safeParse(invalid);
  assert.ok(!result.success);
});

test("registerSchema rejects missing fullName", () => {
  const invalid = {
    username: "valid_user",
    email: "user@example.com",
    password: "Password123!",
  };
  const result = registerSchema.safeParse(invalid);
  assert.ok(!result.success);
});

test("registerSchema rejects missing username", () => {
  const invalid = {
    email: "user@example.com",
    fullName: "Valid Name",
    password: "Password123!",
  };
  const result = registerSchema.safeParse(invalid);
  assert.ok(!result.success);
});

test("registerSchema rejects missing password", () => {
  const invalid = {
    username: "valid_user",
    email: "user@example.com",
    fullName: "Valid Name",
  };
  const result = registerSchema.safeParse(invalid);
  assert.ok(!result.success);
});

test("hashPassword produces a bcrypt hash verifiable by verifyPassword", async () => {
  const password = `Pass_${randomBytes(8).toString("hex")}`;
  const hash = await hashPassword(password);
  assert.match(hash, /^\$2[aby]\$/);
  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("registerSchema accepts strong passwords of various shapes", () => {
  const passwords = ["Password123!", "longerPhrase#2024", "abc12345", "P@ssw0rd-xyz"];
  for (const password of passwords) {
    const valid = {
      username: "valid_user",
      email: "user@example.com",
      fullName: "Valid Name",
      password,
    };
    const result = registerSchema.safeParse(valid);
    assert.ok(result.success, `Expected password "${password}" to pass validation`);
  }
});

test("registerSchema rejects empty strings after trimming for required fields", () => {
  const invalid = {
    username: "   ",
    email: "   ",
    fullName: "   ",
    password: "Password123!",
  };
  const result = registerSchema.safeParse(invalid);
  assert.ok(!result.success);
});
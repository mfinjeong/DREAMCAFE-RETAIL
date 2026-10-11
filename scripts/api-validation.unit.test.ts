import test from "node:test";
import assert from "node:assert/strict";
import { productSchema, updateProductSchema } from "../src/lib/validators";
import { safeErrorMessage, classifyApiError, apiErrorStatus } from "../src/lib/auth";

test("productSchema accepts valid product data", () => {
  const valid = {
    name: "Kopi Arabika",
    categoryId: "cat-001",
    price: 25000,
    costPrice: 15000,
    stock: 100,
    minStockAlert: 10,
    unit: "cup",
    isActive: true,
  };
  const result = productSchema.safeParse(valid);
  assert.ok(result.success, `Expected valid product to pass: ${result.error?.message}`);
});

test("productSchema requires name (min 2 chars)", () => {
  const invalid = { name: "K", categoryId: "cat-001", price: 25000 };
  const result = productSchema.safeParse(invalid);
  assert.ok(!result.success);
  assert.match(result.error?.errors[0]?.message || "", /minimal 2 karakter/);
});

test("productSchema requires price (min 100)", () => {
  const invalid = { name: "Kopi", categoryId: "cat-001", price: 50 };
  const result = productSchema.safeParse(invalid);
  assert.ok(!result.success);
  assert.match(result.error?.errors[0]?.message || "", /minimal Rp100/);
});

test("productSchema requires categoryId", () => {
  const invalid = { name: "Kopi", price: 25000 };
  const result = productSchema.safeParse(invalid);
  assert.ok(!result.success);
});

test("productSchema rejects negative costPrice", () => {
  const invalid = { name: "Kopi", categoryId: "cat-001", price: 25000, costPrice: -5000 };
  const result = productSchema.safeParse(invalid);
  assert.ok(!result.success);
  assert.match(result.error?.errors[0]?.message || "", /tidak boleh negatif/);
});

test("productSchema rejects negative stock", () => {
  const invalid = { name: "Kopi", categoryId: "cat-001", price: 25000, stock: -10 };
  const result = productSchema.safeParse(invalid);
  assert.ok(!result.success);
  assert.match(result.error?.errors[0]?.message || "", /tidak boleh negatif/);
});

test("productSchema accepts optional fields with defaults", () => {
  const minimal = { name: "Kopi", categoryId: "cat-001", price: 25000 };
  const result = productSchema.safeParse(minimal);
  assert.ok(result.success, `Expected minimal product to pass: ${result.error?.message}`);
  assert.equal(result.data?.costPrice, 0);
  assert.equal(result.data?.stock, 0);
  assert.equal(result.data?.unit, "pcs");
  assert.equal(result.data?.isActive, true);
});

test("updateProductSchema allows partial updates", () => {
  const partial = { price: 30000, stock: 50 };
  const result = updateProductSchema.safeParse(partial);
  assert.ok(result.success, `Expected partial product to pass: ${result.error?.message}`);
  assert.equal(result.data?.price, 30000);
  assert.equal(result.data?.stock, 50);
});

test("productSchema rejects invalid imageUrl", () => {
  const invalid = { name: "Kopi", categoryId: "cat-001", price: 25000, imageUrl: "not-a-url" };
  const result = productSchema.safeParse(invalid);
  assert.ok(!result.success);
});

test("productSchema accepts valid imageUrl", () => {
  const valid = { name: "Kopi", categoryId: "cat-001", price: 25000, imageUrl: "https://example.com/image.png" };
  const result = productSchema.safeParse(valid);
  assert.ok(result.success, `Expected valid imageUrl to pass: ${result.error?.message}`);
});

test("safeErrorMessage returns fallback for AUTH_DB_ERROR", () => {
  const err = new Error("AUTH_DB_ERROR");
  const result = safeErrorMessage(err, "Fallback");
  assert.equal(result, "Fallback");
});

test("safeErrorMessage returns fallback for PrismaClientKnownRequestError", () => {
  class PrismaClientKnownRequestError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "PrismaClientKnownRequestError";
    }
  }
  const err = new PrismaClientKnownRequestError("Unique constraint failed");
  const result = safeErrorMessage(err, "Fallback");
  assert.equal(result, "Fallback");
});

test("safeErrorMessage returns fallback for message containing PrismaClient", () => {
  const err = new Error("PrismaClient validation error at field");
  const result = safeErrorMessage(err, "Fallback");
  assert.equal(result, "Fallback");
});

test("safeErrorMessage returns fallback for message containing Invalid `prisma.", () => {
  const err = new Error("Some text\nInvalid `prisma.user.findUnique()` call");
  const result = safeErrorMessage(err, "Fallback");
  assert.equal(result, "Fallback");
});

test("safeErrorMessage returns original message for business errors", () => {
  const err = new Error("Stok tidak mencukupi");
  const result = safeErrorMessage(err, "Fallback");
  assert.equal(result, "Stok tidak mencukupi");
});

test("safeErrorMessage returns fallback for non-Error values", () => {
  const result = safeErrorMessage("string error", "Fallback");
  assert.equal(result, "Fallback");
});

test("classifyApiError returns auth for UNAUTHENTICATED", () => {
  const err = new Error("UNAUTHENTICATED");
  assert.equal(classifyApiError(err), "auth");
});

test("classifyApiError returns auth for FORBIDDEN", () => {
  const err = new Error("FORBIDDEN");
  assert.equal(classifyApiError(err), "auth");
});

test("classifyApiError returns internal for AUTH_DB_ERROR", () => {
  const err = new Error("AUTH_DB_ERROR");
  assert.equal(classifyApiError(err), "internal");
});

test("classifyApiError returns internal for Prisma errors", () => {
  class PrismaClientKnownRequestError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "PrismaClientKnownRequestError";
    }
  }
  const err = new PrismaClientKnownRequestError("Unique constraint");
  assert.equal(classifyApiError(err), "internal");
});

test("classifyApiError returns business for domain errors", () => {
  const err = new Error("Stok tidak mencukupi");
  assert.equal(classifyApiError(err), "business");
});

test("apiErrorStatus returns 401 for UNAUTHENTICATED", () => {
  const err = new Error("UNAUTHENTICATED");
  assert.equal(apiErrorStatus(err), 401);
});

test("apiErrorStatus returns 403 for FORBIDDEN", () => {
  const err = new Error("FORBIDDEN");
  assert.equal(apiErrorStatus(err), 403);
});

test("apiErrorStatus returns 500 for AUTH_DB_ERROR", () => {
  const err = new Error("AUTH_DB_ERROR");
  assert.equal(apiErrorStatus(err), 500);
});

test("apiErrorStatus returns 500 for Prisma errors", () => {
  class PrismaClientKnownRequestError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "PrismaClientKnownRequestError";
    }
  }
  const err = new PrismaClientKnownRequestError("Unique constraint");
  assert.equal(apiErrorStatus(err), 500);
});

test("apiErrorStatus returns businessStatus for domain errors (default 400)", () => {
  const err = new Error("Stok tidak mencukupi");
  assert.equal(apiErrorStatus(err), 400);
});

test("apiErrorStatus returns custom businessStatus for domain errors", () => {
  const err = new Error("Konflik jadwal booking");
  assert.equal(apiErrorStatus(err, 409), 409);
});

test("classifyApiError returns internal for database connection errors", () => {
  const err = new Error("Can't reach database server at db.example:5432");
  assert.equal(classifyApiError(err), "internal");
});

test("apiErrorStatus returns 500 for database connection errors even with business status", () => {
  const err = new Error("Can't reach database server at db.example:5432");
  assert.equal(apiErrorStatus(err, 404), 500);
});

test("apiErrorStatus returns 500 for pool timeouts even with business status", () => {
  const err = new Error("timed out fetching a new connection from the pool");
  assert.equal(apiErrorStatus(err, 404), 500);
});

test("classifyApiError treats constructor names containing Prisma as internal", () => {
  class PrismaClientUnknownRequestError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "PrismaClientUnknownRequestError";
    }
  }
  const err = new PrismaClientUnknownRequestError("Unknown request failure");
  assert.equal(classifyApiError(err), "internal");
});

test("404 domain errors keep 404 while internal errors stay 500", () => {
  const notFound = new Error("Profil gaming tidak ditemukan");
  const internal = new Error("AUTH_DB_ERROR");
  assert.equal(apiErrorStatus(notFound, 404), 404);
  assert.equal(apiErrorStatus(internal, 404), 500);
});

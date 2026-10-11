import test from "node:test";
import assert from "node:assert/strict";
import { duplicateRegistrationResponse, registerSchema } from "../src/lib/auth-register";

function mockPrismaConflictError() {
  const err = new Error("Unique constraint failed on the fields: (`username`)");
  (err as any).code = "P2002";
  (err as any).constructor = { name: "PrismaClientKnownRequestError" };
  return err;
}

function mockOtherError() {
  return new Error("Internal DB failure");
}

test("duplicateRegistrationResponse returns 409 for P2002", async () => {
  const err = mockPrismaConflictError();
  const resp = duplicateRegistrationResponse(err);
  assert.ok(resp);
  const json = await resp.json();
  assert.equal(json.success, false);
  assert.match(json.message || "", /sudah digunakan/);
});

test("duplicateRegistrationResponse returns null for other errors", () => {
  const err = mockOtherError();
  const resp = duplicateRegistrationResponse(err);
  assert.equal(resp, null);
});

test("duplicateRegistrationResponse returns null for P2002 with wrong constructor name", () => {
  const err = new Error("Unique constraint failed");
  (err as any).code = "P2002";
  const resp = duplicateRegistrationResponse(err);
  assert.equal(resp, null);
});

test("duplicateRegistrationResponse returns null for non-Error values", () => {
  const resp = duplicateRegistrationResponse("string error");
  assert.equal(resp, null);
});

test("registerSchema still works in test context", () => {
  const valid = {
    username: "testuser",
    email: "test@example.com",
    fullName: "Test",
    password: "Password123!",
  };
  const result = registerSchema.safeParse(valid);
  assert.ok(result.success);
});
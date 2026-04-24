import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAdminNextPath } from "../lib/admin/navigation.ts";

test("sanitizeAdminNextPath defaults to /admin for missing values", () => {
  assert.equal(sanitizeAdminNextPath(null), "/admin");
});

test("sanitizeAdminNextPath keeps valid internal admin paths", () => {
  assert.equal(sanitizeAdminNextPath("/admin/vendors"), "/admin/vendors");
});

test("sanitizeAdminNextPath rejects protocol-relative redirects", () => {
  assert.equal(sanitizeAdminNextPath("//evil.example.com"), "/admin");
});

test("sanitizeAdminNextPath rejects absolute external redirects", () => {
  assert.equal(sanitizeAdminNextPath("https://evil.example.com"), "/admin");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdminHomePath,
  resolveAdminNextPath,
  sanitizeAdminNextPath,
} from "../lib/admin/navigation.ts";

test("getAdminHomePath returns the correct dashboard for admins", () => {
  assert.equal(getAdminHomePath("admin"), "/admin/dashboard");
});

test("getAdminHomePath returns the correct dashboard for agents", () => {
  assert.equal(getAdminHomePath("agent"), "/admin/agent");
});

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

test("resolveAdminNextPath defaults admins to /admin/dashboard", () => {
  assert.equal(resolveAdminNextPath("admin", null), "/admin/dashboard");
});

test("resolveAdminNextPath defaults agents to /admin/agent", () => {
  assert.equal(resolveAdminNextPath("agent", null), "/admin/agent");
});

test("resolveAdminNextPath redirects agents away from /admin", () => {
  assert.equal(resolveAdminNextPath("agent", "/admin"), "/admin/agent");
});

test("resolveAdminNextPath redirects agents away from /admin/dashboard", () => {
  assert.equal(resolveAdminNextPath("agent", "/admin/dashboard"), "/admin/agent");
});

test("resolveAdminNextPath redirects agents away from /admin/analytics", () => {
  assert.equal(resolveAdminNextPath("agent", "/admin/analytics"), "/admin/agent");
});

test("resolveAdminNextPath redirects agents away from /admin/team", () => {
  assert.equal(resolveAdminNextPath("agent", "/admin/team"), "/admin/agent");
});

test("resolveAdminNextPath redirects admins away from /admin/agent", () => {
  assert.equal(resolveAdminNextPath("admin", "/admin/agent"), "/admin/dashboard");
});

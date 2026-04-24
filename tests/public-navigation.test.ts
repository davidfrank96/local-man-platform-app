import assert from "node:assert/strict";
import test from "node:test";
import { sanitizePublicReturnPath } from "../lib/public/navigation.ts";

test("sanitizePublicReturnPath defaults to root for missing values", () => {
  assert.equal(sanitizePublicReturnPath(null), "/");
});

test("sanitizePublicReturnPath keeps valid internal public paths", () => {
  assert.equal(
    sanitizePublicReturnPath("/?q=rice&radius_km=30&selected=jabi-office-lunch-bowl"),
    "/?q=rice&radius_km=30&selected=jabi-office-lunch-bowl",
  );
});

test("sanitizePublicReturnPath rejects protocol-relative redirects", () => {
  assert.equal(sanitizePublicReturnPath("//evil.example.com"), "/");
});

test("sanitizePublicReturnPath rejects absolute external redirects", () => {
  assert.equal(sanitizePublicReturnPath("https://evil.example.com"), "/");
});

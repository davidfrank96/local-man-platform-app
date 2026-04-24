import assert from "node:assert/strict";
import test from "node:test";
import {
  getVendorSlugError,
  isValidVendorSlug,
  slugifyVendorName,
} from "../lib/admin/slug.ts";

test("slugifies vendor names into valid slugs", () => {
  assert.equal(slugifyVendorName("Jabi Office Lunch Bowl"), "jabi-office-lunch-bowl");
  assert.equal(slugifyVendorName("  Mama's Rice & Stew!  "), "mamas-rice-stew");
  assert.equal(slugifyVendorName("!!!"), "vendor");
});

test("validates vendor slugs with the shared slug pattern", () => {
  assert.equal(isValidVendorSlug("jabi-office-lunch-bowl"), true);
  assert.equal(isValidVendorSlug("Jabi Office Lunch Bowl"), false);
  assert.equal(isValidVendorSlug("vendor_slug"), false);
});

test("returns a clear slug validation error", () => {
  assert.equal(getVendorSlugError(""), "Slug is required.");
  assert.equal(
    getVendorSlugError("invalid slug"),
    "Use lowercase words separated by hyphens.",
  );
  assert.equal(getVendorSlugError("jabi-office-lunch-bowl"), null);
});

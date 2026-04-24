import assert from "node:assert/strict";
import test from "node:test";
import {
  formatVendorCardPriceBand,
  formatVendorCardRating,
} from "../lib/vendors/card-display.ts";

test("formats vendor card price bands with compact user-facing labels", () => {
  assert.equal(formatVendorCardPriceBand("budget"), "Budget-friendly");
  assert.equal(formatVendorCardPriceBand("standard"), "Everyday price");
  assert.equal(formatVendorCardPriceBand("premium"), "Higher price");
  assert.equal(formatVendorCardPriceBand(null), null);
});

test("formats vendor card ratings compactly", () => {
  assert.equal(formatVendorCardRating(4.24, 18), "★ 4.2");
  assert.equal(formatVendorCardRating(0, 0), "New");
});

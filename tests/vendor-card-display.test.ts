import assert from "node:assert/strict";
import test from "node:test";
import {
  formatVendorCardPriceBand,
  formatVendorCardRating,
  getVendorOpenStateDisplay,
  getVendorOpenStateDisplayFromSnapshot,
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

test("uses a single safe open-state display for cards and selected preview", () => {
  assert.deepEqual(getVendorOpenStateDisplay(true), {
    label: "Open",
    toneClassName: "vendor-card-status-open",
  });

  assert.deepEqual(getVendorOpenStateDisplay(false), {
    label: "Closed",
    toneClassName: "vendor-card-status-closed",
  });

  assert.deepEqual(getVendorOpenStateDisplay(undefined), {
    label: "Status unavailable",
    toneClassName: "vendor-card-status-unavailable",
  });
});

test("reconciles displayed active hours with a stale closed flag", () => {
  assert.deepEqual(
    getVendorOpenStateDisplayFromSnapshot({
      isOpenNow: false,
      todayHours: "10:00 AM - 7:00 PM",
      now: new Date("2026-05-07T13:04:00.000Z"),
    }),
    {
      label: "Open",
      toneClassName: "vendor-card-status-open",
    },
  );
});

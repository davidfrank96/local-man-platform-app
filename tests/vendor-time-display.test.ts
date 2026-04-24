import assert from "node:assert/strict";
import test from "node:test";
import {
  formatVendorDisplayTime,
  formatVendorHoursRange,
} from "../lib/vendors/time-display.ts";

test("formats vendor display times in 12-hour AM/PM format", () => {
  assert.equal(formatVendorDisplayTime("04:00"), "4:00 AM");
  assert.equal(formatVendorDisplayTime("07:00"), "7:00 AM");
  assert.equal(formatVendorDisplayTime("12:00"), "12:00 PM");
  assert.equal(formatVendorDisplayTime("13:30"), "1:30 PM");
  assert.equal(formatVendorDisplayTime("19:00"), "7:00 PM");
  assert.equal(formatVendorDisplayTime("00:00"), "12:00 AM");
});

test("formats vendor display times when seconds are present", () => {
  assert.equal(formatVendorDisplayTime("08:00:00"), "8:00 AM");
  assert.equal(formatVendorDisplayTime("18:15:00"), "6:15 PM");
});

test("formats overnight vendor hour ranges clearly", () => {
  assert.equal(formatVendorHoursRange("19:00", "02:00"), "7:00 PM - 2:00 AM");
});

test("returns the original time when it cannot be parsed", () => {
  assert.equal(formatVendorDisplayTime("invalid"), "invalid");
  assert.equal(formatVendorDisplayTime(null), "");
});

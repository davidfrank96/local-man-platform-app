import assert from "node:assert/strict";
import test from "node:test";
import {
  getVendorActiveHoursLabel,
  getVendorCurrentStatusDisplay,
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

test("keeps vendor card current status separate from active hours display", () => {
  assert.deepEqual(getVendorCurrentStatusDisplay(false), {
    label: "Closed",
    toneClassName: "vendor-card-status-closed",
  });
  assert.equal(getVendorActiveHoursLabel("10:00 AM - 7:00 PM"), "10:00 AM - 7:00 PM");
  assert.equal(getVendorActiveHoursLabel("Closed"), "Hours not listed");
  assert.equal(getVendorActiveHoursLabel("Closed today"), "Closed today");
  assert.equal(getVendorActiveHoursLabel(null), "Hours not listed");
});

test("reads active hours from supported vendor payload shapes", () => {
  const abujaThursday = new Date("2026-05-07T13:04:00.000Z");

  assert.equal(
    getVendorActiveHoursLabel({ open_time: "07:00", close_time: "20:00" }, abujaThursday),
    "7:00 AM - 8:00 PM",
  );
  assert.equal(
    getVendorActiveHoursLabel({ opening_time: "08:00", closing_time: "18:30" }, abujaThursday),
    "8:00 AM - 6:30 PM",
  );
  assert.equal(
    getVendorActiveHoursLabel({ active_hours: "9:00 AM - 5:00 PM" }, abujaThursday),
    "9:00 AM - 5:00 PM",
  );
  assert.equal(
    getVendorActiveHoursLabel({ operating_hours: "10:00 AM - 7:00 PM" }, abujaThursday),
    "10:00 AM - 7:00 PM",
  );
  assert.equal(
    getVendorActiveHoursLabel({ opening_hours: "11:00 AM - 8:00 PM" }, abujaThursday),
    "11:00 AM - 8:00 PM",
  );
  assert.equal(
    getVendorActiveHoursLabel({ business_hours: "12:00 PM - 9:00 PM" }, abujaThursday),
    "12:00 PM - 9:00 PM",
  );
  assert.equal(
    getVendorActiveHoursLabel({ hours: "1:00 PM - 10:00 PM" }, abujaThursday),
    "1:00 PM - 10:00 PM",
  );
  assert.equal(
    getVendorActiveHoursLabel({
      weekly_hours: [
        { day_of_week: 3, open_time: "06:00", close_time: "12:00" },
        { day_of_week: 4, open_time: "14:00", close_time: "22:00" },
      ],
    }, abujaThursday),
    "2:00 PM - 10:00 PM",
  );
  assert.equal(
    getVendorActiveHoursLabel({
      weekly_hours: [
        { day_of_week: 4, open_time: null, close_time: null, is_closed: true },
      ],
    }, abujaThursday),
    "Closed today",
  );
  assert.equal(
    getVendorActiveHoursLabel({
      vendor_hours: [
        { day_of_week: 4, open_time: "18:00", close_time: "02:00" },
      ],
    }, abujaThursday),
    "6:00 PM - 2:00 AM",
  );
  assert.equal(
    getVendorActiveHoursLabel({
      schedule: {
        thursday: {
          open_time: "07:30",
          close_time: "16:00",
        },
      },
    }, abujaThursday),
    "7:30 AM - 4:00 PM",
  );
  assert.equal(
    getVendorActiveHoursLabel({
      metadata: {
        hours: "3:00 PM - 11:00 PM",
      },
    }, abujaThursday),
    "3:00 PM - 11:00 PM",
  );
  assert.equal(
    getVendorActiveHoursLabel({
      metadata: {
        operating_hours: "4:00 PM - 12:00 AM",
      },
    }, abujaThursday),
    "4:00 PM - 12:00 AM",
  );
});

test("falls back from stale closed today-hours text to real schedule sources", () => {
  const abujaThursday = new Date("2026-05-07T13:04:00.000Z");

  assert.equal(
    getVendorActiveHoursLabel({
      is_open_now: false,
      today_hours: "Closed",
      active_hours: "6:00 AM - 2:00 PM",
    }, abujaThursday),
    "6:00 AM - 2:00 PM",
  );
  assert.equal(
    getVendorActiveHoursLabel({
      is_open_now: false,
      today_hours: "Closed",
      operating_hours: "7:00 AM - 8:00 PM",
    }, abujaThursday),
    "7:00 AM - 8:00 PM",
  );
  assert.deepEqual(getVendorCurrentStatusDisplay(false), {
    label: "Closed",
    toneClassName: "vendor-card-status-closed",
  });
});

test("can still reconcile retained snapshots that only have a visible hours range", () => {
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

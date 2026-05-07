import assert from "node:assert/strict";
import test from "node:test";
import {
  ABUJA_TIME_ZONE,
  getVendorAvailabilitySnapshot,
  resolveVendorOpenState,
  type VendorHourWindow,
} from "../lib/vendors/hours.ts";

const abujaAfternoon = new Date("2026-05-07T13:04:00Z");
const abujaAfterMidnight = new Date("2026-05-07T23:30:00Z");

test("uses Africa/Lagos for vendor availability calculations", () => {
  assert.equal(ABUJA_TIME_ZONE, "Africa/Lagos");
});

test("treats 2:04 PM Abuja time as open for a 10:00 AM - 7:00 PM schedule", () => {
  const hours: VendorHourWindow[] = [
    {
      day_of_week: 4,
      open_time: "10:00",
      close_time: "19:00",
      is_closed: false,
    },
  ];

  const snapshot = getVendorAvailabilitySnapshot(hours, null, abujaAfternoon);

  assert.equal(snapshot.isOpenNow, true);
  assert.equal(snapshot.todayHours, "10:00 AM - 7:00 PM");
});

test("treats 2:04 PM Abuja time as closed for a 5:00 PM - 9:00 PM schedule", () => {
  const hours: VendorHourWindow[] = [
    {
      day_of_week: 4,
      open_time: "17:00",
      close_time: "21:00",
      is_closed: false,
    },
  ];

  const snapshot = getVendorAvailabilitySnapshot(hours, null, abujaAfternoon);

  assert.equal(snapshot.isOpenNow, false);
  assert.equal(snapshot.todayHours, "5:00 PM - 9:00 PM");
});

test("treats a closed Abuja day as closed", () => {
  const hours: VendorHourWindow[] = [
    {
      day_of_week: 4,
      open_time: null,
      close_time: null,
      is_closed: true,
    },
  ];

  const snapshot = getVendorAvailabilitySnapshot(hours, null, abujaAfternoon);

  assert.equal(snapshot.isOpenNow, false);
  assert.equal(snapshot.todayHours, "Closed");
});

test("fails safely when hours are missing", () => {
  const snapshot = getVendorAvailabilitySnapshot([], null, abujaAfternoon);

  assert.equal(snapshot.isOpenNow, false);
  assert.equal(snapshot.todayHours, "Hours not listed");
  assert.equal(
    resolveVendorOpenState({
      isOpenNow: null,
      todayHours: "Hours not listed",
      now: abujaAfternoon,
    }),
    null,
  );
});

test("supports overnight hours from the public today-hours label", () => {
  assert.equal(
    resolveVendorOpenState({
      isOpenNow: false,
      todayHours: "6:00 PM - 2:00 AM",
      now: abujaAfterMidnight,
    }),
    true,
  );
});

test("prefers the displayed today-hours window over a stale closed boolean", () => {
  assert.equal(
    resolveVendorOpenState({
      isOpenNow: false,
      todayHours: "10:00 AM - 7:00 PM",
      now: abujaAfternoon,
    }),
    true,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  ABUJA_TIME_ZONE,
  getVendorActiveHoursSummary,
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

test("treats a closed Abuja day without configured times as closed today", () => {
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
  assert.equal(snapshot.todayHours, "Closed today");
  assert.equal(snapshot.activeHours, "Closed today");
});

test("keeps closed-today separate from other weekly operating ranges", () => {
  const hours: VendorHourWindow[] = [
    {
      day_of_week: 0,
      open_time: null,
      close_time: null,
      is_closed: true,
    },
    {
      day_of_week: 1,
      open_time: "07:00",
      close_time: "20:00",
      is_closed: false,
    },
    {
      day_of_week: 2,
      open_time: "07:00",
      close_time: "20:00",
      is_closed: false,
    },
  ];

  const snapshot = getVendorAvailabilitySnapshot(
    hours,
    null,
    new Date("2026-05-31T12:00:00Z"),
  );

  assert.equal(snapshot.isOpenNow, false);
  assert.equal(snapshot.todayHours, "Closed today");
  assert.equal(snapshot.activeHours, "Closed today");
  assert.equal(
    getVendorActiveHoursSummary(hours, new Date("2026-05-31T12:00:00Z")),
    "Closed today",
  );
});

test("keeps configured active hours visible when the schedule row is marked closed", () => {
  const hours: VendorHourWindow[] = [
    {
      day_of_week: 4,
      open_time: "07:00",
      close_time: "20:00",
      is_closed: true,
    },
  ];

  const snapshot = getVendorAvailabilitySnapshot(hours, null, abujaAfternoon);

  assert.equal(snapshot.isOpenNow, false);
  assert.equal(snapshot.todayHours, "7:00 AM - 8:00 PM");
  assert.equal(snapshot.activeHours, "7:00 AM - 8:00 PM");
});

test("fails safely when hours are missing", () => {
  const snapshot = getVendorAvailabilitySnapshot([], null, abujaAfternoon);

  assert.equal(snapshot.isOpenNow, false);
  assert.equal(snapshot.todayHours, "Hours not listed");
  assert.equal(snapshot.activeHours, "Hours not listed");
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

test("treats a closed-today public hours label as a closed status for stale snapshots", () => {
  assert.equal(
    resolveVendorOpenState({
      isOpenNow: true,
      todayHours: "Closed today",
      now: abujaAfternoon,
    }),
    false,
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

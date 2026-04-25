import assert from "node:assert/strict";
import test from "node:test";
import {
  getMillisecondsUntilNextPublicTimeTheme,
  getPublicTimeTheme,
} from "../lib/public/time-theme.ts";

function createLocalDate(hour: number, minute = 0, second = 0): Date {
  const date = new Date(2026, 3, 25, 0, 0, 0, 0);
  date.setHours(hour, minute, second, 0);
  return date;
}

test("selects the morning theme from 5:00 AM through 11:59 AM", () => {
  assert.equal(getPublicTimeTheme(createLocalDate(5, 0)), "morning");
  assert.equal(getPublicTimeTheme(createLocalDate(11, 59)), "morning");
});

test("selects the afternoon theme from 12:00 PM through 5:59 PM", () => {
  assert.equal(getPublicTimeTheme(createLocalDate(12, 0)), "afternoon");
  assert.equal(getPublicTimeTheme(createLocalDate(17, 59)), "afternoon");
});

test("selects the night theme from 6:00 PM through 4:59 AM", () => {
  assert.equal(getPublicTimeTheme(createLocalDate(18, 0)), "night");
  assert.equal(getPublicTimeTheme(createLocalDate(4, 59)), "night");
  assert.equal(getPublicTimeTheme(createLocalDate(0, 0)), "night");
});

test("returns the milliseconds until the next theme boundary", () => {
  assert.equal(
    getMillisecondsUntilNextPublicTimeTheme(createLocalDate(4, 59, 59)),
    1_000,
  );
  assert.equal(
    getMillisecondsUntilNextPublicTimeTheme(createLocalDate(11, 59, 30)),
    30_000,
  );
  assert.equal(
    getMillisecondsUntilNextPublicTimeTheme(createLocalDate(17, 30, 0)),
    30 * 60 * 1_000,
  );
  assert.equal(
    getMillisecondsUntilNextPublicTimeTheme(createLocalDate(23, 0, 0)),
    6 * 60 * 60 * 1_000,
  );
});

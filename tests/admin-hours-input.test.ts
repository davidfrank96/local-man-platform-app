import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAdminTimeInputTo24Hour,
  parseStoredTimeForAdmin,
} from "../lib/admin/hours-input.ts";

test("parses natural 12-hour admin input into 24-hour storage time", () => {
  assert.equal(
    parseAdminTimeInputTo24Hour("4 AM"),
    "04:00",
  );
  assert.equal(
    parseAdminTimeInputTo24Hour("12 AM"),
    "00:00",
  );
  assert.equal(
    parseAdminTimeInputTo24Hour("12 PM"),
    "12:00",
  );
  assert.equal(
    parseAdminTimeInputTo24Hour("7:30 PM"),
    "19:30",
  );
  assert.equal(parseAdminTimeInputTo24Hour("9AM"), "09:00");
  assert.equal(parseAdminTimeInputTo24Hour("9:00 AM"), "09:00");
  assert.equal(parseAdminTimeInputTo24Hour("8 pm"), "20:00");
});

test("returns null when admin time input is empty", () => {
  assert.equal(parseAdminTimeInputTo24Hour(""), null);
});

test("rejects invalid admin time input", () => {
  assert.throws(
    () => parseAdminTimeInputTo24Hour("7"),
    /Use format like 9 AM or 8:30 PM/,
  );
  assert.throws(
    () => parseAdminTimeInputTo24Hour("13 PM"),
    /Use format like 9 AM or 8:30 PM/,
  );
  assert.throws(
    () => parseAdminTimeInputTo24Hour("7:61 PM"),
    /Use format like 9 AM or 8:30 PM/,
  );
});

test("parses stored 24-hour time for 12-hour admin defaults", () => {
  assert.equal(parseStoredTimeForAdmin("00:00"), "12:00 AM");
  assert.equal(parseStoredTimeForAdmin("12:15"), "12:15 PM");
  assert.equal(parseStoredTimeForAdmin("19:45:00"), "7:45 PM");
});

test("supports overnight schedules through unchanged 24-hour conversion", () => {
  assert.equal(parseAdminTimeInputTo24Hour("7 PM"), "19:00");
  assert.equal(parseAdminTimeInputTo24Hour("2 AM"), "02:00");
});

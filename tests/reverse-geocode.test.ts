import assert from "node:assert/strict";
import test from "node:test";
import { formatReverseGeocodeLabel } from "../lib/location/reverse-geocode.ts";

test("formats suburb and city into a compact area label", () => {
  assert.equal(
    formatReverseGeocodeLabel({
      suburb: "Wuse II",
      city: "Abuja",
      country: "Nigeria",
    }),
    "Wuse II, Abuja",
  );
});

test("falls back to broader city and country when no finer area exists", () => {
  assert.equal(
    formatReverseGeocodeLabel({
      city: "Abuja",
      country: "Nigeria",
    }),
    "Abuja, Nigeria",
  );
});

test("returns null when no useful address parts exist", () => {
  assert.equal(formatReverseGeocodeLabel({}), null);
});


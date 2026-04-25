import assert from "node:assert/strict";
import test from "node:test";
import {
  formatLocationAccuracyLabel,
  formatLocationCoordinates,
} from "../lib/location/display.ts";

test("formats precise coordinates to five decimals for UI trust copy", () => {
  assert.equal(formatLocationCoordinates({ lat: 9.0765, lng: 7.3986 }), "9.07650, 7.39860");
});

test("supports coordinate rounding without exposing excessive precision", () => {
  assert.equal(
    formatLocationCoordinates({ lat: 9.07654321, lng: 7.39861234 }),
    "9.07654, 7.39861",
  );
});

test("shows a high-accuracy trust label only for precise browser location", () => {
  assert.equal(formatLocationAccuracyLabel("precise"), "High accuracy");
  assert.equal(
    formatLocationAccuracyLabel("approximate"),
    "Turn on location for exact nearby results",
  );
  assert.equal(formatLocationAccuracyLabel("default_city"), null);
  assert.equal(formatLocationAccuracyLabel(null), null);
});

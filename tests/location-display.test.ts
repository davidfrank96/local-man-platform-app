import assert from "node:assert/strict";
import test from "node:test";
import { formatLocationCoordinates } from "../lib/location/display.ts";

test("formats precise coordinates to five decimals for UI trust copy", () => {
  assert.equal(formatLocationCoordinates({ lat: 9.0765, lng: 7.3986 }), "9.07650, 7.39860");
});

test("supports coordinate rounding without exposing excessive precision", () => {
  assert.equal(
    formatLocationCoordinates({ lat: 9.07654321, lng: 7.39861234 }),
    "9.07654, 7.39861",
  );
});


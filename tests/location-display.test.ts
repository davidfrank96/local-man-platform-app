import assert from "node:assert/strict";
import test from "node:test";
import {
  formatApproximateLocationLabel,
  formatLocationAccuracyLabel,
  formatLocationCoordinates,
  getPublicLocationDisplayModel,
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

test("formats approximate location labels conservatively", () => {
  assert.equal(formatApproximateLocationLabel("Wuse II, Abuja"), "Near Wuse II, Abuja");
});

test("shows precise location details only when browser geolocation succeeds", () => {
  assert.deepEqual(
    getPublicLocationDisplayModel({
      status: "precise",
      location: {
        source: "precise",
        label: "Current location",
        coordinates: { lat: 9.0765, lng: 7.3986 },
        isApproximate: false,
        errors: [],
      },
      resolvedLocationLabel: "Wuse II, Abuja",
    }),
    {
      headline: "Using your current location",
      detail: "Wuse II, Abuja",
      trustLine: "High accuracy",
    },
  );
});

test("falls back to coordinates for precise location when reverse lookup fails", () => {
  assert.deepEqual(
    getPublicLocationDisplayModel({
      status: "precise",
      location: {
        source: "precise",
        label: "Current location",
        coordinates: { lat: 9.0765, lng: 7.3986 },
        isApproximate: false,
        errors: [],
      },
      resolvedLocationLabel: null,
    }),
    {
      headline: "Using your current location",
      detail: "9.07650, 7.39860",
      trustLine: "High accuracy",
    },
  );
});

test("shows approximate location only when a usable human-readable label exists", () => {
  assert.deepEqual(
    getPublicLocationDisplayModel({
      status: "approximate",
      location: {
        source: "approximate",
        label: "Approximate location",
        coordinates: { lat: 9.08, lng: 7.4 },
        isApproximate: true,
        errors: [],
      },
      resolvedLocationLabel: "Wuse, Abuja",
    }),
    {
      headline: "Using approximate location",
      detail: "Near Wuse, Abuja",
      trustLine: "Turn on location for exact nearby results",
    },
  );
});

test("keeps default and denied fallback copy neutral", () => {
  assert.deepEqual(
    getPublicLocationDisplayModel({
      status: "denied",
      location: null,
      resolvedLocationLabel: null,
    }),
    {
      headline: "Showing nearby vendors",
      detail: "Turn on location for more accurate nearby vendors.",
      trustLine: null,
    },
  );

  assert.deepEqual(
    getPublicLocationDisplayModel({
      status: "default_city",
      location: null,
      resolvedLocationLabel: null,
    }),
    {
      headline: "Showing nearby vendors",
      detail: "Turn on location for more accurate nearby vendors.",
      trustLine: null,
    },
  );
});

test("does not expose low-confidence approximate location without a label", () => {
  assert.deepEqual(
    getPublicLocationDisplayModel({
      status: "approximate",
      location: {
        source: "approximate",
        label: "Approximate location",
        coordinates: { lat: 9.08, lng: 7.4 },
        isApproximate: true,
        errors: [],
      },
      resolvedLocationLabel: null,
    }),
    {
      headline: "Showing nearby vendors",
      detail: "Turn on location for more accurate nearby vendors.",
      trustLine: null,
    },
  );
});

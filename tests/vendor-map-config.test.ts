import assert from "node:assert/strict";
import test from "node:test";
import {
  getPublicMapStyleUrl,
  MAP_FALLBACK_NOTICE,
} from "../components/public/vendor-map-config.ts";

test("missing public map style url resolves to empty string", () => {
  assert.equal(getPublicMapStyleUrl(""), "");
  assert.equal(getPublicMapStyleUrl("   "), "");
  assert.equal(getPublicMapStyleUrl(undefined), "");
});

test("public map style url is trimmed", () => {
  assert.equal(
    getPublicMapStyleUrl(" https://maps.example.com/style.json "),
    "https://maps.example.com/style.json",
  );
});

test("fallback notice keeps map failure copy calm", () => {
  assert.equal(
    MAP_FALLBACK_NOTICE,
    "Map view limited, vendors still available below.",
  );
});

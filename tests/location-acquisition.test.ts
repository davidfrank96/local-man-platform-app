import assert from "node:assert/strict";
import test from "node:test";
import { acquireUserLocation } from "../lib/location/acquisition.ts";

test("uses browser geolocation first when available", async () => {
  const location = await acquireUserLocation({
    browserGeolocation: async () => ({
      lat: 9.1,
      lng: 7.4,
    }),
    ipApproximation: async () => {
      throw new Error("IP lookup should not run after precise location.");
    },
  });

  assert.equal(location.source, "precise");
  assert.equal(location.isApproximate, false);
  assert.deepEqual(location.coordinates, {
    lat: 9.1,
    lng: 7.4,
  });
  assert.deepEqual(location.errors, []);
});

test("falls back to IP approximation when browser geolocation fails", async () => {
  const location = await acquireUserLocation({
    browserGeolocation: async () => {
      throw {
        code: 1,
        message: "User denied geolocation.",
      };
    },
    ipApproximation: async () => ({
      lat: 9.08,
      lng: 7.39,
    }),
  });

  assert.equal(location.source, "approximate");
  assert.equal(location.isApproximate, true);
  assert.deepEqual(location.coordinates, {
    lat: 9.08,
    lng: 7.39,
  });
  assert.equal(location.errors[0]?.code, "GEOLOCATION_DENIED");
});

test("falls back to Abuja when precise and approximate locations fail", async () => {
  const location = await acquireUserLocation({
    browserGeolocation: async () => {
      throw {
        code: 2,
        message: "Geolocation unavailable.",
      };
    },
    ipApproximation: async () => null,
  });

  assert.equal(location.source, "default_city");
  assert.equal(location.label, "Abuja");
  assert.equal(location.isApproximate, true);
  assert.deepEqual(location.coordinates, {
    lat: 9.0765,
    lng: 7.3986,
  });
  assert.equal(location.errors[0]?.code, "GEOLOCATION_UNAVAILABLE");
  assert.equal(location.errors[1]?.code, "IP_LOOKUP_UNAVAILABLE");
});

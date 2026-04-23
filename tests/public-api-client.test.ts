import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchNearbyVendors,
  getDirectionsUrl,
  getPhoneHref,
} from "../lib/vendors/public-api-client.ts";

test("public API client builds nearby vendor query params", async () => {
  const requestedUrls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    requestedUrls.push(String(input));

    return Response.json({
      success: true,
      data: {
        location: {
          source: "precise",
          label: "Current location",
          coordinates: {
            lat: 9.0813,
            lng: 7.4694,
          },
          isApproximate: false,
        },
        vendors: [],
      },
      error: null,
    });
  }) as typeof fetch;

  await fetchNearbyVendors(
    {
      lat: 9.0813,
      lng: 7.4694,
      location_source: "precise",
      radius_km: 5,
      open_now: true,
      category: "rice",
      price_band: "budget",
      search: "jollof",
    },
    fetchImpl,
  );
  const url = new URL(requestedUrls[0], "http://localhost");

  assert.equal(url.pathname, "/api/vendors/nearby");
  assert.equal(url.searchParams.get("lat"), "9.0813");
  assert.equal(url.searchParams.get("lng"), "7.4694");
  assert.equal(url.searchParams.get("location_source"), "precise");
  assert.equal(url.searchParams.get("radius_km"), "5");
  assert.equal(url.searchParams.get("open_now"), "true");
  assert.equal(url.searchParams.get("category"), "rice");
  assert.equal(url.searchParams.get("price_band"), "budget");
  assert.equal(url.searchParams.get("search"), "jollof");
});

test("public API client creates call and directions links", () => {
  assert.equal(getPhoneHref("+234 800 000 0000"), "tel:+2348000000000");
  assert.equal(getPhoneHref(null), null);

  const directionsUrl = new URL(getDirectionsUrl(9.0813, 7.4694));

  assert.equal(directionsUrl.origin, "https://www.google.com");
  assert.equal(directionsUrl.searchParams.get("api"), "1");
  assert.equal(directionsUrl.searchParams.get("destination"), "9.0813,7.4694");
});

test("public API client reports non-json failures clearly", async () => {
  const fetchImpl = (async () =>
    new Response("Service unavailable", {
      status: 503,
    })) as typeof fetch;

  await assert.rejects(
    () => fetchNearbyVendors({}, fetchImpl),
    /HTTP_ERROR: API request failed with status 503/,
  );
});

test("public API client reports malformed API responses clearly", async () => {
  const fetchImpl = (async () =>
    Response.json({
      data: null,
    })) as typeof fetch;

  await assert.rejects(
    () => fetchNearbyVendors({}, fetchImpl),
    /INVALID_RESPONSE: API returned an unexpected response shape/,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  createVendorRiderContactHandoff,
  fetchNearbyVendors,
  fetchVendorRiderSuggestions,
  getDirectionsUrl,
  getPhoneHref,
  reportVendorRiderUnavailable,
  sanitizePublicSearchInput,
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

test("public API client sanitizes and encodes special-character search input safely", async () => {
  const requestedUrls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    requestedUrls.push(String(input));

    return Response.json({
      success: true,
      data: {
        location: {
          source: "default_city",
          label: "Abuja",
          coordinates: {
            lat: 9.0765,
            lng: 7.3986,
          },
          isApproximate: true,
        },
        vendors: [],
      },
      error: null,
    });
  }) as typeof fetch;

  await fetchNearbyVendors(
    {
      search: "   ' OR 1=1--   ",
    },
    fetchImpl,
  );

  assert.match(requestedUrls[0] ?? "", /search=%27%20OR%201%3D1--/);
  const url = new URL(requestedUrls[0] ?? "", "http://localhost");
  assert.equal(url.searchParams.get("search"), "' OR 1=1--");
});

test("public API client trims and caps search input length", () => {
  assert.equal(sanitizePublicSearchInput("   jollof rice   "), "jollof rice");
  assert.equal(sanitizePublicSearchInput(""), "");
  assert.equal(sanitizePublicSearchInput(null), "");
  assert.equal(sanitizePublicSearchInput("x".repeat(120)).length, 100);
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

test("public API client returns empty nearby results when a search request fails", async () => {
  const fetchImpl = (async () =>
    new Response("Service unavailable", {
      status: 503,
    })) as typeof fetch;

  const result = await fetchNearbyVendors(
    {
      search: "' OR 1=1--",
    },
    fetchImpl,
  );

  assert.deepEqual(result, {
    location: {
      source: "default_city",
      label: "Abuja",
      coordinates: {
        lat: 9.0765,
        lng: 7.3986,
      },
      isApproximate: true,
    },
    vendors: [],
  });
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

test("public API client requests vendor rider suggestions by slug", async () => {
  const requestedUrls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    requestedUrls.push(String(input));

    return Response.json({
      success: true,
      data: {
        vendor_slug: "jabi-office-lunch-bowl",
        riders: [],
      },
      error: null,
    });
  }) as typeof fetch;

  const result = await fetchVendorRiderSuggestions("jabi-office-lunch-bowl", fetchImpl);

  assert.equal(requestedUrls[0], "/api/vendors/jabi-office-lunch-bowl/riders");
  assert.deepEqual(result, {
    vendor_slug: "jabi-office-lunch-bowl",
    riders: [],
  });
});

test("public API client posts rider contact handoff payloads", async () => {
  const requests: Array<{ url: string; body: unknown }> = [];
  const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
    requests.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? "{}")),
    });

    return Response.json({
      success: true,
      data: {
        intent_id: "22222222-2222-4222-8222-222222222222",
        whatsapp_url: "https://wa.me/2348000000000?text=hello",
        rider: {
          rider_id: "11111111-1111-4111-8111-111111111111",
          display_name: "Amina Rider",
          photo_url: null,
          vehicle_type: "Motorcycle",
          operating_areas: ["Jabi"],
          usual_availability_label: "Usually available afternoons",
        },
      },
      error: null,
    });
  }) as typeof fetch;

  const result = await createVendorRiderContactHandoff(
    "jabi-office-lunch-bowl",
    {
      riderId: "11111111-1111-4111-8111-111111111111",
      customerName: "Ada",
      customerPhone: "+2348123456789",
      deliveryLocationMode: "manual_address",
      deliveryAddress: "25 Ademola Adetokunbo Crescent",
      deliveryArea: "Wuse 2",
      orderNote: "Two plates of jollof rice.",
      paymentNoteType: "already_paid_vendor",
      disclaimerAccepted: true,
    },
    fetchImpl,
  );

  assert.equal(requests[0].url, "/api/vendors/jabi-office-lunch-bowl/riders/contact");
  assert.deepEqual(requests[0].body, {
    riderId: "11111111-1111-4111-8111-111111111111",
    customerName: "Ada",
    customerPhone: "+2348123456789",
    deliveryLocationMode: "manual_address",
    deliveryAddress: "25 Ademola Adetokunbo Crescent",
    deliveryArea: "Wuse 2",
    orderNote: "Two plates of jollof rice.",
    paymentNoteType: "already_paid_vendor",
    disclaimerAccepted: true,
  });
  assert.equal(result.rider.display_name, "Amina Rider");
});

test("public API client posts rider unavailable reports", async () => {
  const requests: Array<{ url: string; body: unknown }> = [];
  const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
    requests.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? "{}")),
    });

    return Response.json({
      success: true,
      data: {
        received: true,
        report_id: "33333333-3333-4333-8333-333333333333",
        message: "Thanks. Localman saved this rider availability report for admin review.",
      },
      error: null,
    });
  }) as typeof fetch;

  const result = await reportVendorRiderUnavailable(
    "jabi-office-lunch-bowl",
    {
      riderId: "11111111-1111-4111-8111-111111111111",
      reason: "no_response",
      reporterPhone: "+2348123456789",
    },
    fetchImpl,
  );

  assert.equal(
    requests[0].url,
    "/api/vendors/jabi-office-lunch-bowl/riders/report-unavailable",
  );
  assert.deepEqual(requests[0].body, {
    riderId: "11111111-1111-4111-8111-111111111111",
    reason: "no_response",
    reporterPhone: "+2348123456789",
  });
  assert.equal(result.received, true);
});

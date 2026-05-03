import assert from "node:assert/strict";
import test from "node:test";
import { fetchNearbyVendorCandidates } from "../lib/vendors/supabase.ts";

const timestamp = "2026-04-22T00:00:00+00:00";

const config = {
  url: "https://example.supabase.co",
  anonKey: "anon-key",
};

function createCandidateVendor(index: number, overrides?: Partial<Record<string, unknown>>) {
  return {
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name: `Vendor ${index + 1}`,
    slug: `vendor-${index + 1}`,
    short_description: "Test vendor",
    phone_number: null,
    area: "Wuse",
    latitude: 9.0765,
    longitude: 7.3986 + index * 0.001,
    price_band: "budget",
    average_rating: 4.2,
    review_count: 3,
    is_open_override: true,
    vendor_hours: [],
    vendor_featured_dishes: [],
    created_at: timestamp,
    ...overrides,
  };
}

test("nearby candidate query pushes category, price, and search filters into Supabase", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    assert.equal(url.pathname, "/rest/v1/vendors");
    assert.match(url.searchParams.get("select") ?? "", /vendor_category_map!inner/);
    assert.equal(url.searchParams.get("vendor_category_map.vendor_categories.slug"), "eq.rice");
    assert.equal(url.searchParams.get("price_band"), "eq.budget");
    assert.match(url.searchParams.get("or") ?? "", /name\.ilike/);
    assert.equal(url.searchParams.get("is_active"), "eq.true");

    return Response.json([
      createCandidateVendor(0, {
        name: "Rice Corner",
        slug: "rice-corner",
        vendor_category_map: [
          {
            vendor_categories: {
              slug: "rice",
            },
          },
        ],
      }),
    ]);
  }) as typeof fetch;

  try {
    const results = await fetchNearbyVendorCandidates(
      {
        lat: 9.0765,
        lng: 7.3986,
        location_source: "default_city",
        radius_km: 10,
        category: "rice",
        price_band: "budget",
        search: "rice",
      },
      config,
    );

    assert.equal(results.length, 1);
    assert.equal(results[0]?.slug, "rice-corner");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("nearby candidate query keeps the lighter select when no category filter is present", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    assert.equal(url.pathname, "/rest/v1/vendors");
    assert.doesNotMatch(url.searchParams.get("select") ?? "", /!inner/);
    assert.equal(url.searchParams.get("vendor_category_map.vendor_categories.slug"), null);

    return Response.json([createCandidateVendor(0)]);
  }) as typeof fetch;

  try {
    const results = await fetchNearbyVendorCandidates(
      {
        lat: 9.0765,
        lng: 7.3986,
        location_source: "default_city",
        radius_km: 10,
      },
      config,
    );

    assert.equal(results.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { GET as nearbyRoute } from "../app/api/vendors/nearby/route.ts";
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

function setPublicEnv(): () => void {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

  return () => {
    if (previousUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }

    if (previousAnonKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnonKey;
    }
  };
}

function createNearbyNextRequest(url: string): Parameters<typeof nearbyRoute>[0] {
  const request = new Request(url) as Request & { nextUrl: URL };
  request.nextUrl = new URL(url);

  return request as unknown as Parameters<typeof nearbyRoute>[0];
}

function toUrl(input: URL | RequestInfo): URL {
  if (input instanceof URL) {
    return input;
  }

  if (input instanceof Request) {
    return new URL(input.url);
  }

  return new URL(String(input));
}

test("nearby candidate query pushes category, price, and search filters into Supabase", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = toUrl(input);

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
    const url = toUrl(input);

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

test("nearby route sanitizes injection-like search input and does not use the raw payload", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = toUrl(input);

    if (url.pathname === "/rest/v1/vendors") {
      const orFilter = url.searchParams.get("or") ?? "";

      assert.match(orFilter, /name\.ilike/);
      assert.match(orFilter, /\*OR 11--\*/);
      assert.doesNotMatch(orFilter, /'|=/);

      return Response.json([createCandidateVendor(0)]);
    }

    return Response.json([]);
  }) as typeof fetch;

  try {
    const response = await nearbyRoute(
      createNearbyNextRequest(
        "http://localhost/api/vendors/nearby?search=%20'%20OR%201%3D1--%20",
      ),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.vendors.length <= 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

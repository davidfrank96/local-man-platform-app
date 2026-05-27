import assert from "node:assert/strict";
import test from "node:test";
import { GET as nearbyRoute } from "../app/api/vendors/nearby/route.ts";
import {
  PUBLIC_NEARBY_SEARCH_RATE_LIMIT,
  resetAbuseProtectionStateForTests,
} from "../lib/api/abuse-protection.ts";
import {
  fetchNearbyVendorCandidates,
  PUBLIC_NEARBY_VENDOR_REVALIDATE_SECONDS,
} from "../lib/vendors/supabase.ts";

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
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

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

    if (previousServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
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

test.beforeEach(() => {
  resetAbuseProtectionStateForTests();
});

test("nearby candidate query pushes bounding category and price filters into Supabase", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = toUrl(input);
    const requestInit = init as RequestInit & {
      next?: {
        revalidate?: number;
      };
    };

    assert.equal(url.pathname, "/rest/v1/vendors");
    assert.match(url.searchParams.get("select") ?? "", /vendor_category_map!inner/);
    assert.match(url.searchParams.get("select") ?? "", /vendor_categories!inner\(slug,name\)/);
    assert.equal(url.searchParams.get("vendor_category_map.vendor_categories.slug"), "eq.rice");
    assert.equal(url.searchParams.get("price_band"), "eq.budget");
    assert.equal(url.searchParams.get("or"), null);
    assert.equal(url.searchParams.get("is_active"), "eq.true");
    assert.equal(
      requestInit.next?.revalidate,
      PUBLIC_NEARBY_VENDOR_REVALIDATE_SECONDS,
    );

    return Response.json([
      createCandidateVendor(0, {
        name: "Rice Corner",
        slug: "rice-corner",
        vendor_category_map: [
          {
            vendor_categories: {
              slug: "rice",
              name: "Rice",
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

test("nearby candidate query keeps category summaries available for app-side search", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = toUrl(input);
    const requestInit = init as RequestInit & {
      next?: {
        revalidate?: number;
      };
    };

    assert.equal(url.pathname, "/rest/v1/vendors");
    assert.doesNotMatch(url.searchParams.get("select") ?? "", /!inner/);
    assert.match(url.searchParams.get("select") ?? "", /vendor_category_map\(vendor_categories\(slug,name\)\)/);
    assert.equal(url.searchParams.get("vendor_category_map.vendor_categories.slug"), null);
    assert.ok(
      (requestInit.next?.revalidate ?? Number.POSITIVE_INFINITY) <=
        PUBLIC_NEARBY_VENDOR_REVALIDATE_SECONDS,
    );

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
      assert.equal(url.searchParams.get("or"), null);
      assert.equal(url.searchParams.get("search"), null);

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
    assert.deepEqual(body.data.vendors, []);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("nearby route searches featured dishes and categories with strong matches first", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = toUrl(input);

    if (url.pathname === "/rest/v1/vendors") {
      assert.equal(url.searchParams.get("or"), null);

      return Response.json([
        createCandidateVendor(0, {
          id: "weak-description",
          name: "Everyday Food",
          slug: "everyday-food",
          short_description: "Sometimes serves suya by request.",
          longitude: 7.3986 + 0.001,
        }),
        createCandidateVendor(1, {
          id: "dish-match",
          name: "Evening Grill",
          slug: "evening-grill",
          short_description: "Chicken and chips.",
          longitude: 7.3986 + 0.002,
          vendor_featured_dishes: [
            {
              dish_name: "Beef suya",
              description: "Peppered skewers",
              is_featured: true,
            },
          ],
        }),
        createCandidateVendor(2, {
          id: "category-match",
          name: "Neighborhood Kitchen",
          slug: "neighborhood-kitchen",
          short_description: "Daily meals.",
          longitude: 7.3986 + 0.003,
          vendor_category_map: [
            {
              vendor_categories: {
                slug: "suya",
                name: "Suya",
              },
            },
          ],
        }),
      ]);
    }

    if (url.pathname === "/rest/v1/rpc/get_vendor_usage_scores") {
      return Response.json([]);
    }

    return Response.json([]);
  }) as typeof fetch;

  try {
    const response = await nearbyRoute(
      createNearbyNextRequest(
        "http://localhost/api/vendors/nearby?lat=9.0765&lng=7.3986&location_source=precise&radius_km=30&search=suya",
      ),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(
      body.data.vendors.map((vendor: { slug: string }) => vendor.slug),
      ["neighborhood-kitchen", "evening-grill", "everyday-food"],
    );
    assert.deepEqual(body.data.vendors[0].categories, [
      { name: "Suya", slug: "suya" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("nearby route keeps open matching vendors ahead of closed stronger text matches", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = toUrl(input);

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([
        createCandidateVendor(0, {
          id: "closed-category-match",
          name: "Jabi Rice Corner",
          slug: "jabi-rice-corner",
          longitude: 7.3986 + 0.002,
          is_open_override: false,
          vendor_featured_dishes: [
            {
              dish_name: "Fried rice and chicken",
              description: null,
              is_featured: true,
            },
          ],
          vendor_category_map: [
            {
              vendor_categories: {
                slug: "rice",
                name: "Rice",
              },
            },
          ],
        }),
        createCandidateVendor(1, {
          id: "open-dish-match",
          name: "Ayobami Jesus",
          slug: "pepper-soup-rice",
          longitude: 7.3986 + 0.086,
          is_open_override: true,
          vendor_featured_dishes: [
            {
              dish_name: "Pepper soup rice",
              description: null,
              is_featured: true,
            },
          ],
        }),
      ]);
    }

    if (url.pathname === "/rest/v1/rpc/get_vendor_usage_scores") {
      return Response.json([]);
    }

    return Response.json([]);
  }) as typeof fetch;

  try {
    const response = await nearbyRoute(
      createNearbyNextRequest(
        "http://localhost/api/vendors/nearby?lat=9.0765&lng=7.3986&location_source=precise&radius_km=30&search=rice",
      ),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(
      body.data.vendors.map((vendor: { slug: string }) => vendor.slug),
      ["pepper-soup-rice", "jabi-rice-corner"],
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("nearby route keeps closer open matches ahead of farther stronger text matches", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = toUrl(input);

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([
        createCandidateVendor(0, {
          id: "far-strong-match",
          name: "Rice Palace",
          slug: "rice-palace",
          longitude: 7.3986 + 0.06,
          is_open_override: true,
          vendor_featured_dishes: [
            {
              dish_name: "Jollof rice",
              description: null,
              is_featured: true,
            },
          ],
        }),
        createCandidateVendor(1, {
          id: "near-weak-match",
          name: "Everyday Food",
          slug: "everyday-food",
          area: "Rice district",
          longitude: 7.3986 + 0.004,
          is_open_override: true,
        }),
      ]);
    }

    if (url.pathname === "/rest/v1/rpc/get_vendor_usage_scores") {
      return Response.json([]);
    }

    return Response.json([]);
  }) as typeof fetch;

  try {
    const response = await nearbyRoute(
      createNearbyNextRequest(
        "http://localhost/api/vendors/nearby?lat=9.0765&lng=7.3986&location_source=precise&radius_km=30&search=rice",
      ),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(
      body.data.vendors.map((vendor: { slug: string }) => vendor.slug),
      ["everyday-food", "rice-palace"],
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("nearby route ranks open vendors by distance with popularity as a close-distance tie-breaker", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = toUrl(input);

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([
        createCandidateVendor(0, {
          id: "open-popular-similar",
          name: "Open Popular Similar",
          slug: "open-popular-similar",
          longitude: 7.3986 + 0.0117,
          is_open_override: true,
        }),
        createCandidateVendor(1, {
          id: "open-near",
          name: "Open Near",
          slug: "open-near",
          longitude: 7.3986 + 0.0108,
          is_open_override: true,
        }),
        createCandidateVendor(2, {
          id: "closed-popular-close",
          name: "Closed Popular Close",
          slug: "closed-popular-close",
          longitude: 7.3986 + 0.0045,
          is_open_override: false,
        }),
        createCandidateVendor(3, {
          id: "open-far-popular",
          name: "Open Far Popular",
          slug: "open-far-popular",
          longitude: 7.3986 + 0.054,
          is_open_override: true,
        }),
        createCandidateVendor(4, {
          id: "closed-near",
          name: "Closed Near",
          slug: "closed-near",
          longitude: 7.3986 + 0.018,
          is_open_override: false,
        }),
      ]);
    }

    if (url.pathname === "/rest/v1/rpc/get_vendor_usage_scores") {
      return Response.json([
        { vendor_id: "closed-popular-close", ranking_score: 50 },
        { vendor_id: "open-popular-similar", ranking_score: 12 },
        { vendor_id: "open-far-popular", ranking_score: 60 },
      ]);
    }

    return Response.json([]);
  }) as typeof fetch;

  try {
    const response = await nearbyRoute(
      createNearbyNextRequest(
        "http://localhost/api/vendors/nearby?lat=9.0765&lng=7.3986&location_source=precise&radius_km=10",
      ),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(
      body.data.vendors.map((vendor: { slug: string }) => vendor.slug),
      [
        "open-popular-similar",
        "open-near",
        "open-far-popular",
        "closed-popular-close",
        "closed-near",
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("nearby route rate limits repeated public search abuse without blocking normal browsing defaults", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;
  let vendorReads = 0;

  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = toUrl(input);

    if (url.pathname === "/rest/v1/vendors") {
      vendorReads += 1;
      return Response.json([createCandidateVendor(0)]);
    }

    return Response.json([]);
  }) as typeof fetch;

  try {
    let lastResponse: Response | null = null;

    for (let index = 0; index <= PUBLIC_NEARBY_SEARCH_RATE_LIMIT.maxRequests; index += 1) {
      lastResponse = await nearbyRoute(
        createNearbyNextRequest(
          `http://localhost/api/vendors/nearby?search=rice-${index}&lat=9.0765&lng=7.3986&location_source=precise`,
        ),
      );
    }

    assert.ok(lastResponse);
    const body = await lastResponse!.json();

    assert.equal(lastResponse!.status, 429);
    assert.equal(body.error.code, "TOO_MANY_REQUESTS");
    assert.equal(vendorReads, PUBLIC_NEARBY_SEARCH_RATE_LIMIT.maxRequests);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("nearby route logs degraded empty responses distinctly from true empty results", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const errorCalls: Array<Record<string, unknown>> = [];

  console.error = ((record: unknown) => {
    if (record && typeof record === "object" && !Array.isArray(record)) {
      errorCalls.push(record as Record<string, unknown>);
    }
  }) as typeof console.error;

  globalThis.fetch = (async () => {
    throw new Error("upstream unavailable");
  }) as typeof fetch;

  try {
    const response = await nearbyRoute(
      createNearbyNextRequest(
        "http://localhost/api/vendors/nearby?lat=9.0765&lng=7.3986&location_source=precise&radius_km=10",
      ),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data.vendors, []);

    const degradedLog = errorCalls.find((record) => record.event === "PUBLIC_NEARBY_ROUTE_FAILED");

    assert.ok(degradedLog);
    assert.equal(degradedLog?.status, 200);
    assert.equal(degradedLog?.errorCode, "UPSTREAM_ERROR");
    assert.equal(
      (degradedLog?.metadata as Record<string, unknown> | undefined)?.degraded,
      true,
    );
    assert.equal(
      (degradedLog?.metadata as Record<string, unknown> | undefined)?.operatorActionRequired,
      true,
    );
    assert.equal(
      (degradedLog?.metadata as Record<string, unknown> | undefined)?.upstreamArea,
      "nearby_vendor_lookup",
    );
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

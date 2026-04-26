import assert from "node:assert/strict";
import test from "node:test";
import { GET as categoriesRoute } from "../app/api/categories/route.ts";
import { GET as vendorDetailRoute } from "../app/api/vendors/[slug]/route.ts";

const vendorId = "00000000-0000-4000-8000-000000000001";
const timestamp = "2026-04-22T00:00:00+00:00";

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

test("public categories route returns category summaries", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    assert.equal(url.pathname, "/rest/v1/vendor_categories");

    return Response.json([
      {
        id: "10000000-0000-4000-8000-000000000001",
        name: "Rice",
        slug: "rice",
        created_at: timestamp,
      },
    ]);
  }) as typeof fetch;

  try {
    const response = await categoriesRoute();
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data.categories, [
      {
        id: "10000000-0000-4000-8000-000000000001",
        name: "Rice",
        slug: "rice",
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("public vendor detail route returns transformed vendor detail", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;
  const fetchOptions: RequestInit[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    fetchOptions.push(init ?? {});
    const url = input instanceof URL ? input : new URL(String(input));

    assert.equal(url.pathname, "/rest/v1/vendors");
    assert.equal(url.searchParams.get("slug"), "eq.test-vendor");

    return Response.json([
      {
        id: vendorId,
        name: "Test Vendor",
        slug: "test-vendor",
        short_description: "Test vendor",
        phone_number: "+2340000000000",
        address_text: "Test address",
        city: "Abuja",
        area: "Wuse",
        state: "FCT",
        country: "Nigeria",
        latitude: 9.0813,
        longitude: 7.4694,
        price_band: "budget",
        average_rating: 4.2,
        review_count: 5,
        is_active: true,
        is_open_override: null,
        created_at: timestamp,
        updated_at: timestamp,
        vendor_hours: [
          {
            id: "20000000-0000-4000-8000-000000000001",
            vendor_id: vendorId,
            day_of_week: 1,
            open_time: "08:00:00",
            close_time: "18:00:00",
            is_closed: false,
            created_at: timestamp,
            updated_at: timestamp,
          },
        ],
        vendor_category_map: [
          {
            vendor_categories: {
              id: "30000000-0000-4000-8000-000000000001",
              name: "Rice",
              slug: "rice",
              created_at: timestamp,
            },
          },
        ],
        vendor_featured_dishes: [
          {
            id: "40000000-0000-4000-8000-000000000001",
            vendor_id: vendorId,
            dish_name: "Jollof rice",
            description: "Test dish",
            image_url: null,
            is_featured: true,
            created_at: timestamp,
            updated_at: timestamp,
          },
        ],
        vendor_images: [
          {
            id: "50000000-0000-4000-8000-000000000001",
            vendor_id: vendorId,
            image_url: "/seed-images/vendors/test/cover.jpg",
            sort_order: 0,
            created_at: timestamp,
          },
          {
            id: "50000000-0000-4000-8000-000000000002",
            vendor_id: vendorId,
            image_url:
              "https://example.supabase.co/storage/v1/object/public/vendor-images/test/hero.jpg",
            storage_object_path: "test/hero.jpg",
            sort_order: 1,
            created_at: timestamp,
          },
        ],
      },
    ]);
  }) as typeof fetch;

  try {
    const response = await vendorDetailRoute(
      new Request("http://localhost/api/vendors/test-vendor"),
      {
        params: Promise.resolve({ slug: "test-vendor" }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.vendor.slug, "test-vendor");
    assert.equal(body.data.vendor.hours[0].day_of_week, 1);
    assert.equal(body.data.vendor.categories[0].slug, "rice");
    assert.equal(body.data.vendor.featured_dishes[0].dish_name, "Jollof rice");
    assert.equal(body.data.vendor.images.length, 1);
    assert.equal(body.data.vendor.images[0].storage_object_path, "test/hero.jpg");
    assert.deepEqual(body.data.vendor.rating_summary, {
      average_rating: 4.2,
      review_count: 5,
    });
    assert.equal(fetchOptions[0]?.cache, "no-store");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("public vendor detail route ignores seed-image vendor rows without storage paths", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json([
      {
        id: vendorId,
        name: "Seed Only Vendor",
        slug: "seed-only-vendor",
        short_description: null,
        phone_number: null,
        address_text: null,
        city: "Abuja",
        area: "Wuse",
        state: "FCT",
        country: "Nigeria",
        latitude: 9.0813,
        longitude: 7.4694,
        price_band: null,
        average_rating: 0,
        review_count: 0,
        is_active: true,
        is_open_override: null,
        created_at: timestamp,
        updated_at: timestamp,
        vendor_hours: [],
        vendor_category_map: [],
        vendor_featured_dishes: [],
        vendor_images: [
          {
            id: "50000000-0000-4000-8000-000000000001",
            vendor_id: vendorId,
            image_url: "/seed-images/vendors/seed-only-vendor/cover.jpg",
            sort_order: 0,
            created_at: timestamp,
          },
        ],
      },
    ])) as typeof fetch;

  try {
    const response = await vendorDetailRoute(
      new Request("http://localhost/api/vendors/seed-only-vendor"),
      {
        params: Promise.resolve({ slug: "seed-only-vendor" }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data.vendor.images, []);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("public vendor detail route still succeeds when linked data is missing", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    assert.equal(url.pathname, "/rest/v1/vendors");
    assert.equal(url.searchParams.get("slug"), "eq.incomplete-vendor");

    return Response.json([
      {
        id: vendorId,
        name: "Incomplete Vendor",
        slug: "incomplete-vendor",
        short_description: null,
        phone_number: null,
        address_text: null,
        city: "Abuja",
        area: null,
        state: "FCT",
        country: "Nigeria",
        latitude: 9.0813,
        longitude: 7.4694,
        price_band: null,
        average_rating: 0,
        review_count: 0,
        is_active: true,
        is_open_override: null,
        created_at: timestamp,
        updated_at: timestamp,
        vendor_hours: [],
        vendor_category_map: [],
        vendor_featured_dishes: [],
        vendor_images: [],
      },
    ]);
  }) as typeof fetch;

  try {
    const response = await vendorDetailRoute(
      new Request("http://localhost/api/vendors/incomplete-vendor"),
      {
        params: Promise.resolve({ slug: "incomplete-vendor" }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.vendor.slug, "incomplete-vendor");
    assert.deepEqual(body.data.vendor.hours, []);
    assert.deepEqual(body.data.vendor.featured_dishes, []);
    assert.deepEqual(body.data.vendor.images, []);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("public vendor detail route normalizes storage-only vendor images into public URLs", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    assert.equal(url.pathname, "/rest/v1/vendors");
    assert.equal(url.searchParams.get("slug"), "eq.storage-only-vendor");

    return Response.json([
      {
        id: vendorId,
        name: "Storage Only Vendor",
        slug: "storage-only-vendor",
        short_description: null,
        phone_number: null,
        address_text: null,
        city: "Abuja",
        area: "Wuse",
        state: "FCT",
        country: "Nigeria",
        latitude: 9.0813,
        longitude: 7.4694,
        price_band: null,
        average_rating: 0,
        review_count: 0,
        is_active: true,
        is_open_override: null,
        created_at: timestamp,
        updated_at: timestamp,
        vendor_hours: [],
        vendor_category_map: [],
        vendor_featured_dishes: [],
        vendor_images: [
          {
            id: "50000000-0000-4000-8000-000000000001",
            vendor_id: vendorId,
            storage_object_path: `${vendorId}/cover.jpg`,
            sort_order: 0,
            created_at: timestamp,
          },
        ],
      },
    ]);
  }) as typeof fetch;

  try {
    const response = await vendorDetailRoute(
      new Request("http://localhost/api/vendors/storage-only-vendor"),
      {
        params: Promise.resolve({ slug: "storage-only-vendor" }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(
      body.data.vendor.images[0].image_url,
      `https://example.supabase.co/storage/v1/object/public/vendor-images/${vendorId}/cover.jpg`,
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

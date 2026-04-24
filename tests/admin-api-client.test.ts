import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminApiError,
  deleteAdminVendorImage,
  createAdminVendor,
  createAdminVendorImages,
  listAdminVendors,
  listAdminVendorImages,
} from "../lib/admin/api-client.ts";

const vendorId = "00000000-0000-4000-8000-000000000001";

test("admin API client sends bearer token and query params", async () => {
  const requestedUrls: string[] = [];
  const requestedHeaders: Headers[] = [];
  const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
    requestedUrls.push(String(input));
    requestedHeaders.push(new Headers(init?.headers));

    return Response.json({
      success: true,
      data: {
        vendors: [
          {
            id: vendorId,
            name: "Test Vendor",
            slug: "test-vendor",
            short_description: "Test vendor",
            phone_number: "+2340000000000",
            area: "Wuse",
            latitude: 9.0813,
            longitude: 7.4694,
            price_band: "budget",
            average_rating: 0,
            review_count: 0,
            is_active: true,
            is_open_override: null,
          },
        ],
        pagination: {
          limit: 50,
          offset: 0,
          count: 1,
        },
      },
      error: null,
    });
  }) as typeof fetch;

  const result = await listAdminVendors(
    {
      search: "rice",
      area: "Wuse",
      is_active: true,
      price_band: "budget",
    },
    {
      accessToken: "admin-token",
      fetchImpl,
    },
  );
  const url = new URL(requestedUrls[0], "http://localhost");

  assert.equal(result.vendors[0].id, vendorId);
  assert.equal(requestedHeaders[0].get("authorization"), "Bearer admin-token");
  assert.equal(url.pathname, "/api/admin/vendors");
  assert.equal(url.searchParams.get("search"), "rice");
  assert.equal(url.searchParams.get("area"), "Wuse");
  assert.equal(url.searchParams.get("is_active"), "true");
  assert.equal(url.searchParams.get("price_band"), "budget");
});

test("admin API client throws standard API errors", async () => {
  const fetchImpl = (async () =>
    Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Admin token is required.",
        },
      },
      { status: 401 },
    )) as typeof fetch;

  await assert.rejects(
    () =>
      createAdminVendor(
        {
          name: "Test Vendor",
          slug: "test-vendor",
          short_description: null,
          phone_number: null,
          address_text: null,
          city: "Abuja",
          area: "Wuse",
          state: "FCT",
          country: "Nigeria",
          latitude: 9.0813,
          longitude: 7.4694,
          price_band: "budget",
          is_active: true,
          is_open_override: null,
        },
        {
          accessToken: "bad-token",
          fetchImpl,
        },
      ),
    /UNAUTHORIZED: Admin token is required\./,
  );
});

test("admin API client reports non-json failures clearly", async () => {
  const fetchImpl = (async () =>
    new Response("Service unavailable", {
      status: 503,
    })) as typeof fetch;

  await assert.rejects(
    () =>
      listAdminVendors(
        {},
        {
          accessToken: "admin-token",
          fetchImpl,
        },
      ),
    /HTTP_ERROR: API request failed with status 503/,
  );
});

test("admin API client reports malformed API responses clearly", async () => {
  const fetchImpl = (async () =>
    Response.json({
      data: null,
    })) as typeof fetch;

  await assert.rejects(
    () =>
      listAdminVendors(
        {},
        {
          accessToken: "admin-token",
          fetchImpl,
        },
      ),
    /INVALID_RESPONSE: API returned an unexpected response shape/,
  );
});

test("admin API client preserves validation details", async () => {
  const fetchImpl = (async () =>
    Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request.",
          details: {
            issues: [
              {
                path: ["slug"],
                message: "Use lowercase words separated by hyphens.",
              },
            ],
          },
        },
      },
      { status: 400 },
    )) as typeof fetch;

  await assert.rejects(
    () =>
      createAdminVendor(
        {
          name: "Test Vendor",
          slug: "invalid slug",
          short_description: null,
          phone_number: null,
          address_text: null,
          city: "Abuja",
          area: "Wuse",
          state: "FCT",
          country: "Nigeria",
          latitude: 9.0813,
          longitude: 7.4694,
          price_band: "budget",
          is_active: true,
          is_open_override: null,
        },
        {
          accessToken: "bad-token",
          fetchImpl,
        },
      ),
    (error) =>
      error instanceof AdminApiError &&
      error.code === "VALIDATION_ERROR" &&
      error.status === 400 &&
      typeof error.details === "object" &&
      error.details !== null,
  );
});

test("admin API client uploads image files without forcing json headers", async () => {
  const requestedHeaders: Headers[] = [];
  const requestedBodies: unknown[] = [];
  const fetchImpl = (async (_input: URL | RequestInfo, init?: RequestInit) => {
    requestedHeaders.push(new Headers(init?.headers));
    requestedBodies.push(init?.body);

    return Response.json({
      success: true,
      data: {
        images: [
          {
            id: "10000000-0000-4000-8000-000000000001",
            vendor_id: vendorId,
            image_url: "https://example.supabase.co/storage/v1/object/public/vendor-images/vendors/vendor/image.jpg",
            storage_object_path: "vendors/vendor/image.jpg",
            sort_order: 2,
          },
        ],
      },
      error: null,
    });
  }) as typeof fetch;

  const formData = new FormData();
  formData.set(
    "image",
    new File([Uint8Array.from([1, 2, 3])], "image.jpg", { type: "image/jpeg" }),
  );
  formData.set("sort_order", "2");

  const images = await createAdminVendorImages(
    vendorId,
    formData,
    {
      accessToken: "admin-token",
      fetchImpl,
    },
  );

  assert.equal(images[0].storage_object_path, "vendors/vendor/image.jpg");
  assert.equal(requestedHeaders[0].get("authorization"), "Bearer admin-token");
  assert.equal(requestedHeaders[0].get("content-type"), null);
  assert.ok(requestedBodies[0] instanceof FormData);
});

test("admin API client can list vendor images", async () => {
  const fetchImpl = (async () =>
    Response.json({
      success: true,
      data: {
        images: [
          {
            id: "10000000-0000-4000-8000-000000000001",
            vendor_id: vendorId,
            image_url: "https://example.supabase.co/storage/v1/object/public/vendor-images/vendors/vendor/image.jpg",
            storage_object_path: "vendors/vendor/image.jpg",
            sort_order: 2,
          },
        ],
      },
      error: null,
    })) as typeof fetch;

  const images = await listAdminVendorImages(vendorId, {
    accessToken: "admin-token",
    fetchImpl,
  });

  assert.equal(images[0].storage_object_path, "vendors/vendor/image.jpg");
});

test("admin API client can delete vendor images", async () => {
  const requestedUrls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    requestedUrls.push(String(input));

    return Response.json({
      success: true,
      data: {
        image: {
          id: "10000000-0000-4000-8000-000000000001",
          vendor_id: vendorId,
          image_url: "https://example.supabase.co/storage/v1/object/public/vendor-images/vendors/vendor/image.jpg",
          storage_object_path: "vendors/vendor/image.jpg",
          sort_order: 2,
        },
      },
      error: null,
    });
  }) as typeof fetch;

  const image = await deleteAdminVendorImage(vendorId, "10000000-0000-4000-8000-000000000001", {
    accessToken: "admin-token",
    fetchImpl,
  });

  assert.equal(image.storage_object_path, "vendors/vendor/image.jpg");
  assert.equal(
    new URL(requestedUrls[0], "http://localhost").pathname,
    "/api/admin/vendors/00000000-0000-4000-8000-000000000001/images/10000000-0000-4000-8000-000000000001",
  );
});

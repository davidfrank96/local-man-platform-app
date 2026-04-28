import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminApiError,
  deleteAdminVendorImage,
  deleteAdminVendorDish,
  createAdminVendor,
  createAdminVendorImages,
  fetchAdminAnalytics,
  fetchAdminAuditLogs,
  listAdminVendorDishes,
  listAdminVendorHours,
  listAdminVendors,
  listAdminVendorImages,
  submitAdminVendorIntake,
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
    (error) =>
      error instanceof AdminApiError &&
      error.code === "UNAUTHORIZED" &&
      error.status === 401 &&
      error.message === "Admin token is required.",
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

test("admin API client preserves safe debug detail for admin forms", async () => {
  const fetchImpl = (async () =>
    Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "USER_ALREADY_EXISTS",
          message: "This user already exists.",
          detail: "Supabase auth rejected a duplicate email.",
          details: {
            provider: "supabase_auth",
            reason: "duplicate_email",
          },
        },
      },
      { status: 409 },
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
    (error) =>
      error instanceof AdminApiError &&
      error.code === "USER_ALREADY_EXISTS" &&
      error.status === 409 &&
      error.detail === "Supabase auth rejected a duplicate email.",
  );
});

test("admin API client rejects invalid audit log filters before request", async () => {
  let called = false;
  const fetchImpl = (async () => {
    called = true;
    return Response.json({
      success: true,
      data: {
        auditLogs: [],
        pagination: {
          limit: 10,
          offset: 0,
          has_more: false,
        },
      },
      error: null,
    });
  }) as typeof fetch;

  const result = await fetchAdminAuditLogs(
    {
      user_role: "owner" as never,
    },
    {
      accessToken: "admin-token",
      fetchImpl,
    },
  );

  assert.equal(result.data, null);
  assert.equal(result.error?.code, "VALIDATION_ERROR");
  assert.equal(result.error?.detail, "user_role must be either admin or agent.");
  assert.equal(called, false);
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
            image_url: "https://example.supabase.co/storage/v1/object/public/vendor-images/vendor/image.jpg",
            storage_object_path: "vendor/image.jpg",
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

  assert.equal(images[0].storage_object_path, "vendor/image.jpg");
  assert.equal(requestedHeaders[0].get("authorization"), "Bearer admin-token");
  assert.equal(requestedHeaders[0].get("content-type"), null);
  assert.ok(requestedBodies[0] instanceof FormData);
});

test("admin API client surfaces readable image upload failures", async () => {
  const fetchImpl = (async () =>
    Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Only JPEG, PNG, and WebP images are allowed.",
        },
      },
      { status: 400 },
    )) as typeof fetch;

  const formData = new FormData();
  formData.set(
    "image",
    new File([Uint8Array.from([1, 2, 3])], "image.gif", { type: "image/gif" }),
  );

  await assert.rejects(
    () =>
      createAdminVendorImages(vendorId, formData, {
        accessToken: "admin-token",
        fetchImpl,
      }),
    (error) =>
      error instanceof AdminApiError &&
      error.code === "VALIDATION_ERROR" &&
      error.message === "Only JPEG, PNG, and WebP images are allowed.",
  );
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
            image_url: "https://example.supabase.co/storage/v1/object/public/vendor-images/vendor/image.jpg",
            storage_object_path: "vendor/image.jpg",
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

  assert.equal(images[0].storage_object_path, "vendor/image.jpg");
});

test("admin API client can list vendor dishes", async () => {
  const fetchImpl = (async () =>
    Response.json({
      success: true,
      data: {
        dishes: [
          {
            id: "20000000-0000-4000-8000-000000000001",
            vendor_id: vendorId,
            dish_name: "Jollof rice",
            description: "Test dish",
            image_url: null,
            is_featured: true,
            created_at: "2026-04-22T00:00:00+00:00",
            updated_at: "2026-04-22T00:00:00+00:00",
          },
        ],
      },
      error: null,
    })) as typeof fetch;

  const dishes = await listAdminVendorDishes(vendorId, {
    accessToken: "admin-token",
    fetchImpl,
  });

  assert.equal(dishes[0].vendor_id, vendorId);
  assert.equal(dishes[0].dish_name, "Jollof rice");
});

test("admin API client can list vendor hours", async () => {
  const fetchImpl = (async () =>
    Response.json({
      success: true,
      data: {
        hours: [
          {
            id: "20000000-0000-4000-8000-000000000001",
            vendor_id: vendorId,
            day_of_week: 1,
            open_time: "08:00",
            close_time: "18:00",
            is_closed: false,
            created_at: "2026-04-22T00:00:00+00:00",
            updated_at: "2026-04-22T00:00:00+00:00",
          },
        ],
      },
      error: null,
    })) as typeof fetch;

  const hours = await listAdminVendorHours(vendorId, {
    accessToken: "admin-token",
    fetchImpl,
  });

  assert.equal(hours[0].day_of_week, 1);
  assert.equal(hours[0].open_time, "08:00");
});

test("admin API client can fetch analytics", async () => {
  const requestedUrls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    requestedUrls.push(String(input));

    return Response.json({
      success: true,
      data: {
        range: "30d",
        summary: {
          total_sessions: 2,
          total_events: 12,
          vendor_selections: 3,
          vendor_detail_opens: 4,
          call_clicks: 1,
          directions_clicks: 1,
          searches_used: 2,
          filters_applied: 2,
        },
        vendor_performance: {
          most_selected_vendors: [],
          most_viewed_vendor_details: [],
          most_call_clicks: [],
          most_directions_clicks: [],
        },
        dropoff: {
          session_metrics_available: false,
          sessions_without_meaningful_interaction: null,
          sessions_with_search_without_vendor_click: null,
          sessions_with_detail_without_action: null,
        },
        recent_events: [],
      },
      error: null,
    });
  }) as typeof fetch;

  const analytics = await fetchAdminAnalytics(
    { range: "30d" },
    {
      accessToken: "admin-token",
      fetchImpl,
    },
  );

  assert.equal(analytics.error, null);
  assert.equal(analytics.data?.summary.total_events, 12);
  assert.equal(
    new URL(requestedUrls[0], "http://localhost").pathname,
    "/api/admin/analytics",
  );
  assert.equal(
    new URL(requestedUrls[0], "http://localhost").searchParams.get("range"),
    "30d",
  );
});

test("admin API client returns safe error result for analytics failures", async () => {
  const fetchImpl = (async () =>
    Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "UPSTREAM_ERROR",
          message: "Supabase audit log read failed with HTTP 400.",
          detail: "Bad analytics query.",
        },
      },
      { status: 502 },
    )) as typeof fetch;

  const result = await fetchAdminAnalytics(
    { range: "7d" },
    {
      accessToken: "admin-token",
      fetchImpl,
    },
  );

  assert.equal(result.data, null);
  assert.equal(result.error?.code, "UPSTREAM_ERROR");
  assert.equal(result.error?.message, "Supabase audit log read failed with HTTP 400.");
});

test("admin API client can submit vendor intake preview requests", async () => {
  const requestedUrls: string[] = [];
  const requestedMethods: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
    requestedUrls.push(String(input));
    requestedMethods.push(init?.method ?? "GET");

    return Response.json({
      success: true,
      data: {
        totalRows: 1,
        validRows: [],
        invalidRows: [],
      },
      error: null,
    });
  }) as typeof fetch;

  const result = await submitAdminVendorIntake(
    {
      action: "preview",
      rows: [
        {
          row_number: 2,
          vendor_name: "Mama Put Rice",
        },
      ],
    },
    {
      accessToken: "admin-token",
      fetchImpl,
    },
  );

  assert.equal(result.totalRows, 1);
  assert.equal(new URL(requestedUrls[0], "http://localhost").pathname, "/api/admin/vendors/intake");
  assert.equal(requestedMethods[0], "POST");
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
          image_url: "https://example.supabase.co/storage/v1/object/public/vendor-images/vendor/image.jpg",
          storage_object_path: "vendor/image.jpg",
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

  assert.equal(image.storage_object_path, "vendor/image.jpg");
  assert.equal(
    new URL(requestedUrls[0], "http://localhost").pathname,
    "/api/admin/vendors/00000000-0000-4000-8000-000000000001/images/10000000-0000-4000-8000-000000000001",
  );
});

test("admin API client can delete vendor dishes", async () => {
  const requestedUrls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    requestedUrls.push(String(input));

    return Response.json({
      success: true,
      data: {
        dish: {
          id: "20000000-0000-4000-8000-000000000001",
          vendor_id: vendorId,
          dish_name: "Jollof rice",
          description: "Test dish",
          image_url: null,
          is_featured: true,
          created_at: "2026-04-22T00:00:00+00:00",
          updated_at: "2026-04-22T00:00:00+00:00",
        },
      },
      error: null,
    });
  }) as typeof fetch;

  const dish = await deleteAdminVendorDish(vendorId, "20000000-0000-4000-8000-000000000001", {
    accessToken: "admin-token",
    fetchImpl,
  });

  assert.equal(dish.dish_name, "Jollof rice");
  assert.equal(
    new URL(requestedUrls[0], "http://localhost").pathname,
    "/api/admin/vendors/00000000-0000-4000-8000-000000000001/dishes/20000000-0000-4000-8000-000000000001",
  );
});

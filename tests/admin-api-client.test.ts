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

function setSupabasePublicEnv(): () => void {
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

function setNodeEnv(value: string): () => void {
  const previous = process.env.NODE_ENV;
  Object.defineProperty(process.env, "NODE_ENV", {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });

  return () => {
    if (previous === undefined) {
      Object.defineProperty(process.env, "NODE_ENV", {
        configurable: true,
        enumerable: true,
        writable: true,
        value: undefined,
      });
    } else {
      Object.defineProperty(process.env, "NODE_ENV", {
        configurable: true,
        enumerable: true,
        writable: true,
        value: previous,
      });
    }
  };
}

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

test("admin API client skips invalid audit log filters before request", async () => {
  const restoreEnv = setSupabasePublicEnv();
  let called = false;
  const fetchImpl = (async () => {
    called = true;
    return Response.json([]);
  }) as typeof fetch;

  try {
    const result = await fetchAdminAuditLogs(
      {
        user_role: "owner" as never,
      },
      {
        accessToken: "admin-token",
        fetchImpl,
      },
    );

    assert.equal(called, true);
    assert.equal(result.error, null);
    assert.equal(result.data?.auditLogs.length, 0);
  } finally {
    restoreEnv();
  }
});

test("admin API client fetches audit logs directly from Supabase", async () => {
  const restoreEnv = setSupabasePublicEnv();
  const requestedUrls: string[] = [];
  const requestedHeaders: Headers[] = [];
  const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
    requestedUrls.push(String(input));
    requestedHeaders.push(new Headers(init?.headers));

    return Response.json([
      {
        id: "30000000-0000-4000-8000-000000000001",
        user_role: "admin",
        entity_type: "vendor",
        action: "CREATE_VENDOR",
        created_at: "2026-04-28T12:00:00.000Z",
      },
    ]);
  }) as typeof fetch;

  try {
    const result = await fetchAdminAuditLogs(
      {
        limit: 10,
        user_role: "admin",
        action: "CREATE_VENDOR",
      },
      {
        accessToken: "admin-token",
        fetchImpl,
      },
    );

    const url = new URL(requestedUrls[0]);
    assert.equal(result.error, null);
    assert.equal(result.data?.auditLogs.length, 1);
    assert.equal(requestedHeaders[0].get("apikey"), "anon-key");
    assert.equal(url.pathname, "/rest/v1/audit_logs");
    assert.equal(url.searchParams.get("select"), "id,user_role,entity_type,action,created_at");
    assert.equal(url.searchParams.get("order"), "created_at.desc");
    assert.equal(url.searchParams.get("limit"), "10");
    assert.equal(url.searchParams.get("user_role"), "eq.admin");
    assert.equal(url.searchParams.get("action"), "eq.CREATE_VENDOR");
    assert.deepEqual(result.data?.auditLogs[0]?.metadata, {});
    assert.equal(result.data?.pagination.next_cursor, null);
  } finally {
    restoreEnv();
  }
});

test("admin API client applies audit log cursor pagination directly in Supabase", async () => {
  const restoreEnv = setSupabasePublicEnv();
  const requestedUrls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    requestedUrls.push(String(input));

    return Response.json([
      {
        id: "30000000-0000-4000-8000-000000000010",
        user_role: "agent",
        entity_type: "vendor",
        action: "UPDATE_VENDOR",
        created_at: "2026-04-28T11:00:00.000Z",
      },
    ]);
  }) as typeof fetch;

  try {
    const result = await fetchAdminAuditLogs(
      {
        limit: 10,
        cursor: "2026-04-28T12:00:00.000Z",
      },
      {
        accessToken: "admin-token",
        fetchImpl,
      },
    );

    const url = new URL(requestedUrls[0]);
    assert.equal(result.error, null);
    assert.equal(url.searchParams.get("created_at"), "lt.2026-04-28T12:00:00.000Z");
    assert.equal(url.searchParams.get("limit"), "10");
    assert.equal(result.data?.pagination.has_more, false);
    assert.equal(result.data?.pagination.next_cursor, null);
  } finally {
    restoreEnv();
  }
});

test("admin API client returns safe error result for direct Supabase audit log failures", async () => {
  const restoreEnv = setSupabasePublicEnv();
  const fetchImpl = (async () =>
    Response.json(
      {
        code: "42501",
        message: "permission denied for table audit_logs",
      },
      { status: 403 },
    )) as typeof fetch;

  try {
    const result = await fetchAdminAuditLogs(
      {
        limit: 10,
      },
      {
        accessToken: "agent-token",
        fetchImpl,
      },
    );

    assert.equal(result.data, null);
    assert.equal(result.error?.code, "FORBIDDEN");
    assert.equal(result.error?.message, "You do not have access to analytics");
  } finally {
    restoreEnv();
  }
});

test("admin API client falls back to backend audit log route in development", async () => {
  const restoreEnv = setSupabasePublicEnv();
  const restoreNodeEnv = setNodeEnv("development");
  const requestedUrls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    requestedUrls.push(String(input));
    const url = new URL(String(input), "http://localhost");

    if (url.pathname === "/rest/v1/audit_logs") {
      return Response.json(
        {
          code: "42501",
          message: "permission denied for table audit_logs",
        },
        { status: 403 },
      );
    }

    if (url.pathname === "/api/admin/audit-logs") {
      return Response.json({
        success: true,
        data: {
          auditLogs: [
            {
              id: "30000000-0000-4000-8000-000000000020",
              admin_user_id: null,
              user_role: "admin",
              entity_type: "vendor",
              entity_id: null,
              action: "UPDATE_VENDOR",
              metadata: {},
              created_at: "2026-04-28T10:00:00.000Z",
            },
          ],
          pagination: {
            limit: 10,
            offset: 10,
            has_more: true,
          },
        },
        error: null,
      });
    }

    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    const result = await fetchAdminAuditLogs(
      {
        limit: 10,
        cursor: "2026-04-28T12:00:00.000Z",
        offset: 10,
      },
      {
        accessToken: "admin-token",
        fetchImpl,
      },
    );

    assert.equal(result.error, null);
    assert.equal(result.data?.auditLogs.length, 1);
    assert.equal(result.data?.pagination.has_more, true);
    assert.equal(result.data?.pagination.next_cursor, "2026-04-28T10:00:00.000Z");
    assert.equal(new URL(requestedUrls[0], "http://localhost").pathname, "/rest/v1/audit_logs");
    assert.equal(new URL(requestedUrls[1], "http://localhost").pathname, "/api/admin/audit-logs");
    assert.equal(new URL(requestedUrls[1], "http://localhost").searchParams.get("offset"), "10");
  } finally {
    restoreNodeEnv();
    restoreEnv();
  }
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
  const restoreEnv = setSupabasePublicEnv();
  const originalNow = Date.now;
  Date.now = () => new Date("2026-04-29T10:00:00.000Z").valueOf();
  const fetchImpl = (async (input: URL | RequestInfo) => {
    requestedUrls.push(String(input));
    const url = new URL(String(input));

    if (url.pathname === "/rest/v1/user_events") {
      return Response.json([
        {
          id: "00000000-0000-4000-8000-000000000101",
          event_type: "VENDOR_SELECTED",
          vendor_id: vendorId,
          vendor_slug: "test-vendor",
          page_path: "/vendors/test-vendor",
          search_query: null,
          metadata: {},
          device_type: "mobile",
          location_source: "precise",
          timestamp: "2026-04-29T10:00:00.000Z",
        },
        {
          id: "00000000-0000-4000-8000-000000000102",
          event_type: "Search_Used",
          vendor_id: null,
          vendor_slug: null,
          page_path: "/search",
          search_query: "rice",
          metadata: {},
          device_type: "desktop",
          location_source: "approximate",
          timestamp: "2026-04-29T09:00:00.000Z",
        },
      ]);
    }

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([
        {
          id: vendorId,
          name: "Test Vendor",
          slug: "test-vendor",
        },
      ]);
    }

    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    const analytics = await fetchAdminAnalytics(
      { range: "30d" },
      {
        accessToken: "admin-token",
        fetchImpl,
      },
    );

    assert.equal(analytics.error, null);
    assert.equal(analytics.data?.summary.total_events, 2);
    assert.equal(analytics.data?.summary.vendor_selections, 1);
    assert.equal(analytics.data?.summary.searches_used, 1);
    assert.equal(new URL(requestedUrls[0]).pathname, "/rest/v1/user_events");
    assert.equal(
      new URL(requestedUrls[0]).searchParams.get("select"),
      "id,event_type,vendor_id,vendor_slug,page_path,search_query,metadata,timestamp,device_type,location_source",
    );
    assert.equal(new URL(requestedUrls[0]).searchParams.get("order"), "timestamp.desc");
    assert.equal(new URL(requestedUrls[0]).searchParams.get("limit"), "10");
    assert.equal(new URL(requestedUrls[0]).searchParams.get("timestamp"), "gte.2026-03-30T10:00:00.000Z");
    assert.equal(new URL(requestedUrls[1]).pathname, "/rest/v1/vendors");
  } finally {
    Date.now = originalNow;
    restoreEnv();
  }
});

test("admin API client returns safe error result for analytics failures", async () => {
  const restoreEnv = setSupabasePublicEnv();
  const fetchImpl = (async () =>
    Response.json(
      {
        code: "42501",
        message: "permission denied for table user_events",
      },
      { status: 403 },
    )) as typeof fetch;

  try {
    const result = await fetchAdminAnalytics(
      { range: "7d" },
      {
        accessToken: "admin-token",
        fetchImpl,
      },
    );

    assert.equal(result.data, null);
    assert.equal(result.error?.code, "FORBIDDEN");
    assert.equal(result.error?.message, "You do not have access to analytics");
  } finally {
    restoreEnv();
  }
});

test("admin API client falls back to backend analytics route in development", async () => {
  const restoreEnv = setSupabasePublicEnv();
  const restoreNodeEnv = setNodeEnv("development");
  const requestedUrls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    requestedUrls.push(String(input));
    const url = new URL(String(input), "http://localhost");

    if (url.pathname === "/rest/v1/user_events") {
      return Response.json(
        {
          code: "42501",
          message: "permission denied for table user_events",
        },
        { status: 403 },
      );
    }

    if (url.pathname === "/api/admin/analytics") {
      return Response.json({
        success: true,
        data: {
          range: "7d",
          summary: {
            total_sessions: 1,
            total_events: 3,
            vendor_selections: 1,
            vendor_detail_opens: 1,
            call_clicks: 0,
            directions_clicks: 0,
            searches_used: 1,
            filters_applied: 0,
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
    }

    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    const result = await fetchAdminAnalytics(
      { range: "7d" },
      {
        accessToken: "admin-token",
        fetchImpl,
      },
    );

    assert.equal(result.error, null);
    assert.equal(result.data?.summary.total_events, 3);
    assert.equal(new URL(requestedUrls[0], "http://localhost").pathname, "/rest/v1/user_events");
    assert.equal(new URL(requestedUrls[1], "http://localhost").pathname, "/api/admin/analytics");
  } finally {
    restoreNodeEnv();
    restoreEnv();
  }
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

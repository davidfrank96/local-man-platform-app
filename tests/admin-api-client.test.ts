import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminApiError,
  createAdminVendor,
  createAdminVendorDishes,
  createAdminVendorImages,
  createManagedAdminUser,
  deleteManagedAdminUser,
  deactivateAdminVendor,
  deleteAdminVendorDish,
  deleteAdminVendorImage,
  fetchAdminAnalytics,
  fetchAdminAuditLogs,
  fetchAdminOperationalLogs,
  getAdminVendorRatingSignalSummary,
  listAdminUsers,
  listAdminVendorDishes,
  listAdminVendorHours,
  listAdminVendorImages,
  listAdminVendors,
  replaceAdminVendorHours,
  submitAdminVendorIntake,
  updateManagedAdminUserRole,
  updateAdminVendor,
} from "../lib/admin/api-client.ts";

const vendorId = "00000000-0000-4000-8000-000000000001";

function createAdminVendorSummary(overrides: Partial<Record<string, unknown>> = {}) {
  return {
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
    hours_count: 7,
    images_count: 1,
    featured_dishes_count: 1,
    ...overrides,
  };
}

function createStorage(initialEntries: Array<[string, string]> = []) {
  const values = new Map(initialEntries);

  return {
    get length() {
      return values.size;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

async function withDiscoveryInvalidationStorage(
  run: (
    storage: {
      localStorage: ReturnType<typeof createStorage>;
      sessionStorage: ReturnType<typeof createStorage>;
    },
  ) => Promise<void>,
) {
  const originalWindow = globalThis.window;
  const originalCustomEvent = globalThis.CustomEvent;
  const localStorage = createStorage([
    ["public-discovery-offline:public-discovery:/", "{\"nearbyData\":{}}"],
  ]);
  const sessionStorage = createStorage([
    ["public-discovery:/", "{\"nearbyData\":{}}"],
  ]);

  class CustomEventShim<T = unknown> extends Event {
    detail: T;

    constructor(type: string, init?: CustomEventInit<T>) {
      super(type);
      this.detail = init?.detail as T;
    }
  }

  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage,
      sessionStorage,
      dispatchEvent() {
        return true;
      },
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, "CustomEvent", {
    value: originalCustomEvent ?? CustomEventShim,
    configurable: true,
  });

  try {
    await run({ localStorage, sessionStorage });
  } finally {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
      });
    }

    if (originalCustomEvent === undefined) {
      Reflect.deleteProperty(globalThis, "CustomEvent");
    } else {
      Object.defineProperty(globalThis, "CustomEvent", {
        value: originalCustomEvent,
        configurable: true,
      });
    }
  }
}

function assertDiscoveryInvalidation(
  storage: {
    localStorage: ReturnType<typeof createStorage>;
    sessionStorage: ReturnType<typeof createStorage>;
  },
  expectedReason: string,
  expectedVendorId: string | null,
) {
  assert.equal(storage.sessionStorage.getItem("public-discovery:/"), null);
  assert.equal(
    storage.localStorage.getItem("public-discovery-offline:public-discovery:/"),
    null,
  );
  const rawPayload = storage.localStorage.getItem("public-discovery:vendors:invalidation");
  assert.ok(rawPayload);
  const payload = JSON.parse(rawPayload);
  assert.equal(payload.reason, expectedReason);
  assert.equal(payload.vendorId, expectedVendorId);
}

test("admin API client sends same-origin requests without exposing bearer tokens", async () => {
  const requestedUrls: string[] = [];
  const requestedHeaders: Headers[] = [];
  const requestedCredentials: Array<RequestCredentials | undefined> = [];

  const result = await listAdminVendors(
    {
      search: "rice",
      area: "Wuse",
      is_active: true,
      price_band: "budget",
    },
    {
      fetchImpl: (async (input: URL | RequestInfo, init?: RequestInit) => {
        requestedUrls.push(String(input));
        requestedHeaders.push(new Headers(init?.headers));
        requestedCredentials.push(init?.credentials);

        return Response.json({
          success: true,
          data: {
            vendors: [createAdminVendorSummary()],
            dashboard_counts: {
              total_vendor_count: 137,
              active_vendor_count: 111,
              missing_hours_count: 19,
              missing_images_count: 23,
              missing_dishes_count: 29,
              needs_follow_up_count: 41,
            },
            pagination: {
              limit: 100,
              offset: 0,
              count: 1,
              total_count: 137,
            },
          },
          error: null,
        });
      }) as typeof fetch,
    },
  );

  const url = new URL(requestedUrls[0], "http://localhost");
  assert.equal(result.vendors[0]?.id, vendorId);
  assert.equal(requestedHeaders[0]?.get("authorization"), null);
  assert.equal(requestedHeaders[0]?.get("x-request-id") !== null, true);
  assert.equal(requestedCredentials[0], "same-origin");
  assert.equal(url.pathname, "/api/admin/vendors");
  assert.equal(url.searchParams.get("search"), "rice");
  assert.equal(url.searchParams.get("area"), "Wuse");
  assert.equal(url.searchParams.get("is_active"), "true");
  assert.equal(url.searchParams.get("price_band"), "budget");
  assert.equal(url.searchParams.get("limit"), "100");
  assert.equal(url.searchParams.get("offset"), "0");
  assert.equal(result.pagination.total_count, 137);
  assert.equal(result.dashboard_counts.active_vendor_count, 111);
  assert.equal(result.dashboard_counts.needs_follow_up_count, 41);
});

test("admin API client reads vendor rating signal summaries through protected app route", async () => {
  const requestedUrls: string[] = [];
  const requestedHeaders: Headers[] = [];

  const result = await getAdminVendorRatingSignalSummary(vendorId, {
    fetchImpl: (async (input: URL | RequestInfo, init?: RequestInit) => {
      requestedUrls.push(String(input));
      requestedHeaders.push(new Headers(init?.headers));

      return Response.json({
        success: true,
        data: {
          signal_summary: {
            positive_signal_count: 5,
            neutral_signal_count: 2,
            negative_signal_count: 3,
            food_safety_concern_count: 1,
            poor_hygiene_count: 1,
            vendor_unavailable_count: 1,
            recent_signal_count: 4,
          },
        },
        error: null,
      });
    }) as typeof fetch,
  });

  assert.equal(result.positive_signal_count, 5);
  assert.equal(result.negative_signal_count, 3);
  assert.equal(
    new URL(requestedUrls[0], "http://localhost").pathname,
    `/api/admin/vendors/${vendorId}/rating-signals`,
  );
  assert.equal(requestedHeaders[0]?.get("authorization"), null);
});

test("admin API client restores the server session and retries once after a 401", async () => {
  const requestedUrls: string[] = [];

  const result = await listAdminUsers({
    fetchImpl: (async (input: URL | RequestInfo) => {
      const url = new URL(String(input), "http://localhost");
      requestedUrls.push(url.pathname);

      if (url.pathname === "/api/admin/admin-users" && requestedUrls.filter((path) => path === "/api/admin/admin-users").length === 1) {
        return Response.json(
          {
            success: false,
            data: null,
            error: {
              code: "UNAUTHORIZED",
              message: "Admin session expired. Sign in again.",
            },
          },
          { status: 401 },
        );
      }

      if (url.pathname === "/api/admin/session") {
        return Response.json({
          success: true,
          data: {
            user: { id: "admin-id", email: "admin@example.com" },
            adminUser: {
              id: "admin-id",
              email: "admin@example.com",
              full_name: "Admin User",
              role: "admin",
            },
          },
          error: null,
        });
      }

      return Response.json({
        success: true,
        data: {
          adminUsers: [
            {
              id: "40000000-0000-4000-8000-000000000001",
              email: "admin@example.com",
              full_name: "Admin User",
              role: "admin",
              created_at: "2026-04-28T12:00:00.000Z",
            },
          ],
        },
        error: null,
      });
    }) as typeof fetch,
  });

  assert.equal(result.length, 1);
  assert.deepEqual(requestedUrls, [
    "/api/admin/admin-users",
    "/api/admin/session",
    "/api/admin/admin-users",
  ]);
});

test("admin API client surfaces unauthorized errors when the server session cannot be refreshed", async () => {
  await assert.rejects(
    () =>
      listAdminVendors(
        {},
        {
          fetchImpl: (async (input: URL | RequestInfo) => {
            const url = new URL(String(input), "http://localhost");

            if (url.pathname === "/api/admin/session") {
              return Response.json(
                {
                  success: false,
                  data: null,
                  error: {
                    code: "UNAUTHORIZED",
                    message: "Admin session expired. Sign in again.",
                  },
                },
                { status: 401 },
              );
            }

            return Response.json(
              {
                success: false,
                data: null,
                error: {
                  code: "UNAUTHORIZED",
                  message: "Admin session expired. Sign in again.",
                },
              },
              { status: 401 },
            );
          }) as typeof fetch,
        },
      ),
    (error) =>
      error instanceof AdminApiError &&
      error.code === "UNAUTHORIZED" &&
      error.status === 401,
  );
});

test("admin API client reads team access through the app route", async () => {
  const requestedHeaders: Headers[] = [];

  const result = await listAdminUsers({
    fetchImpl: (async (_input: URL | RequestInfo, init?: RequestInit) => {
      requestedHeaders.push(new Headers(init?.headers));

      return Response.json({
        success: true,
        data: {
          adminUsers: [
            {
              id: "40000000-0000-4000-8000-000000000001",
              email: "admin@example.com",
              full_name: "Admin User",
              role: "admin",
              created_at: "2026-04-28T12:00:00.000Z",
            },
          ],
        },
        error: null,
      });
    }) as typeof fetch,
  });

  assert.equal(result[0]?.email, "admin@example.com");
  assert.equal(requestedHeaders[0]?.get("authorization"), null);
});

test("admin API client creates managed users through the app route", async () => {
  const requestedBodies: unknown[] = [];
  const requestedUrls: string[] = [];

  const result = await createManagedAdminUser(
    {
      email: "Agent@Example.com",
      password: "TempPass123!",
      full_name: "Agent User",
      role: "agent",
    },
    {
      fetchImpl: (async (input: URL | RequestInfo, init?: RequestInit) => {
        requestedUrls.push(String(input));
        requestedBodies.push(JSON.parse(String(init?.body ?? "{}")));

        return Response.json({
          success: true,
          data: {
            adminUser: {
              id: "40000000-0000-4000-8000-000000000002",
              email: "agent@example.com",
              full_name: "Agent User",
              role: "agent",
              created_at: "2026-05-02T12:00:00.000Z",
            },
            outcome: "created",
          },
          error: null,
        });
      }) as typeof fetch,
    },
  );

  assert.equal(result.adminUser.role, "agent");
  assert.deepEqual(requestedBodies[0], {
    email: "Agent@Example.com",
    password: "TempPass123!",
    full_name: "Agent User",
    role: "agent",
  });
  assert.equal(new URL(requestedUrls[0], "http://localhost").pathname, "/api/admin/create-user");
  assert.equal(requestedUrls.some((value) => value.includes("/rest/v1/")), false);
});

test("admin user management mutations stay on protected app routes", async () => {
  const requestedUrls: string[] = [];

  const fetchImpl = (async (input: URL | RequestInfo) => {
    requestedUrls.push(String(input));
    const url = new URL(String(input), "http://localhost");

    if (url.pathname === "/api/admin/admin-users/40000000-0000-4000-8000-000000000002") {
      return Response.json({
        success: true,
        data: {
          adminUser: {
            id: "40000000-0000-4000-8000-000000000002",
            email: "agent@example.com",
            full_name: "Updated Agent",
            role: "agent",
            created_at: "2026-05-02T12:00:00.000Z",
          },
          adminUserId: "40000000-0000-4000-8000-000000000002",
        },
        error: null,
      });
    }

    return Response.json({
      success: true,
      data: {
        adminUserId: "40000000-0000-4000-8000-000000000002",
      },
      error: null,
    });
  }) as typeof fetch;

  const updatedUser = await updateManagedAdminUserRole(
    "40000000-0000-4000-8000-000000000002",
    {
      full_name: "Updated Agent",
      role: "agent",
    },
    { fetchImpl },
  );

  const deleted = await deleteManagedAdminUser(
    "40000000-0000-4000-8000-000000000002",
    { fetchImpl },
  );

  assert.equal(updatedUser.full_name, "Updated Agent");
  assert.equal(deleted.adminUserId, "40000000-0000-4000-8000-000000000002");
  assert.deepEqual(
    requestedUrls.map((value) => new URL(value, "http://localhost").pathname),
    [
      "/api/admin/admin-users/40000000-0000-4000-8000-000000000002",
      "/api/admin/admin-users/40000000-0000-4000-8000-000000000002",
    ],
  );
  assert.equal(requestedUrls.some((value) => value.includes("/rest/v1/")), false);
  assert.equal(requestedUrls.some((value) => value.includes("/storage/v1/")), false);
});

test("admin vendor mutations invalidate public discovery caches", async () => {
  const mutationCases = [
    {
      reason: "vendor_created",
      vendorId,
      run: (fetchImpl: typeof fetch) =>
        createAdminVendor(
          {
            name: "Test Vendor",
            slug: "test-vendor",
            category_slug: "rice",
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
          { fetchImpl },
        ),
      response: { vendor: createAdminVendorSummary() },
    },
    {
      reason: "vendor_updated",
      vendorId,
      run: (fetchImpl: typeof fetch) =>
        updateAdminVendor(vendorId, { short_description: "Updated description" }, { fetchImpl }),
      response: { vendor: createAdminVendorSummary({ short_description: "Updated description" }) },
    },
    {
      reason: "vendor_deactivated",
      vendorId,
      run: (fetchImpl: typeof fetch) => deactivateAdminVendor(vendorId, { fetchImpl }),
      response: { vendor: { vendor_id: vendorId, is_active: false } },
    },
    {
      reason: "vendor_hours_updated",
      vendorId,
      run: (fetchImpl: typeof fetch) =>
        replaceAdminVendorHours(
          vendorId,
          {
            hours: [
              {
                day_of_week: 1,
                open_time: "10:00:00",
                close_time: "19:00:00",
                is_closed: false,
              },
            ],
          },
          { fetchImpl },
        ),
      response: {
        hours: [
          {
            id: "50000000-0000-4000-8000-000000000001",
            vendor_id: vendorId,
            day_of_week: 1,
            open_time: "10:00:00",
            close_time: "19:00:00",
            is_closed: false,
          },
        ],
      },
    },
    {
      reason: "vendor_dishes_updated",
      vendorId,
      run: (fetchImpl: typeof fetch) =>
        createAdminVendorDishes(
          vendorId,
          {
            dishes: [
              {
                dish_name: "Jollof rice",
                description: "Test dish",
                image_url: null,
                is_featured: true,
              },
            ],
          },
          { fetchImpl },
        ),
      response: {
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
    },
    {
      reason: "vendor_dishes_updated",
      vendorId,
      run: (fetchImpl: typeof fetch) =>
        deleteAdminVendorDish(vendorId, "20000000-0000-4000-8000-000000000001", { fetchImpl }),
      response: {
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
    },
    {
      reason: "vendor_images_updated",
      vendorId,
      run: (fetchImpl: typeof fetch) =>
        deleteAdminVendorImage(vendorId, "10000000-0000-4000-8000-000000000001", { fetchImpl }),
      response: {
        image: {
          id: "10000000-0000-4000-8000-000000000001",
          vendor_id: vendorId,
          image_url: "https://example.supabase.co/storage/v1/object/public/vendor-images/vendor/image.jpg",
          storage_object_path: "vendor/image.jpg",
          sort_order: 2,
        },
      },
    },
    {
      reason: "vendor_created",
      vendorId: null,
      run: (fetchImpl: typeof fetch) =>
        submitAdminVendorIntake(
          {
            action: "upload",
            rows: [{ row_number: 2, vendor_name: "Mama Put Rice" }],
          },
          { fetchImpl },
        ),
      response: {
        totalRows: 1,
        rows: [],
        validRows: [],
        invalidRows: [],
        uploadedRows: [
          {
            rowNumber: 2,
            vendor: {
              id: vendorId,
              name: "Mama Put Rice",
              slug: "mama-put-rice",
            },
          },
        ],
        failedRows: [],
        successCount: 1,
        failedCount: 0,
        errors: [],
      },
    },
  ];

  for (const mutationCase of mutationCases) {
    await withDiscoveryInvalidationStorage(async (storage) => {
      const fetchImpl = (async () =>
        Response.json({
          success: true,
          data: mutationCase.response,
          error: null,
        })) as typeof fetch;

      await mutationCase.run(fetchImpl);
      assertDiscoveryInvalidation(storage, mutationCase.reason, mutationCase.vendorId);
    });
  }
});

test("admin API client uploads images through the app route with multipart form data", async () => {
  const requestedUrls: string[] = [];
  const requestedHeaders: Headers[] = [];
  const requestedBodies: Array<BodyInit | null | undefined> = [];

  const formData = new FormData();
  formData.set(
    "image",
    new File([Uint8Array.from([1, 2, 3])], "image.jpg", { type: "image/jpeg" }),
  );
  formData.set("sort_order", "2");

  await withDiscoveryInvalidationStorage(async (storage) => {
    const images = await createAdminVendorImages(vendorId, formData, {
      fetchImpl: (async (input: URL | RequestInfo, init?: RequestInit) => {
        requestedUrls.push(String(input));
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
      }) as typeof fetch,
    });

    assert.equal(images[0]?.storage_object_path, "vendor/image.jpg");
    assert.equal(
      new URL(requestedUrls[0], "http://localhost").pathname,
      `/api/admin/vendors/${vendorId}/images`,
    );
    assert.equal(requestedHeaders[0]?.get("authorization"), null);
    assert.notEqual(typeof requestedBodies[0], "string");
    assertDiscoveryInvalidation(storage, "vendor_images_updated", vendorId);
  });
});

test("admin API client surfaces readable image validation failures", async () => {
  const formData = new FormData();
  formData.set(
    "image",
    new File([Uint8Array.from([1, 2, 3])], "image.gif", { type: "image/gif" }),
  );

  await assert.rejects(
    () => createAdminVendorImages(vendorId, formData),
    (error) =>
      error instanceof AdminApiError &&
      error.code === "VALIDATION_ERROR" &&
      error.message === "Only JPEG, PNG, and WebP images are allowed.",
  );
});

test("admin API client uses backend analytics and audit-log routes only", async () => {
  const requestedUrls: string[] = [];

  const fetchImpl = (async (input: URL | RequestInfo) => {
    requestedUrls.push(String(input));
    const url = new URL(String(input), "http://localhost");

    if (url.pathname === "/api/admin/analytics") {
      return Response.json({
        success: true,
        data: {
          range: "30d",
          summary: {
            total_sessions: 1,
            total_events: 2,
            vendor_selections: 1,
            vendor_detail_opens: 0,
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
          rider_metrics: {
            total: 0,
            verified: 0,
            pending: 0,
            rejected: 0,
            visible: 0,
            hidden: 0,
            suspended: 0,
          },
          recent_events: [],
        },
        error: null,
      });
    }

    if (url.pathname === "/api/admin/logs") {
      return Response.json({
        success: true,
        data: {
          operationalEvents: [
            {
              id: "71000000-0000-4000-8000-000000000001",
              created_at: "2026-05-08T10:00:00.000Z",
              level: "error",
              area: "db",
              event: "OPERATIONAL_EVENT_PERSIST_FAILED",
              message: "Operational event persistence failed.",
              route: "/api/admin/session",
              method: "GET",
              status: 500,
              duration_ms: 12,
              request_id: "req_logs_1",
              actor_role: null,
              actor_id: null,
              vendor_id: null,
              vendor_slug: null,
              environment: "staging",
              metadata: {},
            },
          ],
          pagination: {
            limit: 25,
            has_more: false,
            next_cursor: null,
          },
        },
        error: null,
      });
    }

    return Response.json({
      success: true,
      data: {
        auditLogs: [
          {
            id: "30000000-0000-4000-8000-000000000001",
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
          has_more: false,
          next_cursor: null,
        },
      },
      error: null,
    });
  }) as typeof fetch;

  const analytics = await fetchAdminAnalytics({ range: "30d" }, { fetchImpl });
  const auditLogs = await fetchAdminAuditLogs({ limit: 10 }, { fetchImpl });
  const operationalLogs = await fetchAdminOperationalLogs({ limit: 25 }, { fetchImpl });

  assert.equal(analytics.error, null);
  assert.equal(auditLogs.error, null);
  assert.equal(operationalLogs.error, null);
  assert.equal(new URL(requestedUrls[0], "http://localhost").pathname, "/api/admin/analytics");
  assert.equal(new URL(requestedUrls[1], "http://localhost").pathname, "/api/admin/audit-logs");
  assert.equal(new URL(requestedUrls[2], "http://localhost").pathname, "/api/admin/logs");
  assert.equal(requestedUrls.some((value) => value.includes("/rest/v1/")), false);
});

test("admin API client returns safe analytics and audit-log errors", async () => {
  const analyticsResult = await fetchAdminAnalytics(
    { range: "7d" },
    {
      fetchImpl: (async () =>
        Response.json(
          {
            success: false,
            data: null,
            error: {
              code: "FORBIDDEN",
              message: "You do not have access to analytics",
            },
          },
          { status: 403 },
        )) as typeof fetch,
    },
  );

  const auditResult = await fetchAdminAuditLogs(
    { limit: 10 },
    {
      fetchImpl: (async () =>
        Response.json(
          {
            success: false,
            data: null,
            error: {
              code: "FORBIDDEN",
              message: "You do not have access to analytics",
            },
          },
          { status: 403 },
        )) as typeof fetch,
    },
  );
  const logsResult = await fetchAdminOperationalLogs(
    { limit: 25 },
    {
      fetchImpl: (async () =>
        Response.json(
          {
            success: false,
            data: null,
            error: {
              code: "FORBIDDEN",
              message: "You do not have access to logs",
            },
          },
          { status: 403 },
        )) as typeof fetch,
    },
  );

  assert.equal(analyticsResult.data, null);
  assert.equal(analyticsResult.error?.code, "FORBIDDEN");
  assert.equal(auditResult.data, null);
  assert.equal(auditResult.error?.code, "FORBIDDEN");
  assert.equal(logsResult.data, null);
  assert.equal(logsResult.error?.code, "FORBIDDEN");
});

test("admin API client can list vendor subresources", async () => {
  const hours = await listAdminVendorHours(vendorId, {
    fetchImpl: (async () =>
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
      })) as typeof fetch,
  });

  const images = await listAdminVendorImages(vendorId, {
    fetchImpl: (async () =>
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
      })) as typeof fetch,
  });

  const dishes = await listAdminVendorDishes(vendorId, {
    fetchImpl: (async () =>
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
      })) as typeof fetch,
  });

  assert.equal(hours[0]?.day_of_week, 1);
  assert.equal(images[0]?.storage_object_path, "vendor/image.jpg");
  assert.equal(dishes[0]?.dish_name, "Jollof rice");
});

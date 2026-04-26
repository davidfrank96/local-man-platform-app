import assert from "node:assert/strict";
import test from "node:test";
import { GET as analyticsRoute } from "../app/api/admin/analytics/route.ts";

const vendorId = "00000000-0000-4000-8000-000000000001";

function setAdminEnv(): () => void {
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

function createAdminNextRequest(url: string): Parameters<typeof analyticsRoute>[0] {
  const request = new Request(url, {
    headers: {
      authorization: "Bearer admin-token",
    },
  }) as Request & { nextUrl: URL };
  request.nextUrl = new URL(url);

  return request as unknown as Parameters<typeof analyticsRoute>[0];
}

function createAnalyticsFetchMock(options?: {
  isAdmin?: boolean;
  events?: unknown[];
  vendors?: unknown[];
}): typeof fetch {
  const {
    isAdmin = true,
    events = [],
    vendors = [],
  } = options ?? {};

  return (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/auth/v1/user") {
      return Response.json({
        id: "admin-id",
        email: "admin@example.com",
      });
    }

    if (url.pathname === "/rest/v1/admin_users") {
      return Response.json(
        isAdmin
          ? [
              {
                id: "admin-id",
                email: "admin@example.com",
                full_name: "Admin User",
                role: "admin",
              },
            ]
          : [],
      );
    }

    if (url.pathname === "/rest/v1/user_events") {
      return Response.json(events);
    }

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json(vendors);
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;
}

test("admin analytics route aggregates summary and vendor metrics", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createAnalyticsFetchMock({
    events: [
      {
        id: "10000000-0000-4000-8000-000000000001",
        event_type: "session_started",
        vendor_id: null,
        vendor_slug: null,
        page_path: "/",
        device_type: "mobile",
        location_source: "precise",
        timestamp: "2026-04-26T10:00:00.000Z",
        session_id: "90000000-0000-4000-8000-000000000001",
      },
      {
        id: "10000000-0000-4000-8000-000000000002",
        event_type: "search_used",
        vendor_id: null,
        vendor_slug: null,
        page_path: "/",
        device_type: "mobile",
        location_source: "precise",
        timestamp: "2026-04-26T10:01:00.000Z",
        session_id: "90000000-0000-4000-8000-000000000001",
      },
      {
        id: "10000000-0000-4000-8000-000000000003",
        event_type: "vendor_selected",
        vendor_id: vendorId,
        vendor_slug: "test-vendor",
        page_path: "/",
        device_type: "mobile",
        location_source: "precise",
        timestamp: "2026-04-26T10:02:00.000Z",
        session_id: "90000000-0000-4000-8000-000000000001",
      },
      {
        id: "10000000-0000-4000-8000-000000000004",
        event_type: "vendor_detail_opened",
        vendor_id: vendorId,
        vendor_slug: "test-vendor",
        page_path: "/vendors/test-vendor",
        device_type: "mobile",
        location_source: "precise",
        timestamp: "2026-04-26T10:03:00.000Z",
        session_id: "90000000-0000-4000-8000-000000000001",
      },
      {
        id: "10000000-0000-4000-8000-000000000005",
        event_type: "filter_applied",
        vendor_id: null,
        vendor_slug: null,
        page_path: "/",
        device_type: "desktop",
        location_source: "default_city",
        timestamp: "2026-04-26T10:04:00.000Z",
        session_id: "90000000-0000-4000-8000-000000000002",
      },
      {
        id: "10000000-0000-4000-8000-000000000006",
        event_type: "filters_applied",
        vendor_id: null,
        vendor_slug: null,
        page_path: "/",
        device_type: "desktop",
        location_source: null,
        timestamp: "2026-04-26T10:05:00.000Z",
        session_id: "90000000-0000-4000-8000-000000000002",
      },
      {
        id: "10000000-0000-4000-8000-000000000007",
        event_type: "vendor_detail_opened",
        vendor_id: vendorId,
        vendor_slug: "test-vendor",
        page_path: "/vendors/test-vendor",
        device_type: "desktop",
        location_source: null,
        timestamp: "2026-04-26T10:06:00.000Z",
        session_id: "90000000-0000-4000-8000-000000000002",
      },
    ],
    vendors: [
      {
        id: vendorId,
        name: "Test Vendor",
        slug: "test-vendor",
      },
    ],
  });

  try {
    const response = await analyticsRoute(
      createAdminNextRequest("http://localhost/api/admin/analytics?range=7d"),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.summary.total_sessions, 2);
    assert.equal(body.data.summary.total_events, 7);
    assert.equal(body.data.summary.vendor_selections, 1);
    assert.equal(body.data.summary.vendor_detail_opens, 2);
    assert.equal(body.data.summary.searches_used, 1);
    assert.equal(body.data.summary.filters_applied, 2);
    assert.equal(
      body.data.vendor_performance.most_selected_vendors[0].vendor_name,
      "Test Vendor",
    );
    assert.equal(
      body.data.dropoff.sessions_with_search_without_vendor_click,
      0,
    );
    assert.equal(
      body.data.dropoff.sessions_with_detail_without_action,
      2,
    );
    assert.equal(body.data.recent_events[0].vendor_name, "Test Vendor");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin analytics route blocks non-admin access", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createAnalyticsFetchMock({ isAdmin: false });

  try {
    const response = await analyticsRoute(
      createAdminNextRequest("http://localhost/api/admin/analytics?range=7d"),
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "FORBIDDEN");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin analytics route returns safe empty analytics payload", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createAnalyticsFetchMock({
    events: [],
    vendors: [],
  });

  try {
    const response = await analyticsRoute(
      createAdminNextRequest("http://localhost/api/admin/analytics?range=24h"),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.range, "24h");
    assert.equal(body.data.summary.total_events, 0);
    assert.equal(body.data.vendor_performance.most_selected_vendors.length, 0);
    assert.equal(body.data.dropoff.session_metrics_available, false);
    assert.equal(body.data.recent_events.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

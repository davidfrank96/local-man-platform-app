import assert from "node:assert/strict";
import test from "node:test";
import { GET as listOperationalLogsRoute } from "../app/api/admin/logs/route.ts";
import { clearOperationalLogsReadCache } from "../lib/admin/operational-log-service.ts";

function setAdminEnv(): () => void {
  clearOperationalLogsReadCache();
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

function createFetchMock(
  calls: string[],
  options?: { role?: "admin" | "agent"; operationalEvents?: unknown[] },
): typeof fetch {
  const role = options?.role ?? "admin";
  const actorId = role === "admin"
    ? "00000000-0000-4000-8000-000000000111"
    : "00000000-0000-4000-8000-000000000112";
  const operationalEvents = options?.operationalEvents ?? [
    {
      id: "70000000-0000-4000-8000-000000000001",
      created_at: "2026-05-08T12:00:00.000Z",
      level: "error",
      area: "public_discovery",
      event: "PUBLIC_NEARBY_ROUTE_FAILED",
      message: "Nearby route fell back to a degraded empty response.",
      route: "/api/vendors/nearby",
      method: "GET",
      status: 200,
      duration_ms: 63,
      request_id: "req_test123",
      actor_role: null,
      actor_id: null,
      vendor_id: null,
      vendor_slug: null,
      environment: "staging",
      metadata: {
        degraded: true,
        cookie: "should-not-render",
        nested: {
          token: "secret-token",
        },
        stack: "top secret stack",
        html: "<img src=x onerror=alert(1)>",
      },
    },
  ];

  return (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url.pathname}`);

    if (url.pathname === "/auth/v1/user") {
      return Response.json({
        id: actorId,
        email: role === "admin" ? "admin@example.com" : "agent@example.com",
      });
    }

    if (url.pathname === "/rest/v1/admin_users") {
      return Response.json([
        {
          id: actorId,
          email: role === "admin" ? "admin@example.com" : "agent@example.com",
          full_name: role === "admin" ? "Admin User" : "Agent User",
          role,
          created_at: "2026-04-28T00:00:00.000Z",
        },
      ]);
    }

    if (url.pathname === "/rest/v1/operational_events") {
      return Response.json(operationalEvents);
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;
}

function createNextRequest(url: string, token = "admin-token") {
  const request = new Request(url, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  }) as Request & { nextUrl: URL };
  request.nextUrl = new URL(url);
  return request as unknown as Parameters<typeof listOperationalLogsRoute>[0];
}

test("admin can list operational logs with filters", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const requestedUrls: URL[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    requestedUrls.push(url);
    return createFetchMock(calls)(input, init);
  }) as typeof fetch;

  try {
    const response = await listOperationalLogsRoute(
      createNextRequest(
        "http://localhost/api/admin/logs?limit=25&offset=0&level=error&area=public_discovery&event=PUBLIC_NEARBY&route=%2Fapi%2Fvendors%2Fnearby&since=2026-05-08T08:00:00.000Z",
      ),
    );
    const body = await response.json();
    const logsUrl = requestedUrls.find((url) => url.pathname === "/rest/v1/operational_events");

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.operationalEvents.length, 1);
    assert.equal(logsUrl?.searchParams.get("level"), "eq.error");
    assert.equal(logsUrl?.searchParams.get("area"), "eq.public_discovery");
    assert.equal(logsUrl?.searchParams.get("event"), "ilike.*PUBLIC_NEARBY*");
    assert.equal(logsUrl?.searchParams.get("route"), "ilike.*/api/vendors/nearby*");
    assert.equal(logsUrl?.searchParams.get("created_at"), "gte.2026-05-08T08:00:00.000Z");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/operational_events",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("operational log route sanitizes metadata before returning it", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls);

  try {
    const response = await listOperationalLogsRoute(
      createNextRequest("http://localhost/api/admin/logs"),
    );
    const body = await response.json();
    const metadata = body.data.operationalEvents[0].metadata;

    assert.equal(response.status, 200);
    assert.equal(metadata.cookie, "[REDACTED]");
    assert.equal(metadata.stack, "[REDACTED]");
    assert.equal(metadata.nested.token, "[REDACTED]");
    assert.equal(metadata.html, "<img src=x onerror=alert(1)>");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("invalid operational log filters return 400 before Supabase read", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls);

  try {
    const response = await listOperationalLogsRoute(
      createNextRequest("http://localhost/api/admin/logs?level=trace"),
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("operational log route returns next_cursor when more pages are available", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const operationalEvents = Array.from({ length: 26 }, (_, index) => ({
    id: `70000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    created_at: "2026-05-08T12:00:00.000Z",
    level: "warn",
    area: "analytics",
    event: "PUBLIC_NEARBY_SLOW",
    message: "Nearby request was slow.",
    route: "/api/vendors/nearby",
    method: "GET",
    status: 200,
    duration_ms: 712,
    request_id: `req_${index + 1}`,
    actor_role: null,
    actor_id: null,
    vendor_id: null,
    vendor_slug: null,
    environment: "staging",
    metadata: {},
  }));
  globalThis.fetch = createFetchMock(calls, { operationalEvents });

  try {
    const response = await listOperationalLogsRoute(
      createNextRequest("http://localhost/api/admin/logs?limit=25&offset=0"),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.operationalEvents.length, 25);
    assert.equal(body.data.pagination.has_more, true);
    assert.equal(body.data.pagination.next_cursor, "25");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("empty operational log results stay successful and serializable", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { operationalEvents: [] });

  try {
    const response = await listOperationalLogsRoute(
      createNextRequest("http://localhost/api/admin/logs?limit=25&offset=0"),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data.operationalEvents, []);
    assert.equal(body.data.pagination.has_more, false);
    assert.equal(body.data.pagination.next_cursor, null);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("agent cannot access operational logs", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await listOperationalLogsRoute(
      createNextRequest("http://localhost/api/admin/logs", "agent-token"),
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error.code, "FORBIDDEN");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

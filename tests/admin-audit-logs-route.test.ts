import assert from "node:assert/strict";
import test from "node:test";
import { GET as listAuditLogsRoute } from "../app/api/admin/audit-logs/route.ts";

function setAdminEnv(): () => void {
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
  options?: { role?: "admin" | "agent" },
): typeof fetch {
  const role = options?.role ?? "admin";
  const actorId = role === "admin"
    ? "00000000-0000-4000-8000-000000000111"
    : "00000000-0000-4000-8000-000000000112";

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

    if (url.pathname === "/rest/v1/audit_logs") {
      return Response.json([
        {
          id: "00000000-0000-4000-8000-000000000301",
          admin_user_id: actorId,
          user_role: "admin",
          entity_type: "vendor",
          entity_id: "00000000-0000-4000-8000-000000000401",
          action: "CREATE_VENDOR",
          metadata: {
            actor_label: "Admin User",
            target_name: "Mama Put Rice",
          },
          created_at: "2026-04-28T12:00:00.000Z",
          admin_user: {
            id: actorId,
            email: "admin@example.com",
            full_name: "Admin User",
            role: "admin",
          },
        },
      ]);
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
  return request as unknown as Parameters<typeof listAuditLogsRoute>[0];
}

test("admin can list audit logs with filters", async () => {
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
    const response = await listAuditLogsRoute(
      createNextRequest(
        "http://localhost/api/admin/audit-logs?limit=10&offset=0&user_role=agent&action=CREATE_VENDOR",
      ),
    );
    const body = await response.json();
    const auditUrl = requestedUrls.find((url) => url.pathname === "/rest/v1/audit_logs");

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.auditLogs.length, 1);
    assert.equal(body.data.pagination.has_more, false);
    assert.equal(auditUrl?.searchParams.get("user_role"), "eq.agent");
    assert.equal(auditUrl?.searchParams.get("action"), "eq.CREATE_VENDOR");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin can list audit logs without filters and pagination is forwarded", async () => {
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
    const response = await listAuditLogsRoute(
      createNextRequest("http://localhost/api/admin/audit-logs?limit=25&offset=30"),
    );
    const body = await response.json();
    const auditUrl = requestedUrls.find((url) => url.pathname === "/rest/v1/audit_logs");

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(auditUrl?.searchParams.get("limit"), "21");
    assert.equal(auditUrl?.searchParams.get("offset"), "30");
    assert.equal(auditUrl?.searchParams.get("user_role"), null);
    assert.equal(auditUrl?.searchParams.get("action"), null);
    assert.equal(
      auditUrl?.searchParams.get("select"),
      "id,admin_user_id,user_role,entity_type,entity_id,action,metadata,created_at",
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("timed out audit log fetch returns structured 504 error", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/auth/v1/user") {
      return Response.json({
        id: "00000000-0000-4000-8000-000000000111",
        email: "admin@example.com",
      });
    }

    if (url.pathname === "/rest/v1/admin_users") {
      return Response.json([
        {
          id: "00000000-0000-4000-8000-000000000111",
          email: "admin@example.com",
          full_name: "Admin User",
          role: "admin",
          created_at: "2026-04-28T00:00:00.000Z",
        },
      ]);
    }

    if (url.pathname === "/rest/v1/audit_logs") {
      const signal = init?.signal;

      await new Promise((_, reject) => {
        signal?.addEventListener(
          "abort",
          () => {
            const error = new Error("The operation was aborted.");
            error.name = "AbortError";
            reject(error);
          },
          { once: true },
        );
      });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await listAuditLogsRoute(
      createNextRequest("http://localhost/api/admin/audit-logs?offset=91"),
    );
    const body = await response.json();

    assert.equal(response.status, 504);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "NETWORK_ERROR");
    assert.equal(body.error.detail, "Activity temporarily unavailable.");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("invalid audit log filters return 400 before Supabase audit log read", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls);

  try {
    const response = await listAuditLogsRoute(
      createNextRequest("http://localhost/api/admin/audit-logs?user_role=owner"),
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

test("agent cannot access audit logs", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await listAuditLogsRoute(
      createNextRequest("http://localhost/api/admin/audit-logs", "agent-token"),
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

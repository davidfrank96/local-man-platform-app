import assert from "node:assert/strict";
import test from "node:test";
import { GET as getAdminSession } from "../app/api/admin/session/route.ts";
import { POST as loginAdmin } from "../app/api/admin/login/route.ts";
import { POST as logoutAdmin } from "../app/api/admin/logout/route.ts";
import {
  ADMIN_LOGIN_RATE_LIMIT,
  resetAbuseProtectionStateForTests,
} from "../lib/api/abuse-protection.ts";
import {
  flushOperationalEventWritesForTests,
  resetOperationalEventPersistenceForTests,
} from "../lib/observability.ts";

const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

test.beforeEach(() => {
  resetAbuseProtectionStateForTests();
  resetOperationalEventPersistenceForTests();
});

test.after(() => {
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
});

test("admin login route sets httpOnly session cookies after a valid login", async () => {
  const originalFetch = globalThis.fetch;

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: (async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = input instanceof URL ? input : new URL(String(input));

      if (url.pathname === "/auth/v1/token") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        assert.equal(body.email, "admin@example.com");
        assert.equal(body.password, "secret");

        return Response.json({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          user: {
            id: "admin-id",
            email: "admin@example.com",
          },
        });
      }

      if (url.pathname === "/auth/v1/user") {
        return Response.json({
          id: "admin-id",
          email: "admin@example.com",
        });
      }

      if (url.pathname === "/rest/v1/admin_users") {
        return Response.json([
          {
            id: "admin-id",
            email: "admin@example.com",
            full_name: "Admin User",
            role: "admin",
          },
        ]);
      }

      throw new Error(`Unexpected fetch: ${url.pathname}`);
    }) as typeof fetch,
  });

  try {
    const response = await loginAdmin(new Request("http://localhost/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@example.com",
        password: "secret",
      }),
      headers: {
        "content-type": "application/json",
      },
    }));

    const payload = await response.json();
    const setCookies = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];

    assert.equal(response.status, 200);
    assert.equal(payload.data.adminUser.role, "admin");
    assert.equal(setCookies.some((value) => value.includes("localman_admin_access=")), true);
    assert.equal(setCookies.some((value) => value.includes("HttpOnly")), true);
    assert.equal(setCookies.some((value) => value.includes("SameSite=Lax")), true);
  } finally {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: originalFetch,
    });
  }
});

test("admin login route denies authenticated users without an explicit admin_users row", async () => {
  const originalFetch = globalThis.fetch;

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: (async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = input instanceof URL ? input : new URL(String(input));

      if (url.pathname === "/auth/v1/token") {
        return Response.json({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          user: {
            id: "auth-only-id",
            email: "auth-only@example.com",
          },
        });
      }

      if (url.pathname === "/auth/v1/user") {
        return Response.json({
          id: "auth-only-id",
          email: "auth-only@example.com",
        });
      }

      if (url.pathname === "/rest/v1/admin_users") {
        return Response.json([]);
      }

      throw new Error(`Unexpected fetch: ${url.pathname} (${init?.method ?? "GET"})`);
    }) as typeof fetch,
  });

  try {
    const response = await loginAdmin(new Request("http://localhost/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email: "auth-only@example.com",
        password: "secret",
      }),
      headers: {
        "content-type": "application/json",
      },
    }));

    const payload = await response.json();
    const setCookies = response.headers.getSetCookie?.() ?? [];

    assert.equal(response.status, 403);
    assert.equal(payload.error.code, "FORBIDDEN");
    assert.equal(payload.error.details, undefined);
    assert.equal(setCookies.length, 0);
  } finally {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: originalFetch,
    });
  }
});

test("admin login route rate limits repeated invalid credential attempts", async () => {
  const originalFetch = globalThis.fetch;
  let tokenAttempts = 0;

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: (async (input: URL | RequestInfo) => {
      const url = input instanceof URL ? input : new URL(String(input));

      if (url.pathname === "/auth/v1/token") {
        tokenAttempts += 1;
        return Response.json(
          {
            error: "invalid_grant",
            error_description: "Invalid login credentials",
          },
          { status: 400 },
        );
      }

      throw new Error(`Unexpected fetch: ${url.pathname}`);
    }) as typeof fetch,
  });

  try {
    let lastResponse: Response | null = null;

    for (let index = 0; index <= ADMIN_LOGIN_RATE_LIMIT.maxRequests; index += 1) {
      lastResponse = await loginAdmin(new Request("http://localhost/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@example.com",
          password: "wrong-secret",
        }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.40",
        },
      }));
    }

    assert.ok(lastResponse);
    const payload = await lastResponse!.json();

    assert.equal(lastResponse!.status, 429);
    assert.equal(payload.error.code, "TOO_MANY_REQUESTS");
    assert.equal(tokenAttempts, ADMIN_LOGIN_RATE_LIMIT.maxRequests);
  } finally {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: originalFetch,
    });
  }
});

test("admin session route logs validation failures without exposing sensitive state", async () => {
  const warnCalls: Array<Record<string, unknown>> = [];
  const originalWarn = console.warn;

  console.warn = ((record: unknown) => {
    if (record && typeof record === "object" && !Array.isArray(record)) {
      warnCalls.push(record as Record<string, unknown>);
    }
  }) as typeof console.warn;

  try {
    const response = await getAdminSession(
      new Request("http://localhost/api/admin/session"),
    );
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.error.code, "UNAUTHORIZED");

    const failureLog = warnCalls.find((record) => record.event === "ADMIN_SESSION_VALIDATION_FAILED");

    assert.ok(failureLog);
    assert.equal(failureLog?.route, "/api/admin/session");
    assert.equal(failureLog?.status, 401);
    assert.equal("cookie" in (failureLog ?? {}), false);
    assert.equal("authorization" in (failureLog ?? {}), false);
  } finally {
    console.warn = originalWarn;
  }
});

test("admin session route still responds when operational event persistence fails", async () => {
  const previousEnabled = process.env.LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE;
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const errorCalls: Array<Record<string, unknown>> = [];

  process.env.LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE = "true";
  console.error = ((record: unknown) => {
    if (record && typeof record === "object" && !Array.isArray(record)) {
      errorCalls.push(record as Record<string, unknown>);
    }
  }) as typeof console.error;
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: (async (input: URL | RequestInfo) => {
      const url = input instanceof URL ? input : new URL(String(input));

      if (url.pathname === "/rest/v1/operational_events") {
        return Response.json({ message: "insert failed" }, { status: 500 });
      }

      throw new Error(`Unexpected fetch: ${url.pathname}`);
    }) as typeof fetch,
  });

  try {
    const response = await getAdminSession(
      new Request("http://localhost/api/admin/session"),
    );
    const payload = await response.json();

    await flushOperationalEventWritesForTests();

    assert.equal(response.status, 401);
    assert.equal(payload.error.code, "UNAUTHORIZED");
    assert.ok(
      errorCalls.some((record) => record.event === "OPERATIONAL_EVENT_PERSIST_FAILED"),
    );
  } finally {
    if (previousEnabled === undefined) {
      delete process.env.LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE;
    } else {
      process.env.LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE = previousEnabled;
    }
    console.error = originalError;
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: originalFetch,
    });
  }
});

test("admin session route can refresh a cookie-backed session server-side", async () => {
  const originalFetch = globalThis.fetch;

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: (async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = input instanceof URL ? input : new URL(String(input));

      if (url.pathname === "/auth/v1/token") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        assert.equal(body.refresh_token, "refresh-cookie");

        return Response.json({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
          user: {
            id: "agent-id",
            email: "agent@example.com",
          },
        });
      }

      if (url.pathname === "/auth/v1/user") {
        assert.equal(new Headers(init?.headers).get("authorization"), "Bearer new-access-token");
        return Response.json({
          id: "agent-id",
          email: "agent@example.com",
        });
      }

      if (url.pathname === "/rest/v1/admin_users") {
        return Response.json([
          {
            id: "agent-id",
            email: "agent@example.com",
            full_name: "Agent User",
            role: "agent",
          },
        ]);
      }

      throw new Error(`Unexpected fetch: ${url.pathname}`);
    }) as typeof fetch,
  });

  try {
    const response = await getAdminSession(new Request("http://localhost/api/admin/session", {
      headers: {
        cookie: "localman_admin_refresh=refresh-cookie",
      },
    }));

    const payload = await response.json();
    const setCookies = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];

    assert.equal(response.status, 200);
    assert.equal(payload.data.adminUser.role, "agent");
    assert.equal(setCookies.some((value) => value.includes("localman_admin_access=new-access-token")), true);
    assert.equal(setCookies.some((value) => value.includes("localman_admin_refresh=new-refresh-token")), true);
  } finally {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: originalFetch,
    });
  }
});

test("admin session route clears cookies when admin_users membership has been removed", async () => {
  const originalFetch = globalThis.fetch;

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: (async (input: URL | RequestInfo) => {
      const url = input instanceof URL ? input : new URL(String(input));

      if (url.pathname === "/auth/v1/user") {
        return Response.json({
          id: "removed-user-id",
          email: "removed@example.com",
        });
      }

      if (url.pathname === "/rest/v1/admin_users") {
        return Response.json([]);
      }

      throw new Error(`Unexpected fetch: ${url.pathname}`);
    }) as typeof fetch,
  });

  try {
    const response = await getAdminSession(new Request("http://localhost/api/admin/session", {
      headers: {
        cookie: "localman_admin_access=stale-access-token",
      },
    }));

    const payload = await response.json();
    const setCookies = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];

    assert.equal(response.status, 403);
    assert.equal(payload.error.code, "FORBIDDEN");
    assert.equal(payload.error.details, undefined);
    assert.equal(setCookies.some((value) => value.includes("localman_admin_access=") && value.includes("Max-Age=0")), true);
    assert.equal(setCookies.some((value) => value.includes("localman_admin_refresh=") && value.includes("Max-Age=0")), true);
  } finally {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: originalFetch,
    });
  }
});

test("admin logout route clears session cookies", async () => {
  const originalFetch = globalThis.fetch;
  let logoutCalled = false;

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: (async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = input instanceof URL ? input : new URL(String(input));
      if (url.pathname === "/auth/v1/logout") {
        logoutCalled = true;
        assert.equal(new Headers(init?.headers).get("authorization"), "Bearer access-cookie");
        return Response.json({});
      }

      throw new Error(`Unexpected fetch: ${url.pathname}`);
    }) as typeof fetch,
  });

  try {
    const response = await logoutAdmin(new Request("http://localhost/api/admin/logout", {
      method: "POST",
      headers: {
        cookie: "localman_admin_access=access-cookie",
      },
    }));
    const setCookies = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];

    assert.equal(response.status, 200);
    assert.equal(logoutCalled, true);
    assert.equal(setCookies.some((value) => value.includes("localman_admin_access=") && value.includes("Max-Age=0")), true);
    assert.equal(setCookies.some((value) => value.includes("localman_admin_refresh=") && value.includes("Max-Age=0")), true);
  } finally {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: originalFetch,
    });
  }
});

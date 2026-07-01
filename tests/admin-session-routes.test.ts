import assert from "node:assert/strict";
import test from "node:test";
import { GET as getAdminSession } from "../app/api/admin/session/route.ts";
import { POST as loginAdmin } from "../app/api/admin/login/route.ts";
import { POST as logoutAdmin } from "../app/api/admin/logout/route.ts";
import { DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG } from "../lib/admin/login-protection.ts";
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

type AdminLoginSecurityEventRow = Record<string, unknown> & {
  created_at: string;
};

type AdminSessionRow = Record<string, unknown> & {
  id: string;
  created_at: string;
  login_at: string;
  last_activity_at: string;
  expires_at: string;
  status: string;
};

function createAdminLoginProtectionFetchHandler() {
  const rows: AdminLoginSecurityEventRow[] = [];

  return {
    rows,
    handle(input: URL | RequestInfo, init?: RequestInit): Response | null {
      const url = input instanceof URL ? input : new URL(String(input));

      if (url.pathname !== "/rest/v1/admin_login_security_events") {
        return null;
      }

      const method = (init?.method ?? "GET").toUpperCase();

      if (method === "GET") {
        return Response.json(rows);
      }

      if (method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;

        rows.unshift({
          ...body,
          created_at: new Date().toISOString(),
        });
        return new Response(null, { status: 201 });
      }

      throw new Error(`Unexpected login protection method: ${method}`);
    },
  };
}

function createAdminSessionGovernanceFetchHandler() {
  const rows: AdminSessionRow[] = [];

  return {
    rows,
    handle(input: URL | RequestInfo, init?: RequestInit): Response | null {
      const url = input instanceof URL ? input : new URL(String(input));

      if (url.pathname !== "/rest/v1/admin_sessions") {
        return null;
      }

      const method = (init?.method ?? "GET").toUpperCase();

      if (method === "GET") {
        const idFilter = url.searchParams.get("id");
        const filteredRows = idFilter?.startsWith("eq.")
          ? rows.filter((row) => row.id === idFilter.slice(3))
          : rows;

        return Response.json(filteredRows);
      }

      if (method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        const now = new Date().toISOString();

        rows.unshift({
          ...body,
          id: String(body.id),
          created_at: now,
          login_at: String(body.login_at ?? now),
          last_activity_at: String(body.last_activity_at ?? now),
          expires_at: String(body.expires_at ?? new Date(Date.now() + 86_400_000).toISOString()),
          status: String(body.status ?? "active"),
        });
        return Response.json([rows[0]], { status: 201 });
      }

      if (method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        const idFilter = url.searchParams.get("id");
        const statusFilter = url.searchParams.get("status");
        const authUserFilter = url.searchParams.get("auth_user_id");

        for (const row of rows) {
          const idMatches = !idFilter?.startsWith("eq.") || row.id === idFilter.slice(3);
          const statusMatches = !statusFilter?.startsWith("eq.") || row.status === statusFilter.slice(3);
          const authUserMatches = !authUserFilter?.startsWith("eq.") || row.auth_user_id === authUserFilter.slice(3);

          if (idMatches && statusMatches && authUserMatches) {
            Object.assign(row, body);
          }
        }

        return new Response(null, { status: 204 });
      }

      throw new Error(`Unexpected admin session governance method: ${method}`);
    },
  };
}

function withAdminLoginProtectionFetch(
  handler: (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>,
): typeof fetch {
  const loginProtection = createAdminLoginProtectionFetchHandler();
  const sessionGovernance = createAdminSessionGovernanceFetchHandler();

  return (async (input: URL | RequestInfo, init?: RequestInit) => {
    const response = loginProtection.handle(input, init) ?? sessionGovernance.handle(input, init);

    if (response) {
      return response;
    }

    return handler(input, init);
  }) as typeof fetch;
}

function overrideNodeEnvForTest(value: string): () => void {
  const previousDescriptor = Object.getOwnPropertyDescriptor(process.env, "NODE_ENV");

  Object.defineProperty(process.env, "NODE_ENV", {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });

  return () => {
    if (previousDescriptor) {
      Object.defineProperty(process.env, "NODE_ENV", previousDescriptor);
      return;
    }

    Reflect.deleteProperty(process.env, "NODE_ENV");
  };
}

test.beforeEach(() => {
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
    value: withAdminLoginProtectionFetch(async (input: URL | RequestInfo, init?: RequestInit) => {
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
    }),
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
    assert.equal(setCookies.some((value) => value.includes("localman_admin_session=")), true);
    assert.equal(setCookies.some((value) => value.includes("HttpOnly")), true);
    assert.equal(setCookies.some((value) => value.includes("SameSite=Lax")), true);
  } finally {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: originalFetch,
    });
  }
});

test("admin login route accepts same-origin production proxy headers", async () => {
  const originalFetch = globalThis.fetch;
  const restoreNodeEnv = overrideNodeEnvForTest("production");
  const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  process.env.NEXT_PUBLIC_APP_URL = "https://local-man.example";

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: withAdminLoginProtectionFetch(async (input: URL | RequestInfo, init?: RequestInit) => {
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
    }),
  });

  try {
    const response = await loginAdmin(new Request("http://127.0.0.1:8080/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@example.com",
        password: "secret",
      }),
      headers: {
        "content-type": "application/json",
        host: "127.0.0.1:8080",
        origin: "https://local-man.example",
        "x-forwarded-host": "local-man.example",
        "x-forwarded-proto": "https",
      },
    }));

    const payload = await response.json();
    const setCookies = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];

    assert.equal(response.status, 200);
    assert.equal(payload.data.adminUser.role, "admin");
    assert.equal(setCookies.some((value) => value.includes("localman_admin_access=")), true);
    assert.equal(setCookies.some((value) => value.includes("localman_admin_session=")), true);
    assert.equal(setCookies.some((value) => value.includes("HttpOnly")), true);
    assert.equal(setCookies.some((value) => value.includes("SameSite=Lax")), true);
  } finally {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: originalFetch,
    });

    restoreNodeEnv();

    if (previousAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    }
  }
});

test("admin login route denies authenticated users without an explicit admin_users row", async () => {
  const originalFetch = globalThis.fetch;

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: withAdminLoginProtectionFetch(async (input: URL | RequestInfo, init?: RequestInit) => {
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
    }),
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
    value: withAdminLoginProtectionFetch(async (input: URL | RequestInfo) => {
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
    }),
  });

  try {
    let lastResponse: Response | null = null;

    for (let index = 0; index <= DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.account.maxFailures; index += 1) {
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
    assert.equal(tokenAttempts, DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.account.maxFailures);
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
    value: withAdminLoginProtectionFetch(async (input: URL | RequestInfo, init?: RequestInit) => {
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
    }),
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
    assert.equal(setCookies.some((value) => value.includes("localman_admin_session=")), true);
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
    value: withAdminLoginProtectionFetch(async (input: URL | RequestInfo) => {
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
    }),
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
    value: withAdminLoginProtectionFetch(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = input instanceof URL ? input : new URL(String(input));
      if (url.pathname === "/auth/v1/logout") {
        logoutCalled = true;
        assert.equal(new Headers(init?.headers).get("authorization"), "Bearer access-cookie");
        return Response.json({});
      }

      throw new Error(`Unexpected fetch: ${url.pathname}`);
    }),
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
    assert.equal(setCookies.some((value) => value.includes("localman_admin_session=") && value.includes("Max-Age=0")), true);
  } finally {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: originalFetch,
    });
  }
});

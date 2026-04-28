import assert from "node:assert/strict";
import test from "node:test";
import { GET as adminSessionRoute } from "../app/api/admin/session/route.ts";
import {
  getBearerToken,
  requireAdmin,
  requireAdminPermission,
} from "../lib/admin/auth.ts";

const config = {
  supabaseUrl: "https://example.supabase.co",
  supabaseAnonKey: "anon-key",
};

test("extracts bearer tokens from authorization headers", () => {
  const request = new Request("http://localhost/api/admin/vendors", {
    headers: {
      authorization: "Bearer test-token",
    },
  });

  assert.equal(getBearerToken(request), "test-token");
});

test("rejects admin requests without a bearer token", async () => {
  const result = await requireAdmin(
    new Request("http://localhost/api/admin/vendors"),
    {
      config,
      fetchImpl: async () => {
        throw new Error("fetch should not be called without a token");
      },
    },
  );

  assert.equal(result.success, false);

  if (!result.success) {
    assert.equal(result.response.status, 401);
    assert.equal((await result.response.json()).error.code, "UNAUTHORIZED");
  }
});

test("rejects authenticated non-admin users", async () => {
  const result = await requireAdmin(
    new Request("http://localhost/api/admin/vendors", {
      headers: {
        authorization: "Bearer user-token",
      },
    }),
    {
      config,
      fetchImpl: (async (input: URL | RequestInfo) => {
        const url = input instanceof URL ? input : new URL(String(input));

        if (url.pathname === "/auth/v1/user") {
          return Response.json({
            id: "user-id",
            email: "user@example.com",
          });
        }

        return Response.json([]);
      }) as typeof fetch,
    },
  );

  assert.equal(result.success, false);

  if (!result.success) {
    assert.equal(result.response.status, 403);
    assert.equal((await result.response.json()).error.code, "FORBIDDEN");
  }
});

test("accepts authenticated admin users", async () => {
  const result = await requireAdmin(
    new Request("http://localhost/api/admin/vendors", {
      headers: {
        authorization: "Bearer admin-token",
      },
    }),
    {
      config,
      fetchImpl: (async (input: URL | RequestInfo) => {
        const url = input instanceof URL ? input : new URL(String(input));

        if (url.pathname === "/auth/v1/user") {
          return Response.json({
            id: "admin-id",
            email: "admin@example.com",
          });
        }

        return Response.json([
          {
            id: "admin-id",
            email: "admin@example.com",
            full_name: "Admin User",
            role: "admin",
          },
        ]);
      }) as typeof fetch,
    },
  );

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.session.accessToken, "admin-token");
    assert.equal(result.session.user.id, "admin-id");
    assert.equal(result.session.adminUser.role, "admin");
  }
});

test("accepts authenticated agent users for general admin workspace access", async () => {
  const result = await requireAdmin(
    new Request("http://localhost/api/admin/vendors", {
      headers: {
        authorization: "Bearer agent-token",
      },
    }),
    {
      config,
      fetchImpl: (async (input: URL | RequestInfo) => {
        const url = input instanceof URL ? input : new URL(String(input));

        if (url.pathname === "/auth/v1/user") {
          return Response.json({
            id: "agent-id",
            email: "agent@example.com",
          });
        }

        return Response.json([
          {
            id: "agent-id",
            email: "agent@example.com",
            full_name: "Agent User",
            role: "agent",
          },
        ]);
      }) as typeof fetch,
    },
  );

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.session.adminUser.role, "agent");
  }
});

test("auto-creates a default agent admin_users row for authenticated auth-only users", async () => {
  const requests: Array<{
    pathname: string;
    method: string;
    authorization: string | null;
    apikey: string | null;
    body?: unknown;
  }> = [];

  const result = await requireAdmin(
    new Request("http://localhost/api/admin/vendors", {
      headers: {
        authorization: "Bearer fresh-user-token",
      },
    }),
    {
      config: {
        ...config,
        supabaseServiceRoleKey: "service-role-key",
      },
      fetchImpl: (async (input: URL | RequestInfo, init?: RequestInit) => {
        const url = input instanceof URL ? input : new URL(String(input));
        const headers = new Headers(init?.headers);
        const method = init?.method ?? "GET";

        requests.push({
          pathname: url.pathname,
          method,
          authorization: headers.get("authorization"),
          apikey: headers.get("apikey"),
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
        });

        if (url.pathname === "/auth/v1/user") {
          return Response.json({
            id: "fresh-user-id",
            email: "fresh@example.com",
          });
        }

        if (url.pathname === "/rest/v1/admin_users" && method === "GET") {
          return Response.json([]);
        }

        if (url.pathname === "/rest/v1/admin_users" && method === "POST") {
          return Response.json([
            {
              id: "fresh-user-id",
              email: "fresh@example.com",
              full_name: null,
              role: "agent",
            },
          ]);
        }

        throw new Error(`Unexpected request: ${method} ${url.pathname}`);
      }) as typeof fetch,
    },
  );

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.session.adminUser.id, "fresh-user-id");
    assert.equal(result.session.adminUser.email, "fresh@example.com");
    assert.equal(result.session.adminUser.role, "agent");
  }

  assert.deepEqual(requests, [
    {
      pathname: "/auth/v1/user",
      method: "GET",
      authorization: "Bearer fresh-user-token",
      apikey: "anon-key",
      body: undefined,
    },
    {
      pathname: "/rest/v1/admin_users",
      method: "GET",
      authorization: "Bearer service-role-key",
      apikey: "service-role-key",
      body: undefined,
    },
    {
      pathname: "/rest/v1/admin_users",
      method: "POST",
      authorization: "Bearer service-role-key",
      apikey: "service-role-key",
      body: {
        id: "fresh-user-id",
        email: "fresh@example.com",
        full_name: null,
        role: "agent",
      },
    },
  ]);
});

test("blocks agent users from admin-only permissions", async () => {
  const result = await requireAdminPermission(
    new Request("http://localhost/api/admin/analytics", {
      headers: {
        authorization: "Bearer agent-token",
      },
    }),
    "analytics:read",
    {
      config,
      fetchImpl: (async (input: URL | RequestInfo) => {
        const url = input instanceof URL ? input : new URL(String(input));

        if (url.pathname === "/auth/v1/user") {
          return Response.json({
            id: "agent-id",
            email: "agent@example.com",
          });
        }

        return Response.json([
          {
            id: "agent-id",
            email: "agent@example.com",
            full_name: "Agent User",
            role: "agent",
          },
        ]);
      }) as typeof fetch,
    },
  );

  assert.equal(result.success, false);

  if (!result.success) {
    assert.equal(result.response.status, 403);
    assert.equal((await result.response.json()).error.code, "FORBIDDEN");
  }
});

test("uses the service role key for admin membership lookup when configured", async () => {
  const requests: { pathname: string; apikey: string | null; authorization: string | null }[] = [];

  const result = await requireAdmin(
    new Request("http://localhost/api/admin/vendors", {
      headers: {
        authorization: "Bearer admin-token",
      },
    }),
    {
      config: {
        ...config,
        supabaseServiceRoleKey: "service-role-key",
      },
      fetchImpl: (async (input: URL | RequestInfo, init?: RequestInit) => {
        const url = input instanceof URL ? input : new URL(String(input));
        const headers = new Headers(init?.headers);

        requests.push({
          pathname: url.pathname,
          apikey: headers.get("apikey"),
          authorization: headers.get("authorization"),
        });

        if (url.pathname === "/auth/v1/user") {
          return Response.json({
            id: "admin-id",
            email: "admin@example.com",
          });
        }

        return Response.json([
          {
            id: "admin-id",
            email: "admin@example.com",
            full_name: "Admin User",
            role: "admin",
          },
        ]);
      }) as typeof fetch,
    },
  );

  assert.equal(result.success, true);
  assert.deepEqual(requests, [
    {
      pathname: "/auth/v1/user",
      apikey: "anon-key",
      authorization: "Bearer admin-token",
    },
    {
      pathname: "/rest/v1/admin_users",
      apikey: "service-role-key",
      authorization: "Bearer service-role-key",
    },
  ]);
});

test("admin session route returns the authenticated admin identity", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const originalFetch = globalThis.fetch;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/auth/v1/user") {
      return Response.json({
        id: "admin-id",
        email: "admin@example.com",
      });
    }

    return Response.json([
      {
        id: "admin-id",
        email: "admin@example.com",
        full_name: "Admin User",
        role: "admin",
      },
    ]);
  }) as typeof fetch;

  try {
    const response = await adminSessionRoute(
      new Request("http://localhost/api/admin/session", {
        headers: {
          authorization: "Bearer admin-token",
        },
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.user.id, "admin-id");
    assert.equal(body.data.adminUser.role, "admin");
  } finally {
    globalThis.fetch = originalFetch;

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
  }
});

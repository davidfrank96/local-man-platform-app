import assert from "node:assert/strict";
import test from "node:test";
import { GET as adminSessionRoute } from "../app/api/admin/session/route.ts";
import { getBearerToken, requireAdmin } from "../lib/admin/auth.ts";

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

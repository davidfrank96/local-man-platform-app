import assert from "node:assert/strict";
import test from "node:test";
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

import assert from "node:assert/strict";
import test from "node:test";
import { POST as forgotPassword } from "../app/api/admin/password/forgot/route.ts";
import { POST as resetPassword } from "../app/api/admin/password/reset/route.ts";
import { POST as changePassword } from "../app/api/admin/password/change/route.ts";
import {
  validateAdminPassword,
  type AdminPasswordPolicyConfig,
} from "../lib/admin/password-policy.ts";

const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

type AdminSessionRow = Record<string, unknown> & {
  id: string;
  auth_user_id: string;
  admin_user_id: string;
  last_activity_at: string;
  expires_at: string;
  status: string;
};

const strongPassword = "StrongerPass123!";

function createAdminSessionRows(): AdminSessionRow[] {
  return [
    {
      id: "current-session",
      auth_user_id: "admin-id",
      admin_user_id: "admin-id",
      login_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      status: "active",
      revoked_at: null,
      revoked_reason: null,
    },
    {
      id: "other-session",
      auth_user_id: "admin-id",
      admin_user_id: "admin-id",
      login_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      status: "active",
      revoked_at: null,
      revoked_reason: null,
    },
  ];
}

function createAdminSessionGovernanceFetchHandler(rows: AdminSessionRow[]) {
  return (input: URL | RequestInfo, init?: RequestInit): Response | null => {
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

    if (method === "PATCH") {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const idFilter = url.searchParams.get("id");
      const statusFilter = url.searchParams.get("status");
      const authUserFilter = url.searchParams.get("auth_user_id");

      for (const row of rows) {
        const idMatches = !idFilter ||
          idFilter.startsWith("eq.") && row.id === idFilter.slice(3) ||
          idFilter.startsWith("neq.") && row.id !== idFilter.slice(4);
        const statusMatches = !statusFilter?.startsWith("eq.") ||
          row.status === statusFilter.slice(3);
        const authUserMatches = !authUserFilter?.startsWith("eq.") ||
          row.auth_user_id === authUserFilter.slice(3);

        if (idMatches && statusMatches && authUserMatches) {
          Object.assign(row, body);
        }
      }

      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected admin session method: ${method}`);
  };
}

function withFetchMock(fetchImpl: typeof fetch, run: () => Promise<void>): Promise<void> {
  const originalFetch = globalThis.fetch;

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetchImpl,
  });

  return run().finally(() => {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: originalFetch,
    });
  });
}

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

test("admin password policy rejects obvious weak passwords", () => {
  const policy: AdminPasswordPolicyConfig = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
    blockCommonPasswords: true,
  };

  assert.deepEqual(validateAdminPassword("password123", policy).success, false);
  assert.deepEqual(validateAdminPassword("StrongerPass123!", policy).success, true);
});

test("forgot password request returns a generic success response", async () => {
  let recoverRequests = 0;

  await withFetchMock((async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/auth/v1/recover") {
      recoverRequests += 1;
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;

      assert.equal(body.email, "admin@example.com");
      assert.equal(url.searchParams.get("redirect_to"), "http://localhost/admin/reset-password");
      return Response.json({});
    }

    throw new Error(`Unexpected fetch: ${url.pathname}`);
  }) as typeof fetch, async () => {
    const response = await forgotPassword(new Request("http://localhost/api/admin/password/forgot", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@example.com",
      }),
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.match(payload.data.message, /If an admin account exists/);
    assert.equal(recoverRequests, 1);
  });
});

test("forgot password response does not enumerate unknown emails", async () => {
  await withFetchMock((async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/auth/v1/recover") {
      return Response.json({ msg: "User not found" }, { status: 400 });
    }

    throw new Error(`Unexpected fetch: ${url.pathname}`);
  }) as typeof fetch, async () => {
    const response = await forgotPassword(new Request("http://localhost/api/admin/password/forgot", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "missing@example.com",
      }),
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.match(payload.data.message, /If an admin account exists/);
  });
});

test("valid password reset updates Supabase Auth and revokes existing admin sessions", async () => {
  const rows = createAdminSessionRows();
  const handleSessions = createAdminSessionGovernanceFetchHandler(rows);
  let passwordUpdated = false;

  await withFetchMock((async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const sessionResponse = handleSessions(input, init);

    if (sessionResponse) {
      return sessionResponse;
    }

    if (url.pathname === "/auth/v1/user" && (init?.method ?? "GET").toUpperCase() === "GET") {
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer reset-token");
      return Response.json({
        id: "admin-id",
        email: "admin@example.com",
      });
    }

    if (url.pathname === "/auth/v1/user" && init?.method === "PUT") {
      const body = JSON.parse(String(init.body ?? "{}")) as Record<string, unknown>;

      assert.equal(body.password, strongPassword);
      passwordUpdated = true;
      return Response.json({
        id: "admin-id",
        email: "admin@example.com",
      });
    }

    throw new Error(`Unexpected fetch: ${url.pathname} ${init?.method ?? "GET"}`);
  }) as typeof fetch, async () => {
    const response = await resetPassword(new Request("http://localhost/api/admin/password/reset", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        access_token: "reset-token",
        password: strongPassword,
        confirm_password: strongPassword,
      }),
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.equal(passwordUpdated, true);
    assert.equal(rows.every((row) => row.status === "revoked"), true);
    assert.equal(rows.every((row) => row.revoked_reason === "password_reset_completed"), true);
  });
});

test("invalid reset token is rejected before password update", async () => {
  let updateAttempted = false;

  await withFetchMock((async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/auth/v1/user" && (init?.method ?? "GET").toUpperCase() === "GET") {
      return Response.json({ msg: "Invalid token" }, { status: 401 });
    }

    if (url.pathname === "/auth/v1/user" && init?.method === "PUT") {
      updateAttempted = true;
      return Response.json({});
    }

    throw new Error(`Unexpected fetch: ${url.pathname}`);
  }) as typeof fetch, async () => {
    const response = await resetPassword(new Request("http://localhost/api/admin/password/reset", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        access_token: "bad-token",
        password: strongPassword,
        confirm_password: strongPassword,
      }),
    }));
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.error.code, "AUTH_ERROR");
    assert.equal(payload.error.details.reason, "INVALID_RESET_TOKEN");
    assert.equal(updateAttempted, false);
  });
});

test("expired reset token is classified separately", async () => {
  await withFetchMock((async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/auth/v1/user" && (init?.method ?? "GET").toUpperCase() === "GET") {
      return Response.json({ msg: "Token has expired" }, { status: 401 });
    }

    throw new Error(`Unexpected fetch: ${url.pathname}`);
  }) as typeof fetch, async () => {
    const response = await resetPassword(new Request("http://localhost/api/admin/password/reset", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        access_token: "expired-token",
        password: strongPassword,
        confirm_password: strongPassword,
      }),
    }));
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.error.details.reason, "EXPIRED_RESET_TOKEN");
  });
});

test("reset password enforces confirmation and password policy", async () => {
  const response = await resetPassword(new Request("http://localhost/api/admin/password/reset", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      access_token: "reset-token",
      password: "weak",
      confirm_password: "weak",
    }),
  }));
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error.code, "INVALID_PASSWORD");
});

test("authenticated admins can change password after current password verification", async () => {
  const rows = createAdminSessionRows();
  const handleSessions = createAdminSessionGovernanceFetchHandler(rows);
  let passwordGrantChecked = false;
  let passwordUpdated = false;

  await withFetchMock((async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const sessionResponse = handleSessions(input, init);

    if (sessionResponse) {
      return sessionResponse;
    }

    if (url.pathname === "/auth/v1/user" && (init?.method ?? "GET").toUpperCase() === "GET") {
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer access-cookie");
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

    if (url.pathname === "/auth/v1/token") {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;

      assert.equal(url.searchParams.get("grant_type"), "password");
      assert.equal(body.email, "admin@example.com");
      assert.equal(body.password, "current-secret");
      passwordGrantChecked = true;
      return Response.json({
        access_token: "verified-access",
        refresh_token: "verified-refresh",
        expires_in: 3600,
        user: {
          id: "admin-id",
          email: "admin@example.com",
        },
      });
    }

    if (url.pathname === "/auth/v1/user" && init?.method === "PUT") {
      const body = JSON.parse(String(init.body ?? "{}")) as Record<string, unknown>;

      assert.equal(new Headers(init.headers).get("authorization"), "Bearer access-cookie");
      assert.equal(body.password, strongPassword);
      passwordUpdated = true;
      return Response.json({});
    }

    throw new Error(`Unexpected fetch: ${url.pathname} ${init?.method ?? "GET"}`);
  }) as typeof fetch, async () => {
    const response = await changePassword(new Request("http://localhost/api/admin/password/change", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "localman_admin_access=access-cookie; localman_admin_session=current-session",
      },
      body: JSON.stringify({
        current_password: "current-secret",
        password: strongPassword,
        confirm_password: strongPassword,
      }),
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.equal(passwordGrantChecked, true);
    assert.equal(passwordUpdated, true);
    assert.equal(rows.find((row) => row.id === "current-session")?.status, "active");
    assert.equal(rows.find((row) => row.id === "other-session")?.status, "revoked");
    assert.equal(rows.find((row) => row.id === "other-session")?.revoked_reason, "password_changed");
  });
});

test("change password rejects an incorrect current password", async () => {
  const rows = createAdminSessionRows();
  const handleSessions = createAdminSessionGovernanceFetchHandler(rows);
  let updateAttempted = false;

  await withFetchMock((async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const sessionResponse = handleSessions(input, init);

    if (sessionResponse) {
      return sessionResponse;
    }

    if (url.pathname === "/auth/v1/user" && (init?.method ?? "GET").toUpperCase() === "GET") {
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

    if (url.pathname === "/auth/v1/token") {
      return Response.json({ error_description: "Invalid login credentials" }, { status: 400 });
    }

    if (url.pathname === "/auth/v1/user" && init?.method === "PUT") {
      updateAttempted = true;
      return Response.json({});
    }

    throw new Error(`Unexpected fetch: ${url.pathname}`);
  }) as typeof fetch, async () => {
    const response = await changePassword(new Request("http://localhost/api/admin/password/change", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "localman_admin_access=access-cookie; localman_admin_session=current-session",
      },
      body: JSON.stringify({
        current_password: "wrong-secret",
        password: strongPassword,
        confirm_password: strongPassword,
      }),
    }));
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.error.code, "AUTH_ERROR");
    assert.equal(updateAttempted, false);
  });
});

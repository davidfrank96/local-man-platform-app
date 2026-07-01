import assert from "node:assert/strict";
import test from "node:test";
import type { AdminAuthConfig, AdminUserRecord, SupabaseAuthUser } from "../lib/admin/auth.ts";
import type { AdminCookieSession } from "../lib/admin/session-cookies.ts";
import {
  createAdminGovernedSession,
  ensureAdminGovernedSession,
  markAdminSessionRefreshed,
  revokeAdminSession,
  revokeAllAdminSessionsForUser,
  type AdminSessionGovernanceConfig,
} from "../lib/admin/session-governance.ts";

type SessionRow = Record<string, unknown> & {
  id: string;
  auth_user_id: string;
  admin_user_id: string | null;
  login_at: string;
  last_activity_at: string;
  refreshed_at: string | null;
  expires_at: string;
  status: string;
  revoked_at: string | null;
  revoked_reason: string | null;
};

const authConfig: AdminAuthConfig = {
  supabaseUrl: "https://example.supabase.co",
  supabaseAnonKey: "anon-key",
  supabaseServiceRoleKey: "service-role-key",
};

const governanceConfig: AdminSessionGovernanceConfig = {
  tableName: "admin_sessions",
  enabled: true,
  idleTimeoutMs: 30 * 60_000,
  absoluteTimeoutMs: 12 * 60 * 60_000,
  activityUpdateThresholdMs: 5 * 60_000,
};

const user: SupabaseAuthUser = {
  id: "00000000-0000-4000-8000-000000000111",
  email: "admin@example.com",
};

const adminUser: AdminUserRecord = {
  id: "00000000-0000-4000-8000-000000000111",
  email: "admin@example.com",
  full_name: "Admin User",
  role: "admin",
};

const cookieSession: AdminCookieSession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: Date.now() + 3600_000,
  user,
};

function createStore(initialRows: SessionRow[] = []) {
  const rows = [...initialRows];
  const requests: Array<{ method: string; pathname: string; body: Record<string, unknown> | null }> = [];
  const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = (init?.method ?? "GET").toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null;

    requests.push({ method, pathname: url.pathname, body });
    assert.equal(url.pathname, "/rest/v1/admin_sessions");

    if (method === "GET") {
      const idFilter = url.searchParams.get("id");
      const result = idFilter?.startsWith("eq.")
        ? rows.filter((row) => row.id === idFilter.slice(3))
        : rows;

      return Response.json(result);
    }

    if (method === "POST") {
      const now = "2026-07-01T12:00:00.000Z";
      const row: SessionRow = {
        id: String(body?.id),
        auth_user_id: String(body?.auth_user_id),
        admin_user_id: String(body?.admin_user_id ?? ""),
        login_at: String(body?.login_at ?? now),
        last_activity_at: String(body?.last_activity_at ?? now),
        refreshed_at: body?.refreshed_at ? String(body.refreshed_at) : null,
        expires_at: String(body?.expires_at),
        status: String(body?.status ?? "active"),
        revoked_at: body?.revoked_at ? String(body.revoked_at) : null,
        revoked_reason: body?.revoked_reason ? String(body.revoked_reason) : null,
        ...body,
      };

      rows.unshift(row);
      return Response.json([row], { status: 201 });
    }

    if (method === "PATCH") {
      const idFilter = url.searchParams.get("id");
      const authUserFilter = url.searchParams.get("auth_user_id");
      const statusFilter = url.searchParams.get("status");

      for (const row of rows) {
        const idMatches = !idFilter?.startsWith("eq.") || row.id === idFilter.slice(3);
        const authUserMatches = !authUserFilter?.startsWith("eq.") || row.auth_user_id === authUserFilter.slice(3);
        const statusMatches = !statusFilter?.startsWith("eq.") || row.status === statusFilter.slice(3);

        if (idMatches && authUserMatches && statusMatches) {
          Object.assign(row, body);
        }
      }

      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected method: ${method}`);
  }) as typeof fetch;

  return {
    rows,
    requests,
    fetchImpl,
  };
}

function activeRow(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    auth_user_id: user.id,
    admin_user_id: adminUser.id,
    login_at: "2026-07-01T12:00:00.000Z",
    last_activity_at: "2026-07-01T12:10:00.000Z",
    refreshed_at: null,
    expires_at: "2026-07-02T00:00:00.000Z",
    status: "active",
    revoked_at: null,
    revoked_reason: null,
    ...overrides,
  };
}

test("admin session governance creates active inventory records", async () => {
  const store = createStore();
  const sessionId = await createAdminGovernedSession(
    authConfig,
    user,
    adminUser,
    cookieSession,
    {
      sessionId: null,
      ipAddress: "203.0.113.10",
      userAgent: "node-test",
      requestId: "req-create",
    },
    {
      config: governanceConfig,
      now: new Date("2026-07-01T12:00:00.000Z"),
      fetchImpl: store.fetchImpl,
    },
  );

  assert.ok(sessionId);
  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0]?.status, "active");
  assert.equal(store.rows[0]?.auth_user_id, user.id);
});

test("admin session governance rejects idle sessions and marks them expired", async () => {
  const store = createStore([
    activeRow({
      last_activity_at: "2026-07-01T12:00:00.000Z",
      expires_at: "2026-07-02T00:00:00.000Z",
    }),
  ]);

  const result = await ensureAdminGovernedSession(
    authConfig,
    user,
    adminUser,
    {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      adminSessionId: "11111111-1111-4111-8111-111111111111",
    },
    {
      sessionId: "11111111-1111-4111-8111-111111111111",
      ipAddress: "203.0.113.10",
      userAgent: "node-test",
      requestId: "req-idle",
    },
    {
      config: governanceConfig,
      now: new Date("2026-07-01T12:31:00.000Z"),
      fetchImpl: store.fetchImpl,
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.success ? null : result.failure.code, "SESSION_IDLE_TIMEOUT");
  assert.equal(store.rows[0]?.status, "idle_expired");
});

test("admin session governance rejects absolute session expiry", async () => {
  const store = createStore([
    activeRow({
      last_activity_at: "2026-07-01T23:55:00.000Z",
      expires_at: "2026-07-02T00:00:00.000Z",
    }),
  ]);

  const result = await ensureAdminGovernedSession(
    authConfig,
    user,
    adminUser,
    {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      adminSessionId: "11111111-1111-4111-8111-111111111111",
    },
    {
      sessionId: "11111111-1111-4111-8111-111111111111",
      ipAddress: "203.0.113.10",
      userAgent: "node-test",
      requestId: "req-absolute",
    },
    {
      config: governanceConfig,
      now: new Date("2026-07-02T00:00:01.000Z"),
      fetchImpl: store.fetchImpl,
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.success ? null : result.failure.code, "SESSION_ABSOLUTE_TIMEOUT");
  assert.equal(store.rows[0]?.status, "absolute_expired");
});

test("admin session governance rejects revoked sessions", async () => {
  const store = createStore([
    activeRow({
      status: "revoked",
      revoked_reason: "security_incident",
    }),
  ]);

  const result = await ensureAdminGovernedSession(
    authConfig,
    user,
    adminUser,
    {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      adminSessionId: "11111111-1111-4111-8111-111111111111",
    },
    {
      sessionId: "11111111-1111-4111-8111-111111111111",
      ipAddress: "203.0.113.10",
      userAgent: "node-test",
      requestId: "req-revoked",
    },
    {
      config: governanceConfig,
      now: new Date("2026-07-01T12:11:00.000Z"),
      fetchImpl: store.fetchImpl,
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.success ? null : result.failure.code, "SESSION_REVOKED");
});

test("admin session governance throttles activity updates", async () => {
  const store = createStore([
    activeRow({
      last_activity_at: "2026-07-01T12:10:00.000Z",
    }),
  ]);

  const result = await ensureAdminGovernedSession(
    authConfig,
    user,
    adminUser,
    {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      adminSessionId: "11111111-1111-4111-8111-111111111111",
    },
    {
      sessionId: "11111111-1111-4111-8111-111111111111",
      ipAddress: "203.0.113.10",
      userAgent: "node-test",
      requestId: "req-throttle",
    },
    {
      config: governanceConfig,
      now: new Date("2026-07-01T12:12:00.000Z"),
      fetchImpl: store.fetchImpl,
    },
  );

  assert.equal(result.success, true);
  assert.equal(store.requests.some((request) => request.method === "PATCH"), false);
});

test("admin session governance updates stale activity and records refresh rotation", async () => {
  const store = createStore([
    activeRow({
      last_activity_at: "2026-07-01T12:00:00.000Z",
    }),
  ]);

  const result = await ensureAdminGovernedSession(
    authConfig,
    user,
    adminUser,
    {
      accessToken: "next-access-token",
      refreshToken: "next-refresh-token",
      adminSessionId: "11111111-1111-4111-8111-111111111111",
    },
    {
      sessionId: "11111111-1111-4111-8111-111111111111",
      ipAddress: "203.0.113.10",
      userAgent: "node-test",
      requestId: "req-activity",
    },
    {
      config: governanceConfig,
      now: new Date("2026-07-01T12:06:00.000Z"),
      fetchImpl: store.fetchImpl,
    },
  );

  assert.equal(result.success, true);
  assert.equal(store.rows[0]?.last_activity_at, "2026-07-01T12:06:00.000Z");

  await markAdminSessionRefreshed(
    authConfig,
    "11111111-1111-4111-8111-111111111111",
    {
      ...cookieSession,
      accessToken: "rotated-access",
      refreshToken: "rotated-refresh",
    },
    {
      sessionId: "11111111-1111-4111-8111-111111111111",
      ipAddress: "203.0.113.10",
      userAgent: "node-test",
      requestId: "req-refresh",
    },
    {
      config: governanceConfig,
      now: new Date("2026-07-01T12:07:00.000Z"),
      fetchImpl: store.fetchImpl,
    },
  );

  assert.equal(store.rows[0]?.refreshed_at, "2026-07-01T12:07:00.000Z");
  assert.equal(typeof store.rows[0]?.refresh_token_hash, "string");
});

test("admin session governance supports specific and all-session forced logout", async () => {
  const store = createStore([
    activeRow({
      id: "11111111-1111-4111-8111-111111111111",
    }),
    activeRow({
      id: "22222222-2222-4222-8222-222222222222",
    }),
  ]);

  await revokeAdminSession(
    authConfig,
    "11111111-1111-4111-8111-111111111111",
    "manual_logout",
    {
      config: governanceConfig,
      now: new Date("2026-07-01T12:15:00.000Z"),
      fetchImpl: store.fetchImpl,
    },
  );

  assert.equal(store.rows.find((row) => row.id === "11111111-1111-4111-8111-111111111111")?.status, "logged_out");
  assert.equal(store.rows.find((row) => row.id === "22222222-2222-4222-8222-222222222222")?.status, "active");

  await revokeAllAdminSessionsForUser(
    authConfig,
    user.id,
    "password_changed",
    {
      config: governanceConfig,
      now: new Date("2026-07-01T12:16:00.000Z"),
      fetchImpl: store.fetchImpl,
    },
  );

  assert.equal(store.rows.find((row) => row.id === "22222222-2222-4222-8222-222222222222")?.status, "revoked");
  assert.equal(store.rows.find((row) => row.id === "22222222-2222-4222-8222-222222222222")?.revoked_reason, "password_changed");
});

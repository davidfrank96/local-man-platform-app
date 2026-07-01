import assert from "node:assert/strict";
import test from "node:test";
import type { AdminAuthConfig } from "../lib/admin/auth.ts";
import {
  evaluateAdminLoginProtection,
  recordAdminLoginDelayApplied,
  recordAdminLoginProtectionOutcome,
  type AdminLoginProtectionConfig,
  type AdminLoginProtectionIdentity,
} from "../lib/admin/login-protection.ts";

type StoredLoginEvent = Record<string, unknown> & {
  action: string;
  created_at: string;
  scope_type: string;
  scope_key: string;
  cooldown_until: string | null;
};

const authConfig: AdminAuthConfig = {
  supabaseUrl: "https://example.supabase.co",
  supabaseAnonKey: "anon-key",
  supabaseServiceRoleKey: "service-role-key",
};

const baseConfig: AdminLoginProtectionConfig = {
  tableName: "admin_login_security_events",
  enabled: true,
  ip: {
    maxFailures: 3,
    windowMs: 60_000,
    cooldownMs: 60_000,
    delayThresholds: [
      { afterFailures: 1, delayMs: 25 },
      { afterFailures: 2, delayMs: 75 },
    ],
  },
  account: {
    maxFailures: 2,
    windowMs: 60_000,
    cooldownMs: 60_000,
    delayThresholds: [
      { afterFailures: 1, delayMs: 25 },
    ],
  },
  ipAccount: {
    maxFailures: 2,
    windowMs: 60_000,
    cooldownMs: 60_000,
    delayThresholds: [
      { afterFailures: 1, delayMs: 25 },
    ],
  },
};

function identity(overrides: Partial<AdminLoginProtectionIdentity> = {}): AdminLoginProtectionIdentity {
  return {
    email: "admin@example.com",
    ipAddress: "203.0.113.10",
    userAgent: "node-test",
    requestId: "test-request-id",
    ...overrides,
  };
}

function createLoginProtectionStore(now: Date) {
  let currentTime = now;
  const rows: StoredLoginEvent[] = [];
  const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));

    assert.equal(url.pathname, "/rest/v1/admin_login_security_events");

    const method = (init?.method ?? "GET").toUpperCase();

    if (method === "GET") {
      return Response.json(rows);
    }

    if (method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}")) as StoredLoginEvent;

      rows.unshift({
        ...body,
        created_at: currentTime.toISOString(),
      });
      return new Response(null, { status: 201 });
    }

    throw new Error(`Unexpected method: ${method}`);
  }) as typeof fetch;

  return {
    rows,
    fetchImpl,
    setNow(value: Date) {
      currentTime = value;
    },
  };
}

test("admin login protection records successful logins without creating cooldowns", async () => {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const store = createLoginProtectionStore(now);

  await recordAdminLoginProtectionOutcome(authConfig, identity(), "LOGIN_SUCCESS", {
    config: baseConfig,
    now,
    fetchImpl: store.fetchImpl,
  });

  assert.equal(store.rows.filter((row) => row.action === "LOGIN_SUCCESS").length, 1);
  assert.equal(store.rows.some((row) => row.action === "LOGIN_COOLDOWN_STARTED"), false);
});

test("admin login protection records failed logins across ip, account, and combined scopes", async () => {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const store = createLoginProtectionStore(now);

  await recordAdminLoginProtectionOutcome(authConfig, identity(), "LOGIN_FAILED", {
    config: baseConfig,
    now,
    fetchImpl: store.fetchImpl,
  });

  const failedScopes = store.rows
    .filter((row) => row.action === "LOGIN_FAILED")
    .map((row) => row.scope_type)
    .sort();

  assert.deepEqual(failedScopes, ["account", "ip", "ip_account"]);
});

test("admin login protection applies progressive delay before cooldown", async () => {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const store = createLoginProtectionStore(now);

  await recordAdminLoginProtectionOutcome(authConfig, identity(), "LOGIN_FAILED", {
    config: baseConfig,
    now,
    fetchImpl: store.fetchImpl,
  });

  const decision = await evaluateAdminLoginProtection(authConfig, identity(), {
    config: baseConfig,
    now: new Date("2026-07-01T12:00:05.000Z"),
    fetchImpl: store.fetchImpl,
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.delayMs, 25);

  await recordAdminLoginDelayApplied(authConfig, identity(), decision, {
    config: baseConfig,
    fetchImpl: store.fetchImpl,
  });

  assert.equal(store.rows.some((row) => row.action === "LOGIN_DELAY_APPLIED"), true);
});

test("admin login protection starts and enforces temporary cooldowns after repeated failures", async () => {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const store = createLoginProtectionStore(now);

  await recordAdminLoginProtectionOutcome(authConfig, identity(), "LOGIN_FAILED", {
    config: baseConfig,
    now,
    fetchImpl: store.fetchImpl,
  });
  store.setNow(new Date("2026-07-01T12:00:10.000Z"));
  await recordAdminLoginProtectionOutcome(authConfig, identity(), "LOGIN_FAILED", {
    config: baseConfig,
    now: new Date("2026-07-01T12:00:10.000Z"),
    fetchImpl: store.fetchImpl,
  });

  assert.equal(store.rows.some((row) => row.action === "LOGIN_COOLDOWN_STARTED"), true);

  const decision = await evaluateAdminLoginProtection(authConfig, identity(), {
    config: baseConfig,
    now: new Date("2026-07-01T12:00:20.000Z"),
    fetchImpl: store.fetchImpl,
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.retryAfterSeconds, 50);
});

test("admin login protection allows attempts after cooldown expiry and records cooldown closure", async () => {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const store = createLoginProtectionStore(now);

  await recordAdminLoginProtectionOutcome(authConfig, identity(), "LOGIN_FAILED", {
    config: baseConfig,
    now,
    fetchImpl: store.fetchImpl,
  });
  store.setNow(new Date("2026-07-01T12:00:10.000Z"));
  await recordAdminLoginProtectionOutcome(authConfig, identity(), "LOGIN_FAILED", {
    config: baseConfig,
    now: new Date("2026-07-01T12:00:10.000Z"),
    fetchImpl: store.fetchImpl,
  });
  store.setNow(new Date("2026-07-01T12:01:11.000Z"));

  const decision = await evaluateAdminLoginProtection(authConfig, identity(), {
    config: baseConfig,
    now: new Date("2026-07-01T12:01:11.000Z"),
    fetchImpl: store.fetchImpl,
  });

  assert.equal(decision.allowed, true);
  assert.equal(store.rows.some((row) => row.action === "LOGIN_COOLDOWN_ENDED"), true);
});

test("admin login protection keeps different account and IP scopes independent", async () => {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const store = createLoginProtectionStore(now);

  await recordAdminLoginProtectionOutcome(authConfig, identity(), "LOGIN_FAILED", {
    config: baseConfig,
    now,
    fetchImpl: store.fetchImpl,
  });
  store.setNow(new Date("2026-07-01T12:00:05.000Z"));
  await recordAdminLoginProtectionOutcome(authConfig, identity(), "LOGIN_FAILED", {
    config: baseConfig,
    now: new Date("2026-07-01T12:00:05.000Z"),
    fetchImpl: store.fetchImpl,
  });

  const unrelatedDecision = await evaluateAdminLoginProtection(
    authConfig,
    identity({
      email: "other@example.com",
      ipAddress: "203.0.113.77",
    }),
    {
      config: baseConfig,
      now: new Date("2026-07-01T12:00:10.000Z"),
      fetchImpl: store.fetchImpl,
    },
  );

  assert.equal(unrelatedDecision.allowed, true);
  assert.equal(unrelatedDecision.delayMs, 0);
});

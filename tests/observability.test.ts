import assert from "node:assert/strict";
import test from "node:test";
import {
  attachRequestIdHeader,
  buildOperationalEventInsertPayload,
  flushOperationalEventWritesForTests,
  getOrCreateRequestId,
  logStructuredEvent,
  resetOperationalEventPersistenceForTests,
  sanitizeLogMetadata,
  serializeErrorForLog,
  shouldPersistOperationalLogRecord,
} from "../lib/observability.ts";

function withEnv(
  updates: Partial<Record<string, string | undefined>>,
): () => void {
  const previousValues = {
    LOCALMAN_LOG_LEVEL: process.env.LOCALMAN_LOG_LEVEL,
    LOCALMAN_ENABLE_DEBUG_LOGS: process.env.LOCALMAN_ENABLE_DEBUG_LOGS,
    LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE:
      process.env.LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE,
    LOCALMAN_RUNTIME_ENVIRONMENT: process.env.LOCALMAN_RUNTIME_ENVIRONMENT,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return () => {
    for (const [key, value] of Object.entries(previousValues)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

test.beforeEach(() => {
  resetOperationalEventPersistenceForTests();
});

test("serializeErrorForLog returns safe error fields", () => {
  const error = new Error("Supabase fetch failed");
  (error as Error & { code?: string; status?: number }).code = "E_UPSTREAM";
  (error as Error & { code?: string; status?: number }).status = 502;

  assert.deepEqual(serializeErrorForLog(error), {
    errorName: "Error",
    errorMessage: "Supabase fetch failed",
    errorCode: "E_UPSTREAM",
    status: 502,
  });
});

test("sanitizeLogMetadata redacts sensitive nested fields", () => {
  const sanitized = sanitizeLogMetadata({
    authorization: "Bearer top-secret",
    nested: {
      cookie: "session=abc",
      password: "hunter2",
      safeValue: "visible",
    },
    database_url: "postgres://postgres:secret@db.example.com:5432/localman",
    note: "plain-text note",
  });

  assert.deepEqual(sanitized, {
    authorization: "[REDACTED]",
    nested: {
      cookie: "[REDACTED]",
      password: "[REDACTED]",
      safeValue: "visible",
    },
    database_url: "[REDACTED]",
    note: "plain-text note",
  });
});

test("getOrCreateRequestId preserves safe incoming ids and replaces unsafe ones", () => {
  const preserved = getOrCreateRequestId(
    new Request("http://localhost/api/test", {
      headers: {
        "x-request-id": "safe-request-1234",
      },
    }),
  );
  const generated = getOrCreateRequestId(
    new Request("http://localhost/api/test", {
      headers: {
        "x-request-id": "bad request id with spaces",
      },
    }),
  );

  assert.equal(preserved, "safe-request-1234");
  assert.match(generated, /^req_[a-f0-9]{16}$/);
  assert.notEqual(generated, "bad request id with spaces");
});

test("attachRequestIdHeader exposes a safe request id header", () => {
  const response = attachRequestIdHeader(new Response(null, { status: 204 }), "unsafe request id");
  const requestId = response.headers.get("x-request-id");

  assert.ok(requestId);
  assert.match(requestId ?? "", /^req_[a-f0-9]{16}$/);
});

test("logStructuredEvent filters debug logs unless explicitly enabled", () => {
  const restoreEnv = withEnv({
    LOCALMAN_LOG_LEVEL: "info",
    LOCALMAN_ENABLE_DEBUG_LOGS: "false",
  });
  const debugCalls: unknown[][] = [];
  const originalDebug = console.debug;

  console.debug = ((...args: unknown[]) => {
    debugCalls.push(args);
  }) as typeof console.debug;

  try {
    logStructuredEvent("debug", {
      event: "TEST_DEBUG_DISABLED",
      metadata: {
        token: "should-not-log",
      },
    });

    assert.equal(debugCalls.length, 0);

    process.env.LOCALMAN_ENABLE_DEBUG_LOGS = "true";

    logStructuredEvent("debug", {
      event: "TEST_DEBUG_ENABLED",
      requestId: "unsafe request id",
      error: new Error("boom"),
      metadata: {
        authorization: "Bearer should-not-log",
        nested: {
          password: "secret",
        },
      },
    });

    assert.equal(debugCalls.length, 1);
    const record = debugCalls[0]?.[0] as Record<string, unknown>;

    assert.equal(record.event, "TEST_DEBUG_ENABLED");
    assert.equal(record.level, "debug");
    assert.equal(record.requestId, undefined);
    assert.equal((record.metadata as Record<string, unknown>).authorization, "[REDACTED]");
    assert.deepEqual((record.metadata as Record<string, unknown>).nested, {
      password: "[REDACTED]",
    });
    assert.equal(record.errorMessage, "boom");
  } finally {
    console.debug = originalDebug;
    restoreEnv();
  }
});

test("shouldPersistOperationalLogRecord keeps storage bounded to selected events", () => {
  assert.equal(
    shouldPersistOperationalLogRecord({
      timestamp: new Date().toISOString(),
      level: "info",
      event: "ADMIN_SESSION_VALIDATED",
      area: "auth",
    }),
    false,
  );
  assert.equal(
    shouldPersistOperationalLogRecord({
      timestamp: new Date().toISOString(),
      level: "info",
      event: "ADMIN_VENDOR_CREATED",
      area: "admin",
    }),
    true,
  );
  assert.equal(
    shouldPersistOperationalLogRecord({
      timestamp: new Date().toISOString(),
      level: "warn",
      event: "PUBLIC_EVENT_TRACKING_SKIPPED",
      area: "api",
    }),
    false,
  );
  assert.equal(
    shouldPersistOperationalLogRecord({
      timestamp: new Date().toISOString(),
      level: "warn",
      event: "PUBLIC_NEARBY_SLOW",
      area: "public_discovery",
    }),
    true,
  );
});

test("buildOperationalEventInsertPayload keeps safe metadata and environment tags", () => {
  const restoreEnv = withEnv({
    LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE: "true",
    LOCALMAN_RUNTIME_ENVIRONMENT: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  });

  try {
    const payload = buildOperationalEventInsertPayload({
      timestamp: new Date().toISOString(),
      level: "error",
      event: "TEST_PERSISTED_ERROR",
      area: "api",
      route: "/api/test",
      method: "POST",
      status: 502,
      durationMs: 45,
      requestId: "safe-request-1234",
      userRole: "admin",
      adminUserId: "admin-user-1",
      vendorId: "vendor-1",
      vendorSlug: "test-vendor",
      errorCode: "E_UPSTREAM",
      errorName: "Error",
      errorMessage: "boom",
      metadata: {
        authorization: "Bearer top-secret",
        nested: {
          password: "hunter2",
        },
      },
    });

    assert.ok(payload);
    assert.equal(payload?.environment, "staging");
    assert.equal(payload?.actor_role, "admin");
    assert.equal(payload?.actor_id, "admin-user-1");
    assert.equal(payload?.request_id, "safe-request-1234");
    assert.equal(payload?.metadata.authorization, "[REDACTED]");
    assert.deepEqual(payload?.metadata.nested, {
      password: "[REDACTED]",
    });
    assert.equal(payload?.metadata.errorCode, "E_UPSTREAM");
    assert.equal(payload?.metadata.errorMessage, "boom");
  } finally {
    restoreEnv();
  }
});

test("logStructuredEvent persists sanitized operational events when enabled", async () => {
  const restoreEnv = withEnv({
    LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE: "true",
    LOCALMAN_RUNTIME_ENVIRONMENT: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  });
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const originalInfo = console.info;
  const writes: Array<{ url: string; body: Record<string, unknown> }> = [];

  console.error = (() => undefined) as typeof console.error;
  console.info = (() => undefined) as typeof console.info;
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    writes.push({
      url: url.toString(),
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });
    return new Response(null, { status: 201 });
  }) as typeof fetch;

  try {
    logStructuredEvent("error", {
      event: "TEST_OPERATIONAL_STORAGE",
      area: "api",
      requestId: "safe-request-1234",
      metadata: {
        authorization: "Bearer top-secret",
        nested: {
          cookie: "session=secret",
        },
      },
      error: new Error("boom"),
    });

    await flushOperationalEventWritesForTests();

    assert.equal(writes.length, 1);
    assert.match(writes[0]?.url ?? "", /\/rest\/v1\/operational_events$/);
    assert.equal(writes[0]?.body.level, "error");
    assert.equal(writes[0]?.body.event, "TEST_OPERATIONAL_STORAGE");
    assert.equal(writes[0]?.body.request_id, "safe-request-1234");
    assert.equal(
      (writes[0]?.body.metadata as Record<string, unknown>).authorization,
      "[REDACTED]",
    );
    assert.deepEqual(
      (writes[0]?.body.metadata as Record<string, unknown>).nested,
      { cookie: "[REDACTED]" },
    );
    assert.equal(
      (writes[0]?.body.metadata as Record<string, unknown>).errorMessage,
      "boom",
    );
  } finally {
    console.error = originalError;
    console.info = originalInfo;
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdminDatabaseConsistencyStatus,
  resetAdminDatabaseConsistencyStatusForTests,
} from "../lib/runtime/db-consistency.ts";
import {
  flushOperationalEventWritesForTests,
  resetOperationalEventPersistenceForTests,
} from "../lib/observability.ts";

function withEnv(
  updates: Partial<Record<string, string | undefined>>,
): () => void {
  const previousValues = {
    LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE:
      process.env.LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE,
    LOCALMAN_RUNTIME_ENVIRONMENT: process.env.LOCALMAN_RUNTIME_ENVIRONMENT,
    NEXT_PHASE: process.env.NEXT_PHASE,
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
  resetAdminDatabaseConsistencyStatusForTests();
  resetOperationalEventPersistenceForTests();
});

test.afterEach(() => {
  resetAdminDatabaseConsistencyStatusForTests();
  resetOperationalEventPersistenceForTests();
});

test("pending migrations return a warning status instead of crashing admin rendering", async () => {
  const restoreEnv = withEnv({
    LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE: "true",
    LOCALMAN_RUNTIME_ENVIRONMENT: "production",
    NEXT_PHASE: undefined,
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  });
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const originalWarn = console.warn;
  const warnings: Array<Record<string, unknown>> = [];
  const errors: Array<Record<string, unknown>> = [];
  const writes: string[] = [];

  console.error = ((record: unknown) => {
    if (record && typeof record === "object" && !Array.isArray(record)) {
      errors.push(record as Record<string, unknown>);
    }
  }) as typeof console.error;
  console.warn = ((record: unknown) => {
    if (record && typeof record === "object" && !Array.isArray(record)) {
      warnings.push(record as Record<string, unknown>);
    }
  }) as typeof console.warn;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/rest/v1/app_schema_migrations") {
      return Response.json([]);
    }

    if (url.pathname === "/rest/v1/operational_events") {
      writes.push(url.pathname);
      return Response.json({ message: "logging table unavailable" }, { status: 404 });
    }

    throw new Error(`Unexpected fetch: ${url.pathname}`);
  }) as typeof fetch;

  try {
    const status = await getAdminDatabaseConsistencyStatus();
    await flushOperationalEventWritesForTests();

    assert.equal(status.ok, false);
    assert.equal(status.severity, "high");
    assert.equal(status.title, "Database migration warning");
    assert.match(status.message ?? "", /pending/);
    assert.ok(writes.length > 0);
    assert.ok(warnings.some((record) => record.event === "DB_MIGRATION_MISMATCH"));
    assert.ok(
      errors.some((record) => record.event === "OPERATIONAL_EVENT_PERSIST_FAILED"),
    );
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("missing migration table returns a status object when operational logging also fails", async () => {
  const restoreEnv = withEnv({
    LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE: "true",
    LOCALMAN_RUNTIME_ENVIRONMENT: "production",
    NEXT_PHASE: undefined,
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  });
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const originalWarn = console.warn;
  const warnings: Array<Record<string, unknown>> = [];

  console.error = (() => {
    throw new Error("console error unavailable");
  }) as typeof console.error;
  console.warn = ((record: unknown) => {
    if (record && typeof record === "object" && !Array.isArray(record)) {
      warnings.push(record as Record<string, unknown>);
    }
  }) as typeof console.warn;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/rest/v1/app_schema_migrations") {
      return Response.json({ message: "relation does not exist" }, { status: 404 });
    }

    if (url.pathname === "/rest/v1/operational_events") {
      return Response.json({ message: "relation does not exist" }, { status: 404 });
    }

    throw new Error(`Unexpected fetch: ${url.pathname}`);
  }) as typeof fetch;

  try {
    const status = await getAdminDatabaseConsistencyStatus();
    await flushOperationalEventWritesForTests();

    assert.equal(status.ok, false);
    assert.equal(status.severity, "high");
    assert.equal(status.title, "Database check warning");
    assert.match(status.message ?? "", /Database consistency check failed/);
    assert.ok(
      warnings.some(
        (record) => record.event === "STRUCTURED_LOG_CONSOLE_WRITE_FAILED",
      ),
    );
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin consistency check skips during build without fetching or logging", async () => {
  const restoreEnv = withEnv({
    NEXT_PHASE: "phase-production-build",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  });
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called during build");
  }) as typeof fetch;

  try {
    const status = await getAdminDatabaseConsistencyStatus();

    assert.equal(status.ok, true);
    assert.equal(status.message, null);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

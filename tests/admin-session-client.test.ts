import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminSessionError,
  clearStoredAdminSession,
  fetchAdminSessionIdentity,
  persistAdminSession,
  readStoredAdminSession,
  refreshAdminSession,
  shouldRefreshAdminSession,
  signInAdminSession,
} from "../lib/admin/session-client.ts";

const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

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
});

test("signInAdminSession parses a Supabase password session", async () => {
  const session = await signInAdminSession(
    "admin@example.com",
    "secret",
    (async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = input instanceof URL ? input : new URL(String(input));
      const body = JSON.parse(String(init?.body ?? "{}"));

      assert.equal(url.pathname, "/auth/v1/token");
      assert.equal(url.searchParams.get("grant_type"), "password");
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
    }) as typeof fetch,
  );

  assert.equal(session.accessToken, "access-token");
  assert.equal(session.refreshToken, "refresh-token");
  assert.equal(session.user.id, "admin-id");
  assert.equal(typeof session.expiresAt, "number");
});

test("refreshAdminSession requests a refreshed session", async () => {
  const session = await refreshAdminSession(
    "refresh-token",
    (async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = input instanceof URL ? input : new URL(String(input));
      const body = JSON.parse(String(init?.body ?? "{}"));

      assert.equal(url.searchParams.get("grant_type"), "refresh_token");
      assert.equal(body.refresh_token, "refresh-token");

      return Response.json({
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: "admin-id",
          email: "admin@example.com",
        },
      });
    }) as typeof fetch,
  );

  assert.equal(session.accessToken, "new-access-token");
  assert.equal(session.refreshToken, "new-refresh-token");
});

test("fetchAdminSessionIdentity returns the validated admin identity", async () => {
  const identity = await fetchAdminSessionIdentity(
    "access-token",
    (async (_input: URL | RequestInfo, init?: RequestInit) => {
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer access-token");

      return Response.json({
        success: true,
        data: {
          user: {
            id: "admin-id",
            email: "admin@example.com",
          },
          adminUser: {
            id: "admin-id",
            email: "admin@example.com",
            full_name: "Admin User",
            role: "admin",
          },
        },
        error: null,
      });
    }) as typeof fetch,
  );

  assert.equal(identity.user.id, "admin-id");
  assert.equal(identity.adminUser.role, "admin");
});

test("fetchAdminSessionIdentity uses the current stored session token for /api/admin/session", async () => {
  const storage = new Map<string, string>();
  const originalWindow = globalThis.window;
  const originalCrypto = globalThis.crypto;

  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: {
        getItem(key: string) {
          return storage.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          storage.set(key, value);
        },
        removeItem(key: string) {
          storage.delete(key);
        },
      },
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, "crypto", {
    value: {
      randomUUID: () => "request-id",
    },
    configurable: true,
  });

  persistAdminSession({
    accessToken: "live-token",
    refreshToken: "refresh-token",
    expiresAt: Date.now() + 60_000,
    user: {
      id: "admin-id",
      email: "admin@example.com",
    },
  });

  try {
    const identity = await fetchAdminSessionIdentity(
      "stale-token",
      (async (_input: URL | RequestInfo, init?: RequestInit) => {
        assert.equal(new Headers(init?.headers).get("authorization"), "Bearer live-token");

        return Response.json({
          success: true,
          data: {
            user: {
              id: "admin-id",
              email: "admin@example.com",
            },
            adminUser: {
              id: "admin-id",
              email: "admin@example.com",
              full_name: "Admin User",
              role: "admin",
            },
          },
          error: null,
        });
      }) as typeof fetch,
    );

    assert.equal(identity.user.id, "admin-id");
  } finally {
    clearStoredAdminSession();
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
    Object.defineProperty(globalThis, "crypto", {
      value: originalCrypto,
      configurable: true,
    });
  }
});

test("fetchAdminSessionIdentity does not call /api/admin/session when no token exists", async () => {
  let called = false;

  await assert.rejects(
    () =>
      fetchAdminSessionIdentity(
        "",
        (async () => {
          called = true;
          return Response.json({});
        }) as typeof fetch,
      ),
    (error) =>
      error instanceof AdminSessionError &&
      error.code === "UNAUTHORIZED" &&
      error.status === 401 &&
      error.message === "Admin session is missing. Sign in again.",
  );

  assert.equal(called, false);
});

test("fetchAdminSessionIdentity returns the validated agent identity", async () => {
  const identity = await fetchAdminSessionIdentity(
    "access-token",
    (async (_input: URL | RequestInfo, init?: RequestInit) => {
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer access-token");

      return Response.json({
        success: true,
        data: {
          user: {
            id: "agent-id",
            email: "agent@example.com",
          },
          adminUser: {
            id: "agent-id",
            email: "agent@example.com",
            full_name: "Agent User",
            role: "agent",
          },
        },
        error: null,
      });
    }) as typeof fetch,
  );

  assert.equal(identity.user.id, "agent-id");
  assert.equal(identity.adminUser.role, "agent");
});

test("fetchAdminSessionIdentity surfaces forbidden responses", async () => {
  await assert.rejects(
    () =>
      fetchAdminSessionIdentity(
        "access-token",
        (async () =>
          Response.json(
            {
              success: false,
              data: null,
              error: {
                code: "FORBIDDEN",
                message: "Authenticated user is not an admin.",
              },
            },
            { status: 403 },
          )) as typeof fetch,
      ),
    (error) =>
      error instanceof AdminSessionError &&
      error.code === "FORBIDDEN" &&
      error.status === 403,
  );
});

test("signInAdminSession surfaces invalid credentials", async () => {
  await assert.rejects(
    () =>
      signInAdminSession(
        "admin@example.com",
        "wrong-password",
        (async () =>
          Response.json(
            {
              error_description: "Invalid login credentials",
            },
            { status: 400 },
          )) as typeof fetch,
      ),
    (error) =>
      error instanceof AdminSessionError &&
      error.code === "AUTH_ERROR" &&
      error.status === 400 &&
      error.message === "Invalid login credentials",
  );
});

test("shouldRefreshAdminSession becomes true near expiry", () => {
  assert.equal(
    shouldRefreshAdminSession({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 30_000,
      user: {
        id: "admin-id",
      },
    }),
    true,
  );
});

test("stored admin sessions can be cleared after forbidden auth", () => {
  const storage = new Map<string, string>();
  const originalWindow = globalThis.window;

  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: {
        getItem(key: string) {
          return storage.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          storage.set(key, value);
        },
        removeItem(key: string) {
          storage.delete(key);
        },
      },
    },
    configurable: true,
  });

  try {
    persistAdminSession({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 3600_000,
      user: {
        id: "admin-id",
      },
    });

    assert.ok(readStoredAdminSession());

    clearStoredAdminSession();

    assert.equal(readStoredAdminSession(), null);
  } finally {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminSessionError,
  clearLegacyAdminSessionArtifacts,
  fetchAdminSessionIdentity,
  signInAdminSession,
  signOutAdminSession,
} from "../lib/admin/session-client.ts";

function createStorage(initialEntries: Array<[string, string]> = []) {
  const values = new Map(initialEntries);

  return {
    get length() {
      return values.size;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

test("signInAdminSession authenticates through the app login route", async () => {
  const requests: Array<{ url: string; method: string; body: unknown }> = [];

  const identity = await signInAdminSession(
    "admin@example.com",
    "secret",
    (async (input: URL | RequestInfo, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });

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
  assert.equal(requests[0]?.url, "/api/admin/login");
  assert.equal(requests[0]?.method, "POST");
  assert.deepEqual(requests[0]?.body, {
    email: "admin@example.com",
    password: "secret",
  });
});

test("fetchAdminSessionIdentity restores the current admin identity from the server session route", async () => {
  const requests: Array<{ url: string; method: string; credentials: RequestCredentials | undefined }> = [];

  const identity = await fetchAdminSessionIdentity(
    (async (input: URL | RequestInfo, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: init?.method ?? "GET",
        credentials: init?.credentials,
      });

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
  assert.equal(requests[0]?.url, "/api/admin/session");
  assert.equal(requests[0]?.method, "GET");
  assert.equal(requests[0]?.credentials, "same-origin");
});

test("fetchAdminSessionIdentity surfaces forbidden responses", async () => {
  await assert.rejects(
    () =>
      fetchAdminSessionIdentity(
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

test("signInAdminSession surfaces invalid credentials from the app login route", async () => {
  await assert.rejects(
    () =>
      signInAdminSession(
        "admin@example.com",
        "wrong-password",
        (async () =>
          Response.json(
            {
              success: false,
              data: null,
              error: {
                code: "AUTH_ERROR",
                message: "Invalid login credentials",
              },
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

test("signOutAdminSession calls the app logout route", async () => {
  const requests: Array<{ url: string; method: string }> = [];

  await signOutAdminSession(
    (async (input: URL | RequestInfo, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: init?.method ?? "GET",
      });

      return Response.json({
        success: true,
        data: {
          ok: true,
        },
        error: null,
      });
    }) as typeof fetch,
  );

  assert.equal(requests[0]?.url, "/api/admin/logout");
  assert.equal(requests[0]?.method, "POST");
});

test("clearLegacyAdminSessionArtifacts removes legacy browser auth storage only", async () => {
  const originalWindow = globalThis.window;
  const localStorage = createStorage([
    ["local-man-admin-session", "{\"user\":\"admin\"}"],
    ["sb-project-auth-token", "{\"access_token\":\"legacy\"}"],
    ["unrelated-key", "keep"],
  ]);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage,
    },
  });

  try {
    await clearLegacyAdminSessionArtifacts();

    assert.equal(localStorage.getItem("local-man-admin-session"), null);
    assert.equal(localStorage.getItem("sb-project-auth-token"), null);
    assert.equal(localStorage.getItem("unrelated-key"), "keep");
  } finally {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  }
});

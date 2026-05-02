import assert from "node:assert/strict";
import test from "node:test";
import {
  GET as listAdminUsersRoute,
  POST as createAdminUserRoute,
} from "../app/api/admin/admin-users/route.ts";
import {
  POST as createManagedUserRoute,
} from "../app/api/admin/create-user/route.ts";
import {
  DELETE as deleteAdminUserRoute,
  PATCH as updateAdminUserRoute,
} from "../app/api/admin/admin-users/[id]/route.ts";

const adminId = "00000000-0000-4000-8000-000000000101";
const agentId = "00000000-0000-4000-8000-000000000102";
const newUserId = "00000000-0000-4000-8000-000000000103";
const managedUserId = "00000000-0000-4000-8000-000000000104";

function setAdminEnv(): () => void {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousAuthCreateTimeout = process.env.ADMIN_AUTH_CREATE_TIMEOUT_MS;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.ADMIN_AUTH_CREATE_TIMEOUT_MS = "4000";

  return () => {
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

    if (previousAuthCreateTimeout === undefined) {
      delete process.env.ADMIN_AUTH_CREATE_TIMEOUT_MS;
    } else {
      process.env.ADMIN_AUTH_CREATE_TIMEOUT_MS = previousAuthCreateTimeout;
    }
  };
}

function createFetchMock(
  calls: string[],
  options?: {
    role?: "admin" | "agent";
  },
): typeof fetch {
  const role = options?.role ?? "admin";

  return (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url.pathname}`);

    if (url.pathname === "/auth/v1/user") {
      return Response.json({
        id: role === "admin" ? adminId : agentId,
        email: role === "admin" ? "admin@example.com" : "agent@example.com",
      });
    }

    if (url.pathname === "/rest/v1/admin_users" && method === "GET") {
      return Response.json([
        {
          id: role === "admin" ? adminId : agentId,
          email: role === "admin" ? "admin@example.com" : "agent@example.com",
          full_name: role === "admin" ? "Admin User" : "Agent User",
          role,
          created_at: "2026-04-28T00:00:00.000Z",
        },
      ]);
    }

    if (url.pathname === "/auth/v1/admin/users" && method === "POST") {
      const authBody = JSON.parse(String(init?.body ?? "{}")) as {
        email?: string;
      };
      return Response.json({
        user: {
          id: newUserId,
          email: authBody.email ?? "new.agent@example.com",
        },
      });
    }

    if (url.pathname === `/auth/v1/admin/users/${managedUserId}` && method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/rest/v1/admin_users" && method === "POST") {
      const postBody = JSON.parse(String(init?.body ?? "{}")) as {
        email?: string;
        full_name?: string | null;
        role?: "admin" | "agent";
      };
      return Response.json([
        {
          id: newUserId,
          email: postBody.email ?? "new.agent@example.com",
          full_name: postBody.full_name ?? "New Agent",
          role: postBody.role ?? "agent",
          created_at: "2026-04-28T00:00:00.000Z",
        },
      ]);
    }

    if (url.pathname === "/rest/v1/admin_users" && method === "PATCH") {
      const patchBody = JSON.parse(String(init?.body ?? "{}")) as {
        full_name?: string | null;
        role?: "admin" | "agent";
      };
      return Response.json([
        {
          id: managedUserId,
          email: "managed@example.com",
          full_name: patchBody.full_name ?? "Managed User",
          role: patchBody.role ?? "agent",
          created_at: "2026-04-28T00:00:00.000Z",
        },
      ]);
    }

    if (url.pathname === "/rest/v1/audit_logs" && method === "POST") {
      return new Response(null, { status: 201 });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;
}

function createRequest(path: string, method = "GET", body?: unknown, token = "admin-token") {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("admin can list admin users", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls);

  try {
    const response = await listAdminUsersRoute(createRequest("/api/admin/admin-users"));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.adminUsers.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin user list uses a bounded lightweight query", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  let capturedUrl: URL | null = null;

  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";

    if (url.pathname === "/auth/v1/user") {
      return Response.json({
        id: adminId,
        email: "admin@example.com",
      });
    }

    if (url.pathname === "/rest/v1/admin_users" && method === "GET") {
      capturedUrl = url;
      return Response.json([
        {
          id: adminId,
          email: "admin@example.com",
          full_name: "Admin User",
          role: "admin",
          created_at: "2026-04-28T00:00:00.000Z",
        },
      ]);
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await listAdminUsersRoute(createRequest("/api/admin/admin-users"));
    assert.equal(response.status, 200);
    assert.ok(capturedUrl);
    const queryUrl = capturedUrl as URL;
    assert.equal(queryUrl.searchParams.get("select"), "id,email,full_name,role,created_at");
    assert.equal(queryUrl.searchParams.get("order"), "created_at.desc");
    assert.equal(queryUrl.searchParams.get("limit"), "1000");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin user list returns a safe empty result when the upstream list fetch times out", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/auth/v1/user") {
      return Response.json({
        id: adminId,
        email: "admin@example.com",
      });
    }

    if (
      url.pathname === "/rest/v1/admin_users" &&
      (init?.method ?? "GET") === "GET"
    ) {
      if (url.searchParams.get("select") !== "id,email,full_name,role,created_at") {
        return Response.json([
          {
            id: adminId,
            email: "admin@example.com",
            full_name: "Admin User",
            role: "admin",
          },
        ]);
      }

      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          },
          { once: true },
        );
      });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await listAdminUsersRoute(createRequest("/api/admin/admin-users"));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data.adminUsers, []);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin can create an agent account", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls);

  try {
    const response = await createAdminUserRoute(
      createRequest("/api/admin/admin-users", "POST", {
        email: "new.agent@example.com",
        password: "temp-pass-123",
        full_name: "New Agent",
        role: "agent",
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.adminUser.role, "agent");
    assert.equal(body.data.outcome, "created");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "POST /auth/v1/admin/users",
      "POST /rest/v1/admin_users",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("dedicated create-user route creates an agent account through the server", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls);

  try {
    const response = await createManagedUserRoute(
      createRequest("/api/admin/create-user", "POST", {
        email: "new.agent@example.com",
        password: "temp-pass-123",
        full_name: "New Agent",
        role: "agent",
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.adminUser.role, "agent");
    assert.equal(body.data.outcome, "created");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "POST /auth/v1/admin/users",
      "POST /rest/v1/admin_users",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin can create an admin account", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls);

  try {
    const response = await createAdminUserRoute(
      createRequest("/api/admin/admin-users", "POST", {
        email: "new.admin@example.com",
        password: "temp-pass-123",
        full_name: "New Admin",
        role: "admin",
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.adminUser.role, "admin");
    assert.equal(body.data.outcome, "created");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "POST /auth/v1/admin/users",
      "POST /rest/v1/admin_users",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("creating an existing auth user recovers and assigns the role without failing", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url.pathname}`);

    if (url.pathname === "/auth/v1/user") {
      return Response.json({
        id: adminId,
        email: "admin@example.com",
      });
    }

    if (url.pathname === "/rest/v1/admin_users" && method === "GET") {
      return Response.json([
        {
          id: adminId,
          email: "admin@example.com",
          full_name: "Admin User",
          role: "admin",
          created_at: "2026-04-28T00:00:00.000Z",
        },
      ]);
    }

    if (url.pathname === "/auth/v1/admin/users" && method === "POST") {
      return Response.json(
        {
          code: "email_exists",
          msg: "A user with this email address has already been registered",
        },
        { status: 422 },
      );
    }

    if (url.pathname === "/auth/v1/admin/users" && method === "GET") {
      return Response.json({
        users: [
          {
            id: newUserId,
            email: "existing.agent@example.com",
          },
        ],
      }, {
        headers: {
          "x-total-count": "1",
          link: '</auth/v1/admin/users?page=1>; rel="last"',
        },
      });
    }

    if (url.pathname === "/rest/v1/admin_users" && method === "POST") {
      return Response.json([
        {
          id: newUserId,
          email: "existing.agent@example.com",
          full_name: "Existing Agent",
          role: "agent",
          created_at: "2026-04-28T00:00:00.000Z",
        },
      ]);
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await createAdminUserRoute(
      createRequest("/api/admin/admin-users", "POST", {
        email: "existing.agent@example.com",
        password: "temp-pass-123",
        full_name: "Existing Agent",
        role: "agent",
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.adminUser.email, "existing.agent@example.com");
    assert.equal(body.data.adminUser.role, "agent");
    assert.equal(body.data.outcome, "existing");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "POST /auth/v1/admin/users",
      "GET /auth/v1/admin/users",
      "POST /rest/v1/admin_users",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("creating a duplicate admin/agent email still returns a clear conflict when auth lookup finds no user", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url.pathname}`);

    if (url.pathname === "/auth/v1/user") {
      return Response.json({
        id: adminId,
        email: "admin@example.com",
      });
    }

    if (url.pathname === "/rest/v1/admin_users" && method === "GET") {
      return Response.json([
        {
          id: adminId,
          email: "admin@example.com",
          full_name: "Admin User",
          role: "admin",
          created_at: "2026-04-28T00:00:00.000Z",
        },
      ]);
    }

    if (url.pathname === "/auth/v1/admin/users" && method === "POST") {
      return Response.json(
        {
          code: "email_exists",
          msg: "A user with this email address has already been registered",
        },
        { status: 422 },
      );
    }

    if (url.pathname === "/auth/v1/admin/users" && method === "GET") {
      return Response.json({
        users: [],
      }, {
        headers: {
          "x-total-count": "0",
          link: '</auth/v1/admin/users?page=1>; rel="last"',
        },
      });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await createAdminUserRoute(
      createRequest("/api/admin/admin-users", "POST", {
        email: "existing.agent@example.com",
        password: "temp-pass-123",
        full_name: "Existing Agent",
        role: "agent",
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "USER_ALREADY_EXISTS");
    assert.equal(body.error.message, "This user already exists.");
    assert.equal(body.error.detail, "Supabase auth rejected a duplicate email.");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "POST /auth/v1/admin/users",
      "GET /auth/v1/admin/users",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin creation returns a retryable timeout when auth user creation stalls", async () => {
  const restoreEnv = setAdminEnv();
  process.env.ADMIN_AUTH_CREATE_TIMEOUT_MS = "10";
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  const calls: string[] = [];
  const loggedErrors: unknown[] = [];
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args);
  };
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url.pathname}`);

    if (url.pathname === "/auth/v1/user") {
      return Response.json({
        id: adminId,
        email: "admin@example.com",
      });
    }

    if (url.pathname === "/rest/v1/admin_users" && method === "GET") {
      return Response.json([
        {
          id: adminId,
          email: "admin@example.com",
          full_name: "Admin User",
          role: "admin",
          created_at: "2026-04-28T00:00:00.000Z",
        },
      ]);
    }

    if (url.pathname === "/auth/v1/admin/users" && method === "POST") {
      return await new Promise<Response>((_, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener(
            "abort",
            () => {
              const abortError = new Error("The operation was aborted.");
              abortError.name = "AbortError";
              reject(abortError);
            },
            { once: true },
          );
        }
      });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await createAdminUserRoute(
      createRequest("/api/admin/admin-users", "POST", {
        email: "slow.agent@example.com",
        password: "temp-pass-123",
        full_name: "Slow Agent",
        role: "agent",
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 504);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "NETWORK_ERROR");
    assert.equal(body.error.message, "User creation failed. Try again.");
    assert.equal(body.error.detail, "Supabase auth timed out while creating the user.");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "POST /auth/v1/admin/users",
      "GET /auth/v1/admin/users",
    ]);
    assert.equal(
      loggedErrors.some((entry) => {
        if (!Array.isArray(entry)) {
          return false;
        }

        return entry[0] === "AUTH CREATE ERROR:";
      }),
      true,
    );
  } finally {
    console.error = originalConsoleError;
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin can update another user's role", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls);

  try {
    const response = await updateAdminUserRoute(
      createRequest(`/api/admin/admin-users/${managedUserId}`, "PATCH", {
        full_name: "Managed Agent",
        role: "agent",
      }),
      {
        params: Promise.resolve({ id: managedUserId }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.adminUser.role, "agent");
    assert.equal(body.data.adminUser.full_name, "Managed Agent");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/admin_users",
      "PATCH /rest/v1/admin_users",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin can still create an agent when audit logging fails", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url.pathname}`);

    if (url.pathname === "/auth/v1/user") {
      return Response.json({
        id: adminId,
        email: "admin@example.com",
      });
    }

    if (url.pathname === "/rest/v1/admin_users" && method === "GET") {
      return Response.json([
        {
          id: adminId,
          email: "admin@example.com",
          full_name: "Admin User",
          role: "admin",
          created_at: "2026-04-28T00:00:00.000Z",
        },
      ]);
    }

    if (url.pathname === "/auth/v1/admin/users" && method === "POST") {
      return Response.json({
        user: {
          id: newUserId,
          email: "new.agent@example.com",
        },
      });
    }

    if (url.pathname === "/rest/v1/admin_users" && method === "POST") {
      return Response.json([
        {
          id: newUserId,
          email: "new.agent@example.com",
          full_name: "New Agent",
          role: "agent",
          created_at: "2026-04-28T00:00:00.000Z",
        },
      ]);
    }

    if (url.pathname === "/rest/v1/audit_logs" && method === "POST") {
      return Response.json({ message: "audit failed" }, { status: 500 });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await createAdminUserRoute(
      createRequest("/api/admin/admin-users", "POST", {
        email: "new.agent@example.com",
        password: "temp-pass-123",
        full_name: "New Agent",
        role: "agent",
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.adminUser.role, "agent");
    assert.equal(body.data.outcome, "created");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin can delete another agent account", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls);

  try {
    const response = await deleteAdminUserRoute(
      createRequest(`/api/admin/admin-users/${managedUserId}`, "DELETE"),
      {
        params: Promise.resolve({ id: managedUserId }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.adminUserId, managedUserId);
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/admin_users",
      `DELETE /auth/v1/admin/users/${managedUserId}`,
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("agent cannot access admin user management routes", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await listAdminUsersRoute(
      createRequest("/api/admin/admin-users", "GET", undefined, "agent-token"),
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error.code, "FORBIDDEN");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { POST as createDishesRoute } from "../app/api/admin/vendors/[id]/dishes/route.ts";
import { POST as replaceHoursRoute } from "../app/api/admin/vendors/[id]/hours/route.ts";
import { POST as createImagesRoute } from "../app/api/admin/vendors/[id]/images/route.ts";

const vendorId = "00000000-0000-4000-8000-000000000001";
const timestamp = "2026-04-22T00:00:00+00:00";

function setAdminEnv(): () => void {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

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
  };
}

function createAdminFetchMock(calls: string[]): typeof fetch {
  return (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url.pathname}`);

    if (url.pathname === "/auth/v1/user") {
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

    if (url.pathname === "/rest/v1/vendor_hours") {
      return Response.json(
        JSON.parse(String(init?.body ?? "[]")).map(
          (row: {
            day_of_week: number;
            open_time: string | null;
            close_time: string | null;
            is_closed: boolean;
          }) => ({
            id: `00000000-0000-4000-9000-00000000000${row.day_of_week}`,
            vendor_id: vendorId,
            day_of_week: row.day_of_week,
            open_time: row.open_time,
            close_time: row.close_time,
            is_closed: row.is_closed,
            created_at: timestamp,
            updated_at: timestamp,
          }),
        ),
      );
    }

    if (url.pathname === "/rest/v1/vendor_images") {
      return Response.json([
        {
          id: "10000000-0000-4000-8000-000000000001",
          vendor_id: vendorId,
          image_url: "/seed-images/vendors/test/cover.jpg",
          sort_order: 0,
          created_at: timestamp,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/vendor_featured_dishes") {
      return Response.json([
        {
          id: "20000000-0000-4000-8000-000000000001",
          vendor_id: vendorId,
          dish_name: "Jollof rice",
          description: "Test dish",
          image_url: null,
          is_featured: true,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/audit_logs") {
      return new Response(null, { status: 201 });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;
}

function createAdminRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/vendors", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function createRouteContext() {
  return {
    params: Promise.resolve({ id: vendorId }),
  };
}

test("admin replace vendor hours route upserts hours and writes audit log", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await replaceHoursRoute(
      createAdminRequest({
        hours: Array.from({ length: 7 }, (_value, day) => ({
          day_of_week: day,
          open_time: day === 0 ? null : "08:00",
          close_time: day === 0 ? null : "18:00",
          is_closed: day === 0,
        })),
      }),
      createRouteContext(),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.hours.length, 7);
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "POST /rest/v1/vendor_hours",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin create vendor images route inserts images and writes audit log", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await createImagesRoute(
      createAdminRequest({
        images: [
          {
            image_url: "/seed-images/vendors/test/cover.jpg",
            sort_order: 0,
          },
        ],
      }),
      createRouteContext(),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.images[0].image_url, "/seed-images/vendors/test/cover.jpg");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "POST /rest/v1/vendor_images",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin create vendor dishes route inserts dishes and writes audit log", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await createDishesRoute(
      createAdminRequest({
        dishes: [
          {
            dish_name: "Jollof rice",
            description: "Test dish",
            image_url: null,
            is_featured: true,
          },
        ],
      }),
      createRouteContext(),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.dishes[0].dish_name, "Jollof rice");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "POST /rest/v1/vendor_featured_dishes",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin vendor image route rejects empty image arrays", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await createImagesRoute(
      createAdminRequest({
        images: [],
      }),
      createRouteContext(),
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

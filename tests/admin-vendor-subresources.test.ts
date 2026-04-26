import assert from "node:assert/strict";
import test from "node:test";
import {
  GET as listDishesRoute,
  POST as createDishesRoute,
} from "../app/api/admin/vendors/[id]/dishes/route.ts";
import { DELETE as deleteDishRoute } from "../app/api/admin/vendors/[id]/dishes/[dishId]/route.ts";
import {
  GET as listHoursRoute,
  POST as replaceHoursRoute,
} from "../app/api/admin/vendors/[id]/hours/route.ts";
import {
  GET as listImagesRoute,
  POST as createImagesRoute,
} from "../app/api/admin/vendors/[id]/images/route.ts";
import { DELETE as deleteImageRoute } from "../app/api/admin/vendors/[id]/images/[imageId]/route.ts";

const vendorId = "00000000-0000-4000-8000-000000000001";
const timestamp = "2026-04-22T00:00:00+00:00";

function setAdminEnv(): () => void {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

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
      if (method === "GET") {
        return Response.json(
          Array.from({ length: 7 }, (_value, dayOfWeek) => ({
            id: `00000000-0000-4000-9000-00000000000${dayOfWeek}`,
            vendor_id: vendorId,
            day_of_week: dayOfWeek,
            open_time: dayOfWeek === 0 ? null : "08:00",
            close_time: dayOfWeek === 0 ? null : "18:00",
            is_closed: dayOfWeek === 0,
            created_at: timestamp,
            updated_at: timestamp,
          })),
        );
      }

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

    if (url.pathname.startsWith(`/storage/v1/object/vendor-images/${vendorId}/`)) {
      return new Response(null, { status: 200 });
    }

    if (url.pathname === "/rest/v1/vendor_images") {
      if (method === "GET") {
        return Response.json([
          {
            id: "10000000-0000-4000-8000-000000000001",
            vendor_id: vendorId,
            image_url:
              `https://example.supabase.co/storage/v1/object/public/vendor-images/${vendorId}/image-1.jpg`,
            storage_object_path: `${vendorId}/image-1.jpg`,
            sort_order: 2,
            created_at: timestamp,
          },
        ]);
      }

      if (method === "POST") {
        const rows = JSON.parse(String(init?.body ?? "[]")) as Array<{
          vendor_id: string;
          image_url: string;
          storage_object_path?: string | null;
          sort_order: number;
        }>;

        return Response.json(
          rows.map((row, index) => ({
            id: `10000000-0000-4000-8000-00000000000${index + 1}`,
            vendor_id: row.vendor_id,
            image_url: row.image_url,
            storage_object_path: row.storage_object_path ?? null,
            sort_order: row.sort_order,
            created_at: timestamp,
          })),
        );
      }

      if (method === "DELETE") {
        return new Response(null, { status: 200 });
      }

      return Response.json([
        {
            id: "10000000-0000-4000-8000-000000000001",
          vendor_id: vendorId,
          image_url:
            `https://example.supabase.co/storage/v1/object/public/vendor-images/${vendorId}/image-1.jpg`,
          storage_object_path: `${vendorId}/image-1.jpg`,
          sort_order: 2,
          created_at: timestamp,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/vendor_featured_dishes") {
      if (method === "DELETE") {
        return new Response(null, { status: 200 });
      }

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

function createAdminGetRequest(): Request {
  return new Request("http://localhost/api/admin/vendors", {
    method: "GET",
    headers: {
      authorization: "Bearer admin-token",
    },
  });
}

function createAdminDeleteRequest(): Request {
  return new Request("http://localhost/api/admin/vendors", {
    method: "DELETE",
    headers: {
      authorization: "Bearer admin-token",
    },
  });
}

function createRouteContext() {
  return {
    params: Promise.resolve({ id: vendorId }),
  };
}

function createImageRouteContext(imageId = "10000000-0000-4000-8000-000000000001") {
  return {
    params: Promise.resolve({ id: vendorId, imageId }),
  };
}

function createDishRouteContext(dishId = "20000000-0000-4000-8000-000000000001") {
  return {
    params: Promise.resolve({ id: vendorId, dishId }),
  };
}

function createMultipartAdminRequest(): Request {
  const body = new FormData();
  body.set(
    "image",
    new File([Uint8Array.from([1, 2, 3, 4])], "cover.jpg", {
      type: "image/jpeg",
    }),
  );
  body.set("sort_order", "2");

  return new Request("http://localhost/api/admin/vendors", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
    },
    body,
  });
}

function createMultipartAdminRequestWithFile(file: File): Request {
  const body = new FormData();
  body.set("image", file);
  body.set("sort_order", "2");

  return new Request("http://localhost/api/admin/vendors", {
    method: "POST",
    headers: {
      authorization: "Bearer admin-token",
    },
    body,
  });
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

test("admin list vendor hours route returns vendor hours", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await listHoursRoute(createAdminGetRequest(), createRouteContext());
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.hours.length, 7);
    assert.equal(body.data.hours[0].is_closed, true);
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/vendor_hours",
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
      createMultipartAdminRequest(),
      createRouteContext(),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.images[0].vendor_id, vendorId);
    assert.equal(body.data.images[0].storage_object_path?.startsWith(`${vendorId}/`), true);
    assert.equal(
      body.data.images[0].image_url.startsWith(
        `https://example.supabase.co/storage/v1/object/public/vendor-images/${vendorId}/`,
      ),
      true,
    );
    const storageCall = calls.find((call) =>
      call.startsWith(`POST /storage/v1/object/vendor-images/${vendorId}/`),
    );

    assert.ok(storageCall);
    assert.deepEqual(
      calls.filter((call) => !call.startsWith(`POST /storage/v1/object/vendor-images/${vendorId}/`)),
      [
        "GET /auth/v1/user",
        "GET /rest/v1/admin_users",
        "POST /rest/v1/vendor_images",
        "POST /rest/v1/audit_logs",
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin create vendor images route uploads a Uint8Array body to storage", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  let storageBody: BodyInit | null | undefined;
  let storageContentType: string | null = null;

  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";

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

    if (url.pathname.startsWith(`/storage/v1/object/vendor-images/${vendorId}/`)) {
      storageBody = init?.body;
      storageContentType = new Headers(init?.headers).get("content-type");
      return new Response(null, { status: 200 });
    }

    if (url.pathname === "/rest/v1/vendor_images" && method === "POST") {
      return Response.json([
        {
          id: "10000000-0000-4000-8000-000000000001",
          vendor_id: vendorId,
          image_url:
            `https://example.supabase.co/storage/v1/object/public/vendor-images/${vendorId}/image-1.jpg`,
          storage_object_path: `${vendorId}/image-1.jpg`,
          sort_order: 2,
          created_at: timestamp,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/audit_logs") {
      return new Response(null, { status: 201 });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await createImagesRoute(
      createMultipartAdminRequest(),
      createRouteContext(),
    );

    assert.equal(response.status, 201);
    assert.ok(storageBody instanceof Uint8Array);
    assert.equal(storageContentType, "image/jpeg");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin create vendor images route surfaces upstream upload failures", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
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

    if (url.pathname.startsWith(`/storage/v1/object/vendor-images/${vendorId}/`)) {
      return Response.json({ message: "storage failed" }, { status: 500 });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await createImagesRoute(
      createMultipartAdminRequest(),
      createRouteContext(),
    );
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "UPSTREAM_ERROR");
    assert.equal(body.error.message, "Storage upload failed: storage failed");
    assert.equal(body.error.details.bucket, "vendor-images");
    assert.equal(body.error.details.upstream_message, "storage failed");
    assert.ok(
      calls.some((call) => call.startsWith(`POST /storage/v1/object/vendor-images/${vendorId}/`)),
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin create vendor images route reports missing service role configuration clearly", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const calls: string[] = [];
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await createImagesRoute(
      createMultipartAdminRequest(),
      createRouteContext(),
    );
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "CONFIGURATION_ERROR");
    assert.equal(
      body.error.message,
      "SUPABASE_SERVICE_ROLE_KEY is required for vendor image uploads.",
    );
    assert.equal(body.error.details.bucket, "vendor-images");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
    ]);
  } finally {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
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

test("admin list vendor dishes route returns dishes for the selected vendor", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await listDishesRoute(createAdminGetRequest(), createRouteContext());
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.dishes[0].vendor_id, vendorId);
    assert.equal(body.data.dishes[0].dish_name, "Jollof rice");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/vendor_featured_dishes",
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

test("admin vendor image route rejects unsupported file types", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await createImagesRoute(
      createMultipartAdminRequestWithFile(
        new File([Uint8Array.from([1, 2, 3])], "notes.txt", {
          type: "text/plain",
        }),
      ),
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

test("admin vendor image route rejects oversized uploads", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await createImagesRoute(
      createMultipartAdminRequestWithFile(
        new File(
          [new Uint8Array(5 * 1024 * 1024 + 1)],
          "large.jpg",
          {
            type: "image/jpeg",
          },
        ),
      ),
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

test("admin list vendor images route returns vendor images", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await listImagesRoute(createAdminGetRequest(), createRouteContext());
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.images[0].storage_object_path, `${vendorId}/image-1.jpg`);
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/vendor_images",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin list vendor images route normalizes storage-only rows into public URLs", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
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

    if (url.pathname === "/rest/v1/vendor_images") {
      return Response.json([
        {
          id: "10000000-0000-4000-8000-000000000001",
          vendor_id: vendorId,
          storage_object_path: `${vendorId}/image-1.jpg`,
          sort_order: 2,
          created_at: timestamp,
        },
      ]);
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await listImagesRoute(createAdminGetRequest(), createRouteContext());
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(
      body.data.images[0].image_url,
      `https://example.supabase.co/storage/v1/object/public/vendor-images/${vendorId}/image-1.jpg`,
    );
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/vendor_images",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin list vendor images route ignores seed-image rows without storage paths", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
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

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await listImagesRoute(createAdminGetRequest(), createRouteContext());
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data.images, []);
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/vendor_images",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin delete vendor image route removes image and storage object", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await deleteImageRoute(
      createAdminDeleteRequest(),
      createImageRouteContext(),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.image.storage_object_path, `${vendorId}/image-1.jpg`);
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/vendor_images",
      "DELETE /storage/v1/object/vendor-images/00000000-0000-4000-8000-000000000001/image-1.jpg",
      "DELETE /rest/v1/vendor_images",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin delete vendor dish route removes a dish and writes audit log", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await deleteDishRoute(
      createAdminDeleteRequest(),
      createDishRouteContext(),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.dish.id, "20000000-0000-4000-8000-000000000001");
    assert.equal(body.data.dish.dish_name, "Jollof rice");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/vendor_featured_dishes",
      "DELETE /rest/v1/vendor_featured_dishes",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

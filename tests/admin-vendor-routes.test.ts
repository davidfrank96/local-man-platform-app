import assert from "node:assert/strict";
import test from "node:test";
import {
  GET as listVendorsRoute,
  POST as createVendorRoute,
} from "../app/api/admin/vendors/route.ts";
import {
  DELETE as deleteVendorRoute,
  PUT as updateVendorRoute,
} from "../app/api/admin/vendors/[id]/route.ts";

const vendorId = "00000000-0000-4000-8000-000000000001";
const timestamp = "2026-04-22T00:00:00+00:00";

const vendorRecord = {
  id: vendorId,
  name: "Test Vendor",
  slug: "test-vendor",
  short_description: "Test vendor",
  phone_number: "+2340000000000",
  address_text: "Test address",
  city: "Abuja",
  area: "Wuse",
  state: "FCT",
  country: "Nigeria",
  latitude: 9.0813,
  longitude: 7.4694,
  price_band: "budget",
  average_rating: 0,
  review_count: 0,
  is_active: true,
  is_open_override: null,
  created_at: timestamp,
  updated_at: timestamp,
};

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

    if (url.pathname === "/rest/v1/vendors") {
      if (method === "GET") {
        return Response.json([vendorRecord]);
      }

      return Response.json([
        {
          ...vendorRecord,
          ...(method === "PATCH" ? JSON.parse(String(init?.body ?? "{}")) : {}),
        },
      ]);
    }

    if (url.pathname === "/rest/v1/vendor_hours") {
      return Response.json([
        {
          vendor_id: vendorId,
          day_of_week: 1,
        },
        {
          vendor_id: vendorId,
          day_of_week: 2,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/vendor_images") {
      return Response.json([
        {
          vendor_id: vendorId,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/vendor_featured_dishes") {
      return Response.json([
        {
          vendor_id: vendorId,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/audit_logs") {
      return new Response(null, { status: 201 });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;
}

function createAdminRequest(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/admin/vendors", {
    method,
    headers: {
      authorization: "Bearer admin-token",
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function createAdminNextRequest(url: string): Parameters<typeof listVendorsRoute>[0] {
  const request = new Request(url, {
    headers: {
      authorization: "Bearer admin-token",
    },
  }) as Request & {
    nextUrl: URL;
  };
  request.nextUrl = new URL(url);

  return request as unknown as Parameters<typeof listVendorsRoute>[0];
}

test("admin list vendors route returns filtered vendor list", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const requestedUrls: URL[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    requestedUrls.push(url);

    return createAdminFetchMock(calls)(input, init);
  }) as typeof fetch;

  try {
    const response = await listVendorsRoute(
      createAdminNextRequest(
        "http://localhost/api/admin/vendors?limit=10&offset=5&search=rice&area=Wuse&is_active=true&price_band=budget",
      ),
    );
    const body = await response.json();
    const vendorUrl = requestedUrls.find((url) => url.pathname === "/rest/v1/vendors");

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.vendors[0].slug, "test-vendor");
    assert.equal(body.data.vendors[0].hours_count, 2);
    assert.equal(body.data.vendors[0].images_count, 1);
    assert.equal(body.data.vendors[0].featured_dishes_count, 1);
    assert.deepEqual(body.data.pagination, {
      limit: 10,
      offset: 5,
      count: 1,
    });
    assert.equal(vendorUrl?.searchParams.get("limit"), "10");
    assert.equal(vendorUrl?.searchParams.get("offset"), "5");
    assert.equal(vendorUrl?.searchParams.get("is_active"), "eq.true");
    assert.equal(vendorUrl?.searchParams.get("price_band"), "eq.budget");
    assert.equal(vendorUrl?.searchParams.get("area"), "ilike.*Wuse*");
    assert.equal(
      vendorUrl?.searchParams.get("or"),
      "(name.ilike.*rice*,short_description.ilike.*rice*,area.ilike.*rice*)",
    );
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/vendors",
      "GET /rest/v1/vendor_hours",
      "GET /rest/v1/vendor_images",
      "GET /rest/v1/vendor_featured_dishes",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin list vendors route rejects invalid query params", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await listVendorsRoute(
      createAdminNextRequest("http://localhost/api/admin/vendors?limit=500"),
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

test("admin list vendors route returns controlled error for malformed upstream payload", async () => {
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

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([{ id: vendorId }]);
    }

    if (
      url.pathname === "/rest/v1/vendor_hours" ||
      url.pathname === "/rest/v1/vendor_images" ||
      url.pathname === "/rest/v1/vendor_featured_dishes"
    ) {
      return Response.json([]);
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await listVendorsRoute(
      createAdminNextRequest("http://localhost/api/admin/vendors"),
    );
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.error.code, "UPSTREAM_ERROR");
    assert.equal(
      body.error.message,
      "Supabase returned an unexpected response shape.",
    );
    assert.ok(Array.isArray(body.error.details.issues));
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/vendors",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin create vendor route writes vendor and audit log", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await createVendorRoute(
      createAdminRequest("POST", {
        name: "Test Vendor",
        slug: "test-vendor",
        short_description: "Test vendor",
        phone_number: "+2340000000000",
        address_text: "Test address",
        city: "Abuja",
        area: "Wuse",
        state: "FCT",
        country: "Nigeria",
        latitude: 9.0813,
        longitude: 7.4694,
        price_band: "budget",
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.vendor.slug, "test-vendor");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "POST /rest/v1/vendors",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin update vendor route patches vendor and writes audit log", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await updateVendorRoute(
      createAdminRequest("PUT", {
        name: "Updated Vendor",
      }),
      {
        params: Promise.resolve({ id: vendorId }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.vendor.name, "Updated Vendor");
    assert.equal(body.data.vendor.slug, "test-vendor");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "PATCH /rest/v1/vendors",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin delete vendor route soft-disables vendor and writes audit log", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createAdminFetchMock(calls);

  try {
    const response = await deleteVendorRoute(createAdminRequest("DELETE"), {
      params: Promise.resolve({ id: vendorId }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data.vendor, {
      vendor_id: vendorId,
      is_active: false,
    });
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "PATCH /rest/v1/vendors",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin create vendor route rejects missing admin token", async () => {
  const response = await createVendorRoute(
    new Request("http://localhost/api/admin/vendors", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Test Vendor",
        slug: "test-vendor",
        latitude: 9.0813,
        longitude: 7.4694,
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "UNAUTHORIZED");
});

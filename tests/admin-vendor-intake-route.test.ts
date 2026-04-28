import assert from "node:assert/strict";
import test from "node:test";
import { POST as vendorIntakeRoute } from "../app/api/admin/vendors/intake/route.ts";

const vendorId = "00000000-0000-4000-8000-000000000301";
const riceCategoryId = "00000000-0000-4000-8000-000000000401";
const grillCategoryId = "00000000-0000-4000-8000-000000000402";
const timestamp = "2026-04-28T00:00:00+00:00";

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

function createFetchMock(
  calls: string[],
  options?: {
    role?: "admin" | "agent";
    existingVendors?: Array<{
      id: string;
      name: string;
      slug: string;
      address_text: string | null;
      area: string | null;
      latitude: number;
      longitude: number;
    }>;
  },
): typeof fetch {
  const role = options?.role ?? "agent";
  const existingVendors = options?.existingVendors ?? [];

  return (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url.pathname}`);

    if (url.pathname === "/auth/v1/user") {
      return Response.json({
        id: role === "admin" ? "admin-id" : "agent-id",
        email: role === "admin" ? "admin@example.com" : "agent@example.com",
      });
    }

    if (url.pathname === "/rest/v1/admin_users") {
      return Response.json([
        {
          id: role === "admin" ? "admin-id" : "agent-id",
          email: role === "admin" ? "admin@example.com" : "agent@example.com",
          full_name: role === "admin" ? "Admin User" : "Agent User",
          role,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/vendor_categories") {
      return Response.json([
        {
          id: riceCategoryId,
          name: "Rice",
          slug: "rice",
          created_at: timestamp,
        },
        {
          id: grillCategoryId,
          name: "Grill",
          slug: "grill",
          created_at: timestamp,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/vendors" && method === "GET") {
      return Response.json(existingVendors);
    }

    if (url.pathname === "/rest/v1/vendors" && method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}"));
      return Response.json([
        {
          id: vendorId,
          name: body.name,
          slug: body.slug,
          short_description: body.short_description ?? null,
          phone_number: body.phone_number ?? null,
          address_text: body.address_text ?? null,
          city: body.city ?? null,
          area: body.area ?? null,
          state: body.state ?? null,
          country: body.country ?? null,
          latitude: body.latitude,
          longitude: body.longitude,
          price_band: null,
          average_rating: 0,
          review_count: 0,
          is_active: true,
          is_open_override: null,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/vendor_category_map" && method === "POST") {
      return new Response(null, { status: 201 });
    }

    if (url.pathname === "/rest/v1/vendor_hours" && method === "POST") {
      const body = JSON.parse(String(init?.body ?? "[]"));
      return Response.json(
        body.map((entry: Record<string, unknown>, index: number) => ({
          id: `00000000-0000-4000-8000-00000000050${index + 1}`,
          vendor_id: entry.vendor_id,
          day_of_week: entry.day_of_week,
          open_time: entry.open_time,
          close_time: entry.close_time,
          is_closed: entry.is_closed,
          created_at: timestamp,
          updated_at: timestamp,
        })),
      );
    }

    if (url.pathname === "/rest/v1/audit_logs") {
      return new Response(null, { status: 201 });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;
}

function createRequest(body: unknown, token = "agent-token"): Request {
  return new Request("http://localhost/api/admin/vendors/intake", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

test("agent can preview vendor intake rows and receives row-level validation errors", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "preview",
        rows: [
          {
            row_number: 2,
            vendor_name: "Mama Put Rice",
            category: "rice",
            address: "Wuse 2, Abuja",
            latitude: "9.0765",
            longitude: "7.3986",
            opening_time: "9 AM",
            closing_time: "8 PM",
          },
          {
            row_number: 3,
            vendor_name: "",
            category: "unknown",
            address: "Garki, Abuja",
            latitude: "",
            longitude: "",
          },
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.validRows.length, 1);
    assert.equal(body.data.invalidRows.length, 1);
    assert.match(body.data.invalidRows[0].errors[0], /Missing vendor name/);
    assert.equal(body.data.invalidRows[0].issues[0].field, "vendor_name");
    assert.equal(body.data.invalidRows[0].issues[0].code, "REQUIRED_FIELD");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/vendor_categories",
      "GET /rest/v1/vendors",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("agent can upload a valid vendor intake row", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows: [
          {
            row_number: 2,
            vendor_name: "Mama Put Rice",
            category: "rice",
            address: "Wuse 2, Abuja",
            latitude: "9.0765",
            longitude: "7.3986",
            phone: "+2348000000000",
            opening_time: "9 AM",
            closing_time: "8 PM",
            description: "Budget rice spot",
          },
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.uploadedRows.length, 1);
    assert.equal(body.data.failedRows.length, 0);
    assert.equal(body.data.uploadedRows[0].vendor.slug, "mama-put-rice");
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/vendor_categories",
      "GET /rest/v1/vendors",
      "POST /rest/v1/vendors",
      "POST /rest/v1/audit_logs",
      "POST /rest/v1/vendor_category_map",
      "POST /rest/v1/vendor_hours",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("upload blocks invalid vendor intake rows before insert", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows: [
          {
            row_number: 2,
            vendor_name: "Mama Put Rice",
            category: "rice",
            address: "Wuse 2, Abuja",
            latitude: "",
            longitude: "",
          },
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.uploadedRows.length, 0);
    assert.equal(body.data.invalidRows.length, 1);
    assert.equal(body.data.failedCount, 1);
    assert.match(body.data.invalidRows[0].errors[0], /Latitude and longitude are required/);
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
      "GET /rest/v1/vendor_categories",
      "GET /rest/v1/vendors",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("upload inserts valid rows even when other rows are invalid", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows: [
          {
            row_number: 2,
            vendor_name: "Mama Put Rice",
            category: "rice",
            address: "Wuse 2, Abuja",
            latitude: "9.0765",
            longitude: "7.3986",
          },
          {
            row_number: 3,
            vendor_name: "",
            category: "rice",
            address: "Garki, Abuja",
            latitude: "9.0800",
            longitude: "7.4000",
          },
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.uploadedRows.length, 1);
    assert.equal(body.data.invalidRows.length, 1);
    assert.equal(body.data.successCount, 1);
    assert.equal(body.data.failedCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("preview detects duplicate vendors within the csv file and against existing vendors", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, {
    role: "agent",
    existingVendors: [
      {
        id: "00000000-0000-4000-8000-000000000999",
        name: "Mama Put Rice",
        slug: "mama-put-rice",
        address_text: "Wuse 2, Abuja",
        area: "Wuse 2, Abuja",
        latitude: 9.0765,
        longitude: 7.3986,
      },
    ],
  });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "preview",
        rows: [
          {
            row_number: 2,
            vendor_name: "Mama Put Rice",
            category: "rice",
            address: "Wuse 2, Abuja",
            latitude: "9.0765",
            longitude: "7.3986",
          },
          {
            row_number: 3,
            vendor_name: " Mama Put Rice ",
            category: "rice",
            address: "Wuse 2 Abuja",
            latitude: "9.0766",
            longitude: "7.3985",
          },
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.validRows.length, 0);
    assert.equal(body.data.invalidRows.length, 2);
    assert.match(JSON.stringify(body.data.invalidRows[0].issues), /DUPLICATE_EXISTING_VENDOR/);
    assert.match(JSON.stringify(body.data.invalidRows[1].issues), /DUPLICATE_IN_FILE/);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { POST as vendorIntakeRoute } from "../app/api/admin/vendors/intake/route.ts";
import { vendorCsvTemplateHeaders } from "../lib/admin/vendor-intake-contract.ts";

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

function createFullVendorRow(
  overrides: Partial<Record<string, string | number>> = {},
) {
  return {
    row_number: 2,
    vendor_name: "Mama Put Rice",
    slug: "",
    category: "rice",
    price_band: "budget",
    description: "Budget rice spot",
    phone: "+2348000000000",
    address: "14 Aminu Kano Crescent, Wuse 2, Abuja",
    area: "Wuse 2",
    city: "Abuja",
    state: "FCT",
    country: "Nigeria",
    latitude: "9.0765",
    longitude: "7.3986",
    is_active: "true",
    monday_open: "8 AM",
    monday_close: "8 PM",
    tuesday_open: "8 AM",
    tuesday_close: "8 PM",
    wednesday_open: "8 AM",
    wednesday_close: "8 PM",
    thursday_open: "8 AM",
    thursday_close: "8 PM",
    friday_open: "8 AM",
    friday_close: "9 PM",
    saturday_open: "9 AM",
    saturday_close: "9 PM",
    sunday_open: "10 AM",
    sunday_close: "6 PM",
    dish_1_name: "Jollof Rice Bowl",
    dish_1_description: "Rice with beef and plantain",
    dish_1_image_url: "https://images.example.com/jollof.jpg",
    dish_2_name: "Chicken Suya Combo",
    dish_2_description: "Chicken and fries",
    dish_2_image_url: "https://images.example.com/suya.jpg",
    image_url_1: "https://images.example.com/vendor-front.jpg",
    image_sort_order_1: "0",
    image_url_2: "https://images.example.com/vendor-counter.jpg",
    image_sort_order_2: "1",
    ...overrides,
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
    failCategoryInsert?: boolean;
    failDishInsert?: boolean;
    failImageInsert?: boolean;
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
          price_band: body.price_band ?? null,
          average_rating: 0,
          review_count: 0,
          is_active: body.is_active,
          is_open_override: null,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/vendors" && method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/rest/v1/vendor_category_map" && method === "POST") {
      if (options?.failCategoryInsert) {
        return Response.json({ message: "category failed" }, { status: 500 });
      }

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

    if (url.pathname === "/rest/v1/vendor_featured_dishes" && method === "POST") {
      if (options?.failDishInsert) {
        return Response.json({ message: "dish failed" }, { status: 500 });
      }

      const body = JSON.parse(String(init?.body ?? "[]"));
      return Response.json(
        body.map((entry: Record<string, unknown>, index: number) => ({
          id: `00000000-0000-4000-8000-00000000060${index + 1}`,
          vendor_id: entry.vendor_id,
          dish_name: entry.dish_name,
          description: entry.description ?? null,
          image_url: entry.image_url ?? null,
          is_featured: entry.is_featured,
          created_at: timestamp,
          updated_at: timestamp,
        })),
      );
    }

    if (url.pathname === "/rest/v1/vendor_images" && method === "POST") {
      if (options?.failImageInsert) {
        return Response.json({ message: "image failed" }, { status: 500 });
      }

      const body = JSON.parse(String(init?.body ?? "[]"));
      return Response.json(
        body.map((entry: Record<string, unknown>, index: number) => ({
          id: `00000000-0000-4000-8000-00000000070${index + 1}`,
          vendor_id: entry.vendor_id,
          image_url: entry.image_url,
          storage_object_path: entry.storage_object_path ?? null,
          sort_order: entry.sort_order,
          created_at: timestamp,
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

test("CSV template headers expose the full vendor intake contract", () => {
  assert.ok(vendorCsvTemplateHeaders.includes("price_band"));
  assert.ok(vendorCsvTemplateHeaders.includes("monday_open"));
  assert.ok(vendorCsvTemplateHeaders.includes("sunday_close"));
  assert.ok(vendorCsvTemplateHeaders.includes("dish_1_name"));
  assert.ok(vendorCsvTemplateHeaders.includes("image_url_1"));
  assert.ok(!vendorCsvTemplateHeaders.includes("opening_time"));
  assert.ok(!vendorCsvTemplateHeaders.includes("closing_time"));
});

test("agent can preview full vendor intake rows and receives row-level validation errors", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "preview",
        rows: [
          createFullVendorRow(),
          createFullVendorRow({
            row_number: 3,
            vendor_name: "",
            price_band: "",
            monday_open: "8 AM",
            monday_close: "",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.validRows.length, 1);
    assert.equal(body.data.invalidRows.length, 1);
    assert.match(JSON.stringify(body.data.invalidRows[0].issues), /Missing vendor name/);
    assert.match(JSON.stringify(body.data.invalidRows[0].issues), /Missing price_band/);
    assert.match(JSON.stringify(body.data.invalidRows[0].issues), /INCOMPLETE_HOURS/);
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

test("agent can upload a valid full vendor intake row", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows: [createFullVendorRow()],
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
      "POST /rest/v1/vendor_featured_dishes",
      "POST /rest/v1/audit_logs",
      "POST /rest/v1/vendor_images",
      "POST /rest/v1/audit_logs",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("upload blocks invalid coordinates and invalid weekly hours before insert", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows: [
          createFullVendorRow({
            latitude: "",
            longitude: "",
            friday_open: "9 AM",
            friday_close: "",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.uploadedRows.length, 0);
    assert.equal(body.data.invalidRows.length, 1);
    assert.equal(body.data.failedCount, 1);
    assert.match(JSON.stringify(body.data.invalidRows[0].issues), /REQUIRED_COORDINATES/);
    assert.match(JSON.stringify(body.data.invalidRows[0].issues), /INCOMPLETE_HOURS/);
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

test("upload parses featured dishes and image URLs from full CSV rows", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "preview",
        rows: [createFullVendorRow()],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.validRows[0].featured_dishes.length, 2);
    assert.equal(body.data.validRows[0].image_urls.length, 2);
    assert.equal(body.data.validRows[0].open_days, 7);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("preview rejects the old quick-add CSV row format with helpful missing-field errors", async () => {
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
            vendor_name: "Legacy Quick Add",
            category: "rice",
            address: "Wuse 2, Abuja",
            latitude: "9.0765",
            longitude: "7.3986",
            phone: "+2348000000000",
            opening_time: "9 AM",
            closing_time: "8 PM",
            description: "Legacy row",
          },
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.validRows.length, 0);
    assert.equal(body.data.invalidRows.length, 1);
    assert.match(JSON.stringify(body.data.invalidRows[0].issues), /Missing price_band/);
    assert.match(JSON.stringify(body.data.invalidRows[0].issues), /Missing area/);
    assert.match(JSON.stringify(body.data.invalidRows[0].issues), /At least one day of operating hours is required/);
    assert.match(JSON.stringify(body.data.invalidRows[0].issues), /At least one featured dish is required/);
    assert.match(JSON.stringify(body.data.invalidRows[0].issues), /At least one remote image URL is required/);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("upload inserts valid rows even when other rows are invalid", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createFetchMock([], { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows: [
          createFullVendorRow(),
          createFullVendorRow({
            row_number: 3,
            vendor_name: "",
          }),
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
        address_text: "14 Aminu Kano Crescent, Wuse 2, Abuja",
        area: "Wuse 2",
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
          createFullVendorRow(),
          createFullVendorRow({
            row_number: 3,
            vendor_name: " Mama Put Rice ",
            address: "14 Aminu Kano Crescent Wuse 2 Abuja",
            latitude: "9.0766",
            longitude: "7.3985",
            image_url_1: "https://images.example.com/second.jpg",
          }),
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

test("upload rolls back vendor creation when a linked insert fails", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent", failDishInsert: true });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows: [createFullVendorRow()],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.uploadedRows.length, 0);
    assert.equal(body.data.failedRows.length, 1);
    assert.match(body.data.failedRows[0].error, /Vendor upload failed|Supabase admin operation failed|dish failed|Vendor upload failed/);
    assert.ok(calls.includes("DELETE /rest/v1/vendors"));
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

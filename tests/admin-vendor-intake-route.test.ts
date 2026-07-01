import assert from "node:assert/strict";
import test from "node:test";
import {
  POST as vendorIntakeRoute,
  VENDOR_INTAKE_MAX_JSON_BODY_BYTES,
} from "../app/api/admin/vendors/intake/route.ts";
import {
  vendorCsvTemplateHeaders,
  vendorCsvTemplateRows,
} from "../lib/admin/vendor-intake-contract.ts";
import { DEFAULT_MAX_JSON_BODY_BYTES } from "../lib/api/validation.ts";

const vendorId = "00000000-0000-4000-8000-000000000301";
const riceCategoryId = "00000000-0000-4000-8000-000000000401";
const grillCategoryId = "00000000-0000-4000-8000-000000000402";
const swallowCategoryId = "00000000-0000-4000-8000-000000000403";
const drinksCategoryId = "00000000-0000-4000-8000-000000000404";
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
    dish_3_name: "Zobo Drink",
    dish_3_description: "Chilled hibiscus drink",
    dish_3_image_url: "https://images.example.com/zobo.jpg",
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
    createdVendorBodies?: Array<Record<string, unknown>>;
    createdCategoryBodies?: Array<Record<string, unknown>>;
    createdHoursBodies?: Array<Array<Record<string, unknown>>>;
    createdDishBodies?: Array<Array<Record<string, unknown>>>;
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
        {
          id: swallowCategoryId,
          name: "Swallow",
          slug: "swallow",
          created_at: timestamp,
        },
        {
          id: drinksCategoryId,
          name: "Drinks",
          slug: "drinks",
          created_at: timestamp,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/vendors" && method === "GET") {
      return Response.json(existingVendors);
    }

    if (url.pathname === "/rest/v1/vendors" && method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}"));
      options?.createdVendorBodies?.push(body);
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

      options?.createdCategoryBodies?.push(JSON.parse(String(init?.body ?? "{}")));
      return new Response(null, { status: 201 });
    }

    if (url.pathname === "/rest/v1/vendor_hours" && method === "POST") {
      const body = JSON.parse(String(init?.body ?? "[]"));
      options?.createdHoursBodies?.push(body);
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
      options?.createdDishBodies?.push(body);
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

function createJsonRequestWithContentLength(
  body: string,
  contentLength: number,
  token = "agent-token",
): Request {
  return new Request("http://localhost/api/admin/vendors/intake", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-length": String(contentLength),
      "content-type": "application/json",
    },
    body,
  });
}

function createSizedPreviewRequestBody(): string {
  const rows = Array.from({ length: 48 }, (_, index) =>
    createFullVendorRow({
      row_number: index + 2,
      vendor_name: `Large Preview Vendor ${index + 1}`,
      slug: `large-preview-vendor-${index + 1}`,
      description: `Batch preview payload filler ${String(index + 1).padStart(2, "0")} ${"rice ".repeat(20)}`,
    })
  );
  const body = JSON.stringify({ action: "preview", rows });
  const byteLength = new TextEncoder().encode(body).byteLength;

  assert.ok(
    byteLength > DEFAULT_MAX_JSON_BODY_BYTES,
    `Expected preview fixture to exceed shared default limit, got ${byteLength}`,
  );
  assert.ok(
    byteLength < VENDOR_INTAKE_MAX_JSON_BODY_BYTES,
    `Expected preview fixture to fit intake limit, got ${byteLength}`,
  );

  return body;
}

async function uploadRowsAndCaptureDishes(
  rows: Array<ReturnType<typeof createFullVendorRow>>,
): Promise<{
  status: number;
  body: {
    success: boolean;
    data: {
      uploadedRows: unknown[];
      failedRows: unknown[];
    };
  };
  dishes: Array<Record<string, unknown>>;
}> {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const createdDishBodies: Array<Array<Record<string, unknown>>> = [];
  globalThis.fetch = createFetchMock([], { role: "agent", createdDishBodies });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows,
      }),
    );
    const body = await response.json();

    return {
      status: response.status,
      body,
      dishes: createdDishBodies[0] ?? [],
    };
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
}

test("CSV template headers expose the full vendor intake contract", () => {
  assert.ok(vendorCsvTemplateHeaders.includes("price_band"));
  assert.ok(!vendorCsvTemplateHeaders.includes("category"));
  assert.ok(vendorCsvTemplateHeaders.includes("category_1"));
  assert.ok(vendorCsvTemplateHeaders.includes("category_6"));
  assert.ok(vendorCsvTemplateHeaders.includes("monday_open"));
  assert.ok(vendorCsvTemplateHeaders.includes("sunday_close"));
  assert.ok(vendorCsvTemplateHeaders.includes("dish_1_name"));
  assert.ok(vendorCsvTemplateHeaders.includes("dish_3_name"));
  assert.ok(vendorCsvTemplateHeaders.includes("dish_3_description"));
  assert.ok(vendorCsvTemplateHeaders.includes("dish_3_image_url"));
  assert.ok(vendorCsvTemplateHeaders.includes("image_url_1"));
  assert.ok(!vendorCsvTemplateHeaders.includes("opening_time"));
  assert.ok(!vendorCsvTemplateHeaders.includes("closing_time"));
});

test("CSV template models area as high-level area and address as detailed locality", () => {
  const areaIndex = vendorCsvTemplateHeaders.indexOf("area");
  const addressIndex = vendorCsvTemplateHeaders.indexOf("address");
  const templateRow = vendorCsvTemplateRows[0];

  assert.equal(templateRow[areaIndex], "Wuse");
  assert.match(String(templateRow[addressIndex]), /Zone 2/);
  assert.match(String(templateRow[addressIndex]), /Wuse/);
});

test("vendor intake preview accepts payloads above shared default but below intake limit", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });
  const body = createSizedPreviewRequestBody();

  try {
    const response = await vendorIntakeRoute(
      createJsonRequestWithContentLength(
        body,
        new TextEncoder().encode(body).byteLength,
      ),
    );
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.equal(payload.data.totalRows, 48);
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

test("vendor intake rejects payloads above the route-specific intake limit", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createJsonRequestWithContentLength(
        "{}",
        VENDOR_INTAKE_MAX_JSON_BODY_BYTES + 1,
      ),
    );
    const body = await response.json();

    assert.equal(response.status, 413);
    assert.equal(body.success, false);
    assert.equal(body.error.message, "Request body is too large.");
    assert.equal(body.error.details.max_bytes, VENDOR_INTAKE_MAX_JSON_BODY_BYTES);
    assert.deepEqual(calls, [
      "GET /auth/v1/user",
      "GET /rest/v1/admin_users",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
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

test("CSV upload maps weekday columns to the canonical platform day indexes", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const createdHoursBodies: Array<Array<Record<string, unknown>>> = [];
  globalThis.fetch = createFetchMock([], { role: "agent", createdHoursBodies });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows: [
          createFullVendorRow({
            monday_open: "8:00 AM",
            monday_close: "6:00 PM",
            sunday_open: "",
            sunday_close: "",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.uploadedRows.length, 1);
    assert.equal(createdHoursBodies.length, 1);

    const mondayHours = createdHoursBodies[0].find((entry) => entry.day_of_week === 1);
    const sundayHours = createdHoursBodies[0].find((entry) => entry.day_of_week === 0);

    assert.deepEqual(mondayHours, {
      vendor_id: vendorId,
      day_of_week: 1,
      open_time: "08:00",
      close_time: "18:00",
      is_closed: false,
    });
    assert.deepEqual(sundayHours, {
      vendor_id: vendorId,
      day_of_week: 0,
      open_time: null,
      close_time: null,
      is_closed: true,
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("upload attaches every valid unique category from numbered CSV columns", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const createdCategoryBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = createFetchMock(calls, {
    role: "agent",
    createdCategoryBodies,
  });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows: [
          createFullVendorRow({
            category: "",
            category_1: "rice",
            category_2: "swallow",
            category_3: "drinks",
            category_4: "rice",
            category_5: "unknown-category",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.uploadedRows.length, 1);
    assert.equal(body.data.invalidRows.length, 0);
    assert.deepEqual(
      body.data.validRows[0].categories,
      ["rice", "swallow", "drinks"],
    );
    assert.match(JSON.stringify(body.data.validRows[0].warnings), /DUPLICATE_CATEGORY_SKIPPED/);
    assert.match(JSON.stringify(body.data.validRows[0].warnings), /INVALID_CATEGORY_SKIPPED/);
    assert.deepEqual(
      createdCategoryBodies.map((entry) => entry.category_id),
      [riceCategoryId, swallowCategoryId, drinksCategoryId],
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("upload ignores legacy category when numbered category columns are present", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const createdCategoryBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = createFetchMock(calls, {
    role: "agent",
    createdCategoryBodies,
  });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows: [
          createFullVendorRow({
            category: "rice",
            category_1: "swallow",
            category_2: "drinks",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(
      body.data.validRows[0].categories,
      ["swallow", "drinks"],
    );
    assert.deepEqual(
      createdCategoryBodies.map((entry) => entry.category_id),
      [swallowCategoryId, drinksCategoryId],
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("upload fails only when no valid category exists", async () => {
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
            category: "",
            category_1: "unknown-category",
            category_2: "another-unknown-category",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.uploadedRows.length, 0);
    assert.equal(body.data.invalidRows.length, 1);
    assert.match(JSON.stringify(body.data.invalidRows[0].issues), /NO_VALID_CATEGORY/);
    assert.match(JSON.stringify(body.data.invalidRows[0].warnings), /INVALID_CATEGORY_SKIPPED/);
    assert.ok(!calls.includes("POST /rest/v1/vendor_category_map"));
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
    assert.equal(body.data.validRows[0].featured_dishes.length, 3);
    assert.deepEqual(body.data.validRows[0].featured_dishes, [
      "Jollof Rice Bowl",
      "Chicken Suya Combo",
      "Zobo Drink",
    ]);
    assert.equal(body.data.validRows[0].image_urls.length, 2);
    assert.equal(body.data.validRows[0].open_days, 7);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("CSV upload inserts all three featured dish slots", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const createdDishBodies: Array<Array<Record<string, unknown>>> = [];
  globalThis.fetch = createFetchMock([], { role: "agent", createdDishBodies });

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
    assert.equal(createdDishBodies.length, 1);
    assert.deepEqual(
      createdDishBodies[0].map((dish) => dish.dish_name),
      ["Jollof Rice Bowl", "Chicken Suya Combo", "Zobo Drink"],
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("CSV upload creates one featured dish when only dish slot 1 is supplied", async () => {
  const result = await uploadRowsAndCaptureDishes([
    createFullVendorRow({
      dish_2_name: "",
      dish_2_description: "",
      dish_2_image_url: "",
      dish_3_name: "",
      dish_3_description: "",
      dish_3_image_url: "",
    }),
  ]);

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.uploadedRows.length, 1);
  assert.deepEqual(
    result.dishes.map((dish) => dish.dish_name),
    ["Jollof Rice Bowl"],
  );
});

test("CSV upload creates two featured dishes when only dish slots 1 and 2 are supplied", async () => {
  const result = await uploadRowsAndCaptureDishes([
    createFullVendorRow({
      dish_3_name: "",
      dish_3_description: "",
      dish_3_image_url: "",
    }),
  ]);

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(
    result.dishes.map((dish) => dish.dish_name),
    ["Jollof Rice Bowl", "Chicken Suya Combo"],
  );
});

test("CSV upload preserves three distinct featured dish slots", async () => {
  const result = await uploadRowsAndCaptureDishes([
    createFullVendorRow({
      dish_1_name: "Bitter leave soup and fufu",
      dish_1_description: "Bitter leave soup and fufu",
      dish_2_name: "Egusi soup with Garri",
      dish_2_description: "Egusi soup with Garri",
      dish_3_name: "Jollof Rice",
      dish_3_description: "Jollof Rice",
    }),
  ]);

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(
    result.dishes.map((dish) => dish.dish_name),
    ["Bitter leave soup and fufu", "Egusi soup with Garri", "Jollof Rice"],
  );
});

test("CSV upload leaves missing dish slots absent instead of creating blank rows", async () => {
  const result = await uploadRowsAndCaptureDishes([
    createFullVendorRow({
      dish_2_name: "",
      dish_2_description: "",
      dish_2_image_url: "",
      dish_3_name: "",
      dish_3_description: "",
      dish_3_image_url: "",
    }),
  ]);

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.dishes.length, 1);
  assert.deepEqual(Object.keys(result.dishes[0]).sort(), [
    "description",
    "dish_name",
    "image_url",
    "is_featured",
    "vendor_id",
  ]);
});

test("CSV upload does not copy dish slot 1 into missing dish slots", async () => {
  const result = await uploadRowsAndCaptureDishes([
    createFullVendorRow({
      dish_1_name: "Ofada Rice",
      dish_1_description: "Ofada Rice",
      dish_2_name: "",
      dish_2_description: "",
      dish_2_image_url: "",
      dish_3_name: "",
      dish_3_description: "",
      dish_3_image_url: "",
    }),
  ]);

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(
    result.dishes.map((dish) => dish.dish_name),
    ["Ofada Rice"],
  );
  assert.equal(result.dishes.filter((dish) => dish.dish_name === "Ofada Rice").length, 1);
});

test("CSV upload keeps duplicate dish rows only when the source explicitly repeats them", async () => {
  const result = await uploadRowsAndCaptureDishes([
    createFullVendorRow({
      dish_1_name: "Suya",
      dish_1_description: "Suya",
      dish_2_name: "Suya",
      dish_2_description: "Suya",
      dish_3_name: "Suya",
      dish_3_description: "Suya",
    }),
  ]);

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(
    result.dishes.map((dish) => dish.dish_name),
    ["Suya", "Suya", "Suya"],
  );
});

test("CSV upload preserves batch-style distinct dish values without fallback", async () => {
  const result = await uploadRowsAndCaptureDishes([
    createFullVendorRow({
      vendor_name: "Gub's Kitchen",
      dish_1_name: "Semo with Egusi soup",
      dish_1_description: "Semo with Egusi soup",
      dish_2_name: "White Rice and tomato sauce",
      dish_2_description: "White Rice and tomato sauce",
      dish_3_name: "Pounded Yam and okra soup",
      dish_3_description: "Pounded Yam and okra soup",
    }),
  ]);

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(
    result.dishes.map((dish) => dish.dish_name),
    [
      "Semo with Egusi soup",
      "White Rice and tomato sauce",
      "Pounded Yam and okra soup",
    ],
  );
});

test("CSV preview accepts leading-zero and compact-meridiem hours", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "preview",
        rows: [
          createFullVendorRow({
            monday_open: "08:00 AM",
            monday_close: "08:00PM",
            tuesday_open: "08:30 AM",
            tuesday_close: "05:30 PM",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.validRows.length, 1);
    assert.equal(body.data.invalidRows.length, 0);
    assert.equal(body.data.validRows[0].open_days, 7);
    assert.doesNotMatch(JSON.stringify(body.data.rows[0].issues), /INVALID_TIME/);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("CSV upload allows missing vendor images with a warning and skips image insert", async () => {
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
            image_url_1: "",
            image_sort_order_1: "0",
            image_url_2: "",
            image_sort_order_2: "1",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.uploadedRows.length, 1);
    assert.equal(body.data.failedRows.length, 0);
    assert.equal(body.data.rows[0].image_urls.length, 0);
    assert.ok(
      body.data.rows[0].warnings.some((warning: { code: string }) => warning.code === "MISSING_IMAGE"),
    );
    assert.equal(calls.includes("POST /rest/v1/vendor_images"), false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("CSV upload selects the first valid Nigerian phone from multiple numbers", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const createdVendorBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = createFetchMock([], { role: "agent", createdVendorBodies });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows: [
          createFullVendorRow({
            phone: "09039036107, 08148822097",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.uploadedRows.length, 1);
    assert.equal(createdVendorBodies[0].phone_number, "2349039036107");
    assert.ok(
      body.data.rows[0].warnings.some((warning: { code: string }) => warning.code === "MULTIPLE_PHONES"),
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("CSV preview fails rows with no valid Nigerian phone number", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createFetchMock([], { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "preview",
        rows: [
          createFullVendorRow({
            phone: "not a phone, also bad",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.validRows.length, 0);
    assert.equal(body.data.invalidRows.length, 1);
    assert.match(JSON.stringify(body.data.invalidRows[0].issues), /INVALID_PHONE/);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("CSV upload preserves supplied slugs instead of overwriting them", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const createdVendorBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = createFetchMock([], { role: "agent", createdVendorBodies });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows: [
          createFullVendorRow({
            vendor_name: "Mama Put Rice",
            slug: "custom-production-slug",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.uploadedRows.length, 1);
    assert.equal(body.data.uploadedRows[0].vendor.slug, "custom-production-slug");
    assert.equal(createdVendorBodies[0].slug, "custom-production-slug");
    assert.equal(
      body.data.rows[0].warnings.some((warning: { code: string }) => warning.code === "GENERATED_SLUG"),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("CSV preview normalizes known governed areas without blocking rows", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "preview",
        rows: [
          createFullVendorRow({
            area: "wuse",
          }),
          createFullVendorRow({
            row_number: 3,
            vendor_name: "Jabi Grill Corner",
            category: "grill",
            area: "JABI",
            address: "Shop 2, Jabi Lake Mall, Abuja",
            latitude: "9.0792",
            longitude: "7.4262",
            image_url_1: "https://images.example.com/jabi-grill.jpg",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.validRows.length, 2);
    assert.equal(body.data.invalidRows.length, 0);
    assert.equal(body.data.rows[0].original_area, "wuse");
    assert.equal(body.data.rows[0].normalized_area, "Wuse");
    assert.equal(body.data.rows[0].area, "Wuse");
    assert.equal(body.data.rows[0].area_status, "known");
    assert.equal(body.data.rows[0].warnings.length, 1);
    assert.equal(body.data.rows[0].warnings[0].code, "GENERATED_SLUG");
    assert.equal(body.data.rows[1].original_area, "JABI");
    assert.equal(body.data.rows[1].normalized_area, "Jabi");
    assert.equal(body.data.rows[1].area, "Jabi");
    assert.equal(body.data.rows[1].area_status, "known");
    assert.equal(body.data.rows[1].warnings.length, 1);
    assert.equal(body.data.rows[1].warnings[0].code, "GENERATED_SLUG");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("CSV preview warns on unknown areas without blocking import eligibility", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "preview",
        rows: [
          createFullVendorRow({
            area: "Frank Area",
          }),
          createFullVendorRow({
            row_number: 3,
            vendor_name: "Wuse Zone Rice",
            area: "Wuse Zone 2",
            address: "Zone 2, Aminu Kano Crescent, Abuja",
            latitude: "9.0845",
            longitude: "7.4035",
            image_url_1: "https://images.example.com/wuse-zone-rice.jpg",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.validRows.length, 2);
    assert.equal(body.data.invalidRows.length, 0);
    assert.equal(body.data.rows[0].area, "Frank Area");
    assert.equal(body.data.rows[0].normalized_area, null);
    assert.equal(body.data.rows[0].area_status, "unknown");
    assert.equal(body.data.rows[0].warnings.length, 2);
    assert.ok(
      body.data.rows[0].warnings.some((warning: { code: string }) => warning.code === "UNKNOWN_AREA"),
    );
    assert.equal(body.data.rows[1].area, "Wuse Zone 2");
    assert.equal(body.data.rows[1].area_status, "unknown");
    assert.equal(body.data.rows[1].warnings.length, 2);
    assert.ok(
      body.data.rows[1].warnings.some((warning: { code: string }) => warning.code === "UNKNOWN_AREA"),
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("CSV upload stores canonical governed areas and still uploads unknown areas with warnings", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const createdVendorBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = createFetchMock([], { role: "agent", createdVendorBodies });

  try {
    const response = await vendorIntakeRoute(
      createRequest({
        action: "upload",
        rows: [
          createFullVendorRow({
            area: "garki",
          }),
          createFullVendorRow({
            row_number: 3,
            vendor_name: "Custom Market Rice",
            area: "Custom Market Area",
            address: "Custom Market, Abuja",
            latitude: "9.0885",
            longitude: "7.4115",
            image_url_1: "https://images.example.com/custom-market-rice.jpg",
          }),
        ],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.uploadedRows.length, 2);
    assert.equal(body.data.failedRows.length, 0);
    assert.equal(createdVendorBodies[0].area, "Garki");
    assert.equal(createdVendorBodies[1].area, "Custom Market Area");
    assert.equal(body.data.rows[0].warnings.length, 1);
    assert.equal(body.data.rows[0].warnings[0].code, "GENERATED_SLUG");
    assert.equal(body.data.rows[1].warnings.length, 2);
    assert.ok(
      body.data.rows[1].warnings.some((warning: { suggestedAction: string }) =>
        /Review area/.test(warning.suggestedAction)
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("preview rejects the old legacy CSV row format with helpful missing-field errors", async () => {
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
            vendor_name: "Legacy CSV Vendor",
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
    assert.match(JSON.stringify(body.data.invalidRows[0].warnings), /MISSING_IMAGE/);
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

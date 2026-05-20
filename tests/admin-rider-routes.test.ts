import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  GET as listRidersRoute,
  POST as createRiderRoute,
} from "../app/api/admin/riders/route.ts";
import {
  GET as getRiderRoute,
  PATCH as updateRiderRoute,
} from "../app/api/admin/riders/[id]/route.ts";

const adminId = "00000000-0000-4000-8000-000000000101";
const agentId = "00000000-0000-4000-8000-000000000102";
const riderId = "11111111-1111-4111-8111-111111111111";
const createdRiderId = "22222222-2222-4222-8222-222222222222";
const timestamp = "2026-05-17T00:00:00.000Z";

const riderRecord = {
  id: riderId,
  display_name: "Musa Rider",
  full_name: "Musa Abdullahi",
  phone: "+2348012345678",
  whatsapp_phone: "+2348012345678",
  photo_url: null,
  vehicle_type: "Motorcycle",
  plate_number: "ABC-123",
  operating_areas: ["Wuse", "Garki"],
  usual_available_hours: { label: "Weekdays 9am-6pm" },
  verification_status: "pending",
  visibility_status: "hidden",
  notes: "New application",
  consent_accepted_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp,
};

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

function createAdminNextRequest(url: string, token = "admin-token"): Parameters<typeof listRidersRoute>[0] {
  const request = new Request(url, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  }) as Request & {
    nextUrl: URL;
  };
  request.nextUrl = new URL(url);

  return request as unknown as Parameters<typeof listRidersRoute>[0];
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

function createFetchMock(
  calls: string[],
  options?: {
    role?: "admin" | "agent";
    createBodies?: unknown[];
    updateBodies?: unknown[];
    auditBodies?: unknown[];
    duplicateRider?: boolean;
    riderFailure?: boolean;
    capturedRiderHeaders?: HeadersInit[];
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

    if (url.pathname === "/rest/v1/admin_users") {
      return Response.json([
        {
          id: role === "admin" ? adminId : agentId,
          email: role === "admin" ? "admin@example.com" : "agent@example.com",
          full_name: role === "admin" ? "Admin User" : "Agent User",
          role,
          created_at: timestamp,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/riders") {
      options?.capturedRiderHeaders?.push(init?.headers ?? {});

      if (options?.riderFailure) {
        return Response.json(
          { message: "permission denied for service-role-key" },
          { status: 403 },
        );
      }

      if (
        method === "GET" &&
        (url.searchParams.has("phone") || url.searchParams.has("whatsapp_phone"))
      ) {
        return Response.json(options?.duplicateRider ? [riderRecord] : []);
      }

      if (method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        options?.createBodies?.push(body);
        return Response.json([
          {
            ...body,
            id: createdRiderId,
            photo_url: null,
            created_at: timestamp,
            updated_at: timestamp,
          },
        ]);
      }

      if (method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        options?.updateBodies?.push(body);
        return Response.json([
          {
            ...riderRecord,
            ...body,
            updated_at: "2026-05-17T01:00:00.000Z",
          },
        ]);
      }

      return Response.json([riderRecord]);
    }

    if (url.pathname === "/rest/v1/rider_contact_intents") {
      return Response.json([
        { rider_id: riderId },
        { rider_id: riderId },
      ]);
    }

    if (url.pathname === "/rest/v1/rider_unavailable_reports") {
      return Response.json([
        { rider_id: riderId },
      ]);
    }

    if (url.pathname === "/rest/v1/audit_logs") {
      if (init?.body) {
        options?.auditBodies?.push(JSON.parse(String(init.body)));
      }
      return new Response(null, { status: 201 });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;
}

function getHeaderValue(headers: HeadersInit, key: string): string | null {
  if (headers instanceof Headers) {
    return headers.get(key);
  }

  if (Array.isArray(headers)) {
    return headers.find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1] ?? null;
  }

  return headers[key] ?? null;
}

test("admin can list riders with counts and server-side filters", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const capturedHeaders: HeadersInit[] = [];
  globalThis.fetch = createFetchMock(calls, {
    capturedRiderHeaders: capturedHeaders,
  });

  try {
    const response = await listRidersRoute(
      createAdminNextRequest(
        "http://localhost/api/admin/riders?search=Garki&verification_status=pending&visibility_status=hidden",
      ),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.riders.length, 1);
    assert.equal(body.data.riders[0].display_name, "Musa Rider");
    assert.equal(body.data.riders[0].contact_intent_count, 2);
    assert.equal(body.data.riders[0].unavailable_report_count, 1);
    assert.deepEqual(body.data.pagination, {
      limit: 50,
      offset: 0,
      count: 1,
    });
    assert.ok(calls.includes("GET /rest/v1/riders"));
    assert.equal(getHeaderValue(capturedHeaders[0] ?? {}, "authorization"), "Bearer admin-token");
    assert.equal(getHeaderValue(capturedHeaders[0] ?? {}, "apikey"), "anon-key");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin can view one rider with admin-private fields", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls);

  try {
    const response = await getRiderRoute(
      createRequest(`/api/admin/riders/${riderId}`),
      { params: Promise.resolve({ id: riderId }) },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.rider.phone, "2348012345678");
    assert.equal(body.data.rider.whatsapp_phone, "2348012345678");
    assert.equal(body.data.rider.notes, "New application");
    assert.ok(calls.includes("GET /rest/v1/riders"));
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin can create rider with hidden pending defaults and audit log", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const createBodies: unknown[] = [];
  const auditBodies: unknown[] = [];
  globalThis.fetch = createFetchMock(calls, { createBodies, auditBodies });

  try {
    const response = await createRiderRoute(
      createRequest("/api/admin/riders", "POST", {
        display_name: "Manual Rider",
        phone: "+2348011111111",
        whatsapp_phone: "+2348022222222",
        operating_areas: ["Wuse", "Garki"],
        usual_available_hours: "Weekdays 9am-6pm",
        consent_confirmed: true,
        bank_account: "should be rejected before this point",
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(calls.includes("POST /rest/v1/riders"), false);

    const validResponse = await createRiderRoute(
      createRequest("/api/admin/riders", "POST", {
        display_name: "Manual Rider",
        phone: "+2348011111111",
        whatsapp_phone: "+2348022222222",
        operating_areas: ["Wuse", "Garki"],
        usual_available_hours: "Weekdays 9am-6pm",
        consent_confirmed: true,
      }),
    );
    const validBody = await validResponse.json();

    assert.equal(validResponse.status, 201);
    assert.equal(validBody.success, true);
    assert.equal(validBody.data.rider.id, createdRiderId);
    assert.equal(validBody.data.rider.verification_status, "pending");
    assert.equal(validBody.data.rider.visibility_status, "hidden");
    assert.equal(validBody.data.rider.phone, "2348011111111");
    assert.equal(createBodies.length, 1);
    assert.deepEqual(createBodies[0], {
      display_name: "Manual Rider",
      full_name: null,
      phone: "2348011111111",
      whatsapp_phone: "2348022222222",
      vehicle_type: null,
      plate_number: null,
      operating_areas: ["Wuse", "Garki"],
      usual_available_hours: { label: "Weekdays 9am-6pm" },
      verification_status: "pending",
      visibility_status: "hidden",
      notes: null,
      consent_accepted_at: createBodies[0] && typeof createBodies[0] === "object"
        ? (createBodies[0] as { consent_accepted_at: string }).consent_accepted_at
        : "",
    });
    assert.ok(calls.includes("POST /rest/v1/audit_logs"));
    assert.equal(
      auditBodies.some((entry) =>
        typeof entry === "object" &&
        entry !== null &&
        (entry as { action?: string }).action === "CREATE_RIDER"
      ),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin can create verified visible rider but cannot create visible unverified rider", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const createBodies: unknown[] = [];
  globalThis.fetch = createFetchMock(calls, { createBodies });

  try {
    const verifiedVisibleResponse = await createRiderRoute(
      createRequest("/api/admin/riders", "POST", {
        display_name: "Visible Rider",
        phone: "+2348033333333",
        whatsapp_phone: "+2348044444444",
        operating_areas: ["Maitama"],
        verification_status: "verified",
        visibility_status: "visible",
        consent_confirmed: true,
      }),
    );
    const verifiedVisibleBody = await verifiedVisibleResponse.json();

    assert.equal(verifiedVisibleResponse.status, 201);
    assert.equal(verifiedVisibleBody.data.rider.verification_status, "verified");
    assert.equal(verifiedVisibleBody.data.rider.visibility_status, "visible");

    const invalidResponse = await createRiderRoute(
      createRequest("/api/admin/riders", "POST", {
        display_name: "Invalid Visible Rider",
        phone: "+2348055555555",
        whatsapp_phone: "+2348066666666",
        operating_areas: ["Jabi"],
        verification_status: "pending",
        visibility_status: "visible",
        consent_confirmed: true,
      }),
    );
    const invalidBody = await invalidResponse.json();

    assert.equal(invalidResponse.status, 400);
    assert.equal(invalidBody.success, false);
    assert.equal(createBodies.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin rider create rejects duplicate phone or WhatsApp safely", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const createBodies: unknown[] = [];
  globalThis.fetch = createFetchMock(calls, {
    createBodies,
    duplicateRider: true,
  });

  try {
    const response = await createRiderRoute(
      createRequest("/api/admin/riders", "POST", {
        display_name: "Duplicate Rider",
        phone: "08012345678",
        whatsapp_phone: "+2348099999999",
        operating_areas: ["Wuse"],
        consent_confirmed: true,
      }),
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    assert.equal(response.status, 409);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "CONFLICT");
    assert.equal(serialized.includes("service-role-key"), false);
    assert.equal(createBodies.length, 0);
    assert.equal(calls.includes("POST /rest/v1/riders"), false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin can update rider status and safe profile fields", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const updateBodies: unknown[] = [];
  globalThis.fetch = createFetchMock(calls, { updateBodies });

  try {
    const response = await updateRiderRoute(
      createRequest(`/api/admin/riders/${riderId}`, "PATCH", {
        verification_status: "verified",
        visibility_status: "visible",
        display_name: "Musa Verified",
        operating_areas: ["Wuse", "Garki", "Maitama"],
      }),
      { params: Promise.resolve({ id: riderId }) },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.rider.verification_status, "verified");
    assert.equal(body.data.rider.visibility_status, "visible");
    assert.equal(body.data.rider.display_name, "Musa Verified");
    assert.equal(updateBodies.length, 1);
    assert.deepEqual(updateBodies[0], {
      verification_status: "verified",
      visibility_status: "visible",
      display_name: "Musa Verified",
      operating_areas: ["Wuse", "Garki", "Maitama"],
    });
    assert.ok(calls.includes("POST /rest/v1/audit_logs"));
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin rider route rejects invalid statuses before writing", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls);

  try {
    const response = await updateRiderRoute(
      createRequest(`/api/admin/riders/${riderId}`, "PATCH", {
        verification_status: "approved",
      }),
      { params: Promise.resolve({ id: riderId }) },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(calls.includes("PATCH /rest/v1/riders"), false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin rider route rejects visible status unless rider is verified", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls);

  try {
    const response = await updateRiderRoute(
      createRequest(`/api/admin/riders/${riderId}`, "PATCH", {
        visibility_status: "visible",
      }),
      { params: Promise.resolve({ id: riderId }) },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(calls.includes("PATCH /rest/v1/riders"), false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin rider route rejects unsafe fields", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls);

  try {
    const response = await updateRiderRoute(
      createRequest(`/api/admin/riders/${riderId}`, "PATCH", {
        photo_url: "https://example.com/rider.jpg",
        visibility_status: "visible",
      }),
      { params: Promise.resolve({ id: riderId }) },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(calls.includes("PATCH /rest/v1/riders"), false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("anon and non-admin users cannot access admin rider APIs", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { role: "agent" });

  try {
    const anonResponse = await getRiderRoute(
      new Request(`http://localhost/api/admin/riders/${riderId}`),
      { params: Promise.resolve({ id: riderId }) },
    );
    const anonBody = await anonResponse.json();
    const agentResponse = await listRidersRoute(
      createAdminNextRequest("http://localhost/api/admin/riders", "agent-token"),
    );
    const agentCreateResponse = await createRiderRoute(
      createRequest("/api/admin/riders", "POST", {
        display_name: "Agent Rider",
        phone: "+2348011111111",
        whatsapp_phone: "+2348022222222",
        operating_areas: ["Wuse"],
        consent_confirmed: true,
      }, "agent-token"),
    );

    assert.notEqual(anonResponse.status, 200);
    assert.equal(JSON.stringify(anonBody).includes("+2348012345678"), false);
    assert.equal(agentResponse.status, 403);
    assert.equal(agentCreateResponse.status, 403);
    assert.equal(calls.includes("GET /rest/v1/riders"), false);
    assert.equal(calls.includes("POST /rest/v1/riders"), false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin rider upstream errors do not expose service-role details", async () => {
  const restoreEnv = setAdminEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = createFetchMock(calls, { riderFailure: true });

  try {
    const response = await listRidersRoute(
      createAdminNextRequest("http://localhost/api/admin/riders"),
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    assert.equal(response.status, 502);
    assert.equal(body.success, false);
    assert.equal(serialized.includes("service-role-key"), false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("admin riders UI is protected and documents independent-rider boundaries", () => {
  const pageSource = readFileSync(
    resolve(process.cwd(), "app/admin/riders/page.tsx"),
    "utf8",
  );
  const componentSource = readFileSync(
    resolve(process.cwd(), "components/admin/admin-rider-management.tsx"),
    "utf8",
  );
  const shellSource = readFileSync(
    resolve(process.cwd(), "components/admin/admin-shell.tsx"),
    "utf8",
  );

  assert.match(pageSource, /requiredPermission="riders:manage"/);
  assert.match(shellSource, /href: "\/admin\/riders"/);
  assert.match(componentSource, /Making a rider visible only allows them to/);
  assert.match(componentSource, /It does not assign deliveries/);
  assert.match(componentSource, /verification_status/);
  assert.match(componentSource, /visibility_status/);
});

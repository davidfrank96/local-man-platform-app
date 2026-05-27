import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  GET as riderSuggestionsRoute,
} from "../app/api/vendors/[slug]/riders/route.ts";
import {
  POST as riderContactRoute,
} from "../app/api/vendors/[slug]/riders/contact/route.ts";
import {
  POST as riderReportRoute,
} from "../app/api/vendors/[slug]/riders/report-unavailable/route.ts";
import {
  PUBLIC_RIDER_SUGGESTIONS_RATE_LIMIT,
  resetAbuseProtectionStateForTests,
} from "../lib/api/abuse-protection.ts";

const vendorId = "00000000-0000-4000-8000-000000000001";
const riderId = "11111111-1111-4111-8111-111111111111";
const hiddenRiderPhone = "+2348999999999";

const vendorRow = {
  id: vendorId,
  name: "Jabi Office Lunch Bowl",
  slug: "jabi-office-lunch-bowl",
  phone_number: "+2348000000000",
  address_text: "12 Jabi Lake Mall",
  city: "Abuja",
  area: "Jabi",
  state: "FCT",
  latitude: 9.0765,
  longitude: 7.3986,
};

const selectedRiderRow = {
  id: riderId,
  display_name: "Amina Rider",
  photo_url: null,
  vehicle_type: "Motorcycle",
  operating_areas: ["Jabi", "Wuse"],
  usual_available_hours: {
    label: "Usually available afternoons",
  },
  weekday_available_from: "00:00:00",
  weekday_available_until: "00:00:00",
  weekend_available_from: "00:00:00",
  weekend_available_until: "00:00:00",
  plate_number: "7497",
  whatsapp_phone: "+2348111111111",
};

test.beforeEach(() => {
  resetAbuseProtectionStateForTests();
});

function setRiderEnv(): () => void {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  return () => {
    if (previousUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }

    if (previousServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
    }
  };
}

function createRequest(path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function createValidContactPayload(overrides: Record<string, unknown> = {}) {
  return {
    riderId,
    customerName: "Ada",
    customerPhone: "+2348123456789",
    deliveryLocationMode: "manual_address",
    deliveryAddress: "25 Ademola Adetokunbo Crescent",
    deliveryArea: "Wuse 2",
    orderNote: "Two plates of jollof rice.",
    paymentNoteType: "already_paid_vendor",
    disclaimerAccepted: true,
    ...overrides,
  };
}

function createValidReportPayload(overrides: Record<string, unknown> = {}) {
  return {
    riderId,
    reason: "no_response",
    reporterPhone: "+2348123456789",
    ...overrides,
  };
}

test("public rider suggestions return max 3 currently available safe cards without area filtering", async () => {
  const restoreEnv = setRiderEnv();
  const originalFetch = globalThis.fetch;
  const calls: URL[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));
    calls.push(url);

    if (url.pathname === "/rest/v1/vendors") {
      assert.equal(url.searchParams.get("slug"), "eq.jabi-office-lunch-bowl");
      return Response.json([vendorRow]);
    }

    if (url.pathname === "/rest/v1/riders") {
      assert.equal(url.searchParams.get("verification_status"), "eq.verified");
      assert.equal(url.searchParams.get("visibility_status"), "eq.visible");
      assert.equal(url.searchParams.get("select")?.includes("phone"), false);
      assert.equal(url.searchParams.get("select")?.includes("whatsapp_phone"), false);
      return Response.json([
        {
          id: "22222222-2222-4222-8222-222222222222",
          display_name: "Zed Rider",
          photo_url: null,
          vehicle_type: "Bicycle",
          plate_number: "77-XYZ-999",
          operating_areas: ["Garki"],
          usual_available_hours: { label: "All day" },
          weekday_available_from: "00:00:00",
          weekday_available_until: "00:00:00",
          weekend_available_from: "00:00:00",
          weekend_available_until: "00:00:00",
        },
        {
          id: riderId,
          display_name: "Amina Rider",
          photo_url: null,
          vehicle_type: "Motorcycle",
          plate_number: "18-KJA-443",
          operating_areas: ["Garki"],
          usual_available_hours: {
            label: "Usually available afternoons",
          },
          weekday_available_from: "00:00:00",
          weekday_available_until: "00:00:00",
          weekend_available_from: "00:00:00",
          weekend_available_until: "00:00:00",
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          display_name: "Bala Rider",
          photo_url: null,
          vehicle_type: "Motorcycle",
          plate_number: "19-KJA-443",
          operating_areas: ["Garki"],
          usual_available_hours: { label: "All day" },
          weekday_available_from: "00:00:00",
          weekday_available_until: "00:00:00",
          weekend_available_from: "00:00:00",
          weekend_available_until: "00:00:00",
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          display_name: "Chika Rider",
          photo_url: null,
          vehicle_type: "Motorcycle",
          plate_number: "20-KJA-443",
          operating_areas: ["Garki"],
          usual_available_hours: { label: "All day" },
          weekday_available_from: "00:00:00",
          weekday_available_until: "00:00:00",
          weekend_available_from: "00:00:00",
          weekend_available_until: "00:00:00",
        },
        {
          id: "55555555-5555-4555-8555-555555555555",
          display_name: "Unavailable Rider",
          photo_url: null,
          vehicle_type: "Motorcycle",
          plate_number: "21-KJA-443",
          operating_areas: ["Jabi"],
          usual_available_hours: { label: "Unknown" },
          weekday_available_from: null,
          weekday_available_until: null,
          weekend_available_from: null,
          weekend_available_until: null,
        },
      ]);
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await riderSuggestionsRoute(
      createRequest("/api/vendors/jabi-office-lunch-bowl/riders"),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.riders.length, 3);
    assert.equal(
      body.data.riders.some((rider: { operating_areas: string[] }) =>
        rider.operating_areas.includes("Garki")
      ),
      true,
    );
    assert.equal(serialized.includes("Unavailable"), false);
    assert.equal(serialized.includes("phone"), false);
    assert.equal(serialized.includes("whatsapp"), false);
    assert.equal(serialized.includes('"plate_number"'), false);
    assert.equal(serialized.includes("18-KJA-443"), false);
    assert.equal(serialized.includes("77-XYZ-999"), false);
    assert.equal(serialized.includes(hiddenRiderPhone), false);
    assert.ok(calls.some((url) => url.pathname === "/rest/v1/riders"));
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("public rider suggestions use a rotating fetch window beyond the first 100 riders", async () => {
  const restoreEnv = setRiderEnv();
  const originalFetch = globalThis.fetch;
  const riderRequests: URL[] = [];

  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([vendorRow]);
    }

    if (url.pathname === "/rest/v1/riders") {
      riderRequests.push(url);

      if (url.searchParams.get("select") === "id") {
        return Response.json([{ id: riderId }], {
          headers: {
            "content-range": "0-0/250",
          },
        });
      }

      assert.equal(url.searchParams.get("limit"), "100");
      assert.ok(url.searchParams.has("offset"));
      assert.ok(Number(url.searchParams.get("offset")) >= 0);
      return Response.json([
        selectedRiderRow,
        {
          ...selectedRiderRow,
          id: "22222222-2222-4222-8222-222222222222",
          display_name: "Beyond Window Rider",
        },
        {
          ...selectedRiderRow,
          id: "33333333-3333-4333-8333-333333333333",
          display_name: "Late Eligible Rider",
        },
        {
          ...selectedRiderRow,
          id: "44444444-4444-4444-8444-444444444444",
          display_name: "Fourth Eligible Rider",
        },
      ]);
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await riderSuggestionsRoute(
      createRequest("/api/vendors/jabi-office-lunch-bowl/riders"),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.riders.length, 3);
    assert.equal(riderRequests.length, 2);
    assert.equal(riderRequests[0]?.searchParams.get("select"), "id");
    assert.notEqual(riderRequests[1]?.searchParams.get("select"), "id");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("rider contact endpoint requires accepted disclaimer before writing", async () => {
  const restoreEnv = setRiderEnv();
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await riderContactRoute(
      createRequest("/api/vendors/jabi-office-lunch-bowl/riders/contact", createValidContactPayload({
        disclaimerAccepted: false,
      })),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("rider contact endpoint rejects missing delivery details before private lookup", async () => {
  const restoreEnv = setRiderEnv();
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await riderContactRoute(
      createRequest("/api/vendors/jabi-office-lunch-bowl/riders/contact", createValidContactPayload({
        deliveryAddress: undefined,
        deliveryArea: undefined,
      })),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(serialized.includes("whatsapp_phone"), false);
    assert.equal(serialized.includes(hiddenRiderPhone), false);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("rider contact endpoint rejects hidden or unverified selected riders", async () => {
  const restoreEnv = setRiderEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));
    calls.push(url.pathname);

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([vendorRow]);
    }

    if (url.pathname === "/rest/v1/riders") {
      assert.equal(url.searchParams.get("id"), `eq.${riderId}`);
      assert.equal(url.searchParams.get("verification_status"), "eq.verified");
      assert.equal(url.searchParams.get("visibility_status"), "eq.visible");
      return Response.json([]);
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await riderContactRoute(
      createRequest(
        "/api/vendors/jabi-office-lunch-bowl/riders/contact",
        createValidContactPayload(),
      ),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.equal(calls.includes("/rest/v1/rider_contact_intents"), false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("rider contact endpoint rejects selected riders outside structured availability", async () => {
  const restoreEnv = setRiderEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));
    calls.push(url.pathname);

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([vendorRow]);
    }

    if (url.pathname === "/rest/v1/riders") {
      return Response.json([{
        ...selectedRiderRow,
        weekday_available_from: null,
        weekday_available_until: null,
        weekend_available_from: null,
        weekend_available_until: null,
      }]);
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await riderContactRoute(
      createRequest(
        "/api/vendors/jabi-office-lunch-bowl/riders/contact",
        createValidContactPayload(),
      ),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.equal(calls.includes("/rest/v1/rider_contact_intents"), false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("rider contact endpoint creates minimal intent and returns selected WhatsApp URL", async () => {
  const restoreEnv = setRiderEnv();
  const originalFetch = globalThis.fetch;
  const insertBodies: unknown[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([vendorRow]);
    }

    if (url.pathname === "/rest/v1/riders") {
      return Response.json([
        {
          ...selectedRiderRow,
          whatsapp_phone: "08111111111",
        },
      ]);
    }

    if (url.pathname === "/rest/v1/rider_contact_intents") {
      insertBodies.push(JSON.parse(String(init?.body ?? "{}")));
      return Response.json([
        {
          id: "33333333-3333-4333-8333-333333333333",
        },
      ], { status: 201 });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await riderContactRoute(
      createRequest(
        "/api/vendors/jabi-office-lunch-bowl/riders/contact",
        createValidContactPayload({ customerPhone: "08123456789" }),
      ),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);
    const insertBody = insertBodies[0] as Record<string, unknown>;
    const message = new URL(body.data.whatsapp_url).searchParams.get("text") ?? "";

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.intent_id, "33333333-3333-4333-8333-333333333333");
    assert.equal(body.data.rider.display_name, "Amina");
    assert.equal(body.data.rider.masked_plate_number, "74-***");
    assert.match(body.data.whatsapp_url, /^https:\/\/wa\.me\/2348111111111\?/);
    assert.equal(serialized.includes("whatsapp_phone"), false);
    assert.equal(serialized.includes('"plate_number"'), false);
    assert.equal(serialized.includes("7497"), false);
    assert.equal(serialized.includes("full_name"), false);
    assert.equal(serialized.includes("notes"), false);
    assert.equal(insertBody.customer_phone_hash, hashLike(insertBody.customer_phone_hash));
    assert.equal(
      insertBody.customer_phone_hash,
      createRiderPhoneHash("contact", "2348123456789"),
    );
    assert.notEqual(insertBody.customer_phone_hash, "+2348123456789");
    assert.equal(JSON.stringify(insertBody).includes("25 Ademola"), false);
    assert.match(message, /Vendor phone:\n\+2348000000000/);
    assert.match(message, /Pickup address:\n12 Jabi Lake Mall, Jabi, Abuja, FCT/);
    assert.match(message, /My phone:\n\+2348123456789/);
    assert.match(message, /Order note:\nTwo plates of jollof rice\./);
    assert.match(message, /I have already paid the vendor\./);
    assert.match(message, /Localman only connected us/);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("rider suggestions route rate limits repeated public requests safely", async () => {
  const restoreEnv = setRiderEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([vendorRow]);
    }

    if (url.pathname === "/rest/v1/riders") {
      return Response.json([]);
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    let response = new Response();

    for (let index = 0; index < PUBLIC_RIDER_SUGGESTIONS_RATE_LIMIT.maxRequests; index += 1) {
      response = await riderSuggestionsRoute(
        createRequest("/api/vendors/jabi-office-lunch-bowl/riders"),
        { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
      );
      assert.equal(response.status, 200);
    }

    response = await riderSuggestionsRoute(
      createRequest("/api/vendors/jabi-office-lunch-bowl/riders"),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    assert.equal(response.status, 429);
    assert.equal(body.success, false);
    assert.equal(serialized.includes("whatsapp_phone"), false);
    assert.equal(serialized.includes(hiddenRiderPhone), false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("rider contact endpoint rate limits repeated handoffs before private lookup", async () => {
  const restoreEnv = setRiderEnv();
  const originalFetch = globalThis.fetch;
  let contactIntentInsertCount = 0;
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([vendorRow]);
    }

    if (url.pathname === "/rest/v1/riders") {
      return Response.json([selectedRiderRow]);
    }

    if (url.pathname === "/rest/v1/rider_contact_intents") {
      contactIntentInsertCount += 1;
      assert.equal(String(init?.body ?? "").includes("+2348123456789"), false);
      return Response.json([
        {
          id: "33333333-3333-4333-8333-333333333333",
        },
      ], { status: 201 });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const acceptedResponse = await riderContactRoute(
      createRequest(
        "/api/vendors/jabi-office-lunch-bowl/riders/contact",
        createValidContactPayload(),
      ),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const limitedResponse = await riderContactRoute(
      createRequest(
        "/api/vendors/jabi-office-lunch-bowl/riders/contact",
        createValidContactPayload(),
      ),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const body = await limitedResponse.json();
    const serialized = JSON.stringify(body);

    assert.equal(acceptedResponse.status, 201);
    assert.equal(limitedResponse.status, 429);
    assert.equal(contactIntentInsertCount, 1);
    assert.equal(serialized.includes("whatsapp_phone"), false);
    assert.equal(serialized.includes(hiddenRiderPhone), false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("rider unavailable report endpoint validates and stores a hashed report", async () => {
  const restoreEnv = setRiderEnv();
  const originalFetch = globalThis.fetch;
  const reportBodies: unknown[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([vendorRow]);
    }

    if (url.pathname === "/rest/v1/riders") {
      assert.equal(url.searchParams.get("select")?.includes("whatsapp_phone"), false);
      return Response.json([{
        ...selectedRiderRow,
        whatsapp_phone: undefined,
      }]);
    }

    if (url.pathname === "/rest/v1/rider_unavailable_reports") {
      reportBodies.push(JSON.parse(String(init?.body ?? "{}")));
      return Response.json([
        {
          id: "44444444-4444-4444-8444-444444444444",
        },
      ], { status: 201 });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await riderReportRoute(
      createRequest(
        "/api/vendors/jabi-office-lunch-bowl/riders/report-unavailable",
        createValidReportPayload(),
      ),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const body = await response.json();
    const reportBody = reportBodies[0] as Record<string, unknown>;
    const serialized = JSON.stringify({ response: body, reportBody });

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.report_id, "44444444-4444-4444-8444-444444444444");
    assert.equal(reportBody.rider_id, riderId);
    assert.equal(reportBody.vendor_id, vendorId);
    assert.equal(reportBody.reason, "no_response");
    assert.equal(reportBody.reporter_phone_hash, hashLike(reportBody.reporter_phone_hash));
    assert.equal(
      reportBody.reporter_phone_hash,
      createRiderPhoneHash("unavailable_report", "2348123456789"),
    );
    assert.equal(serialized.includes("+2348123456789"), false);
    assert.equal(serialized.includes("whatsapp_phone"), false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("rider unavailable report endpoint rejects invalid reasons before writing", async () => {
  const restoreEnv = setRiderEnv();
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await riderReportRoute(
      createRequest(
        "/api/vendors/jabi-office-lunch-bowl/riders/report-unavailable",
        createValidReportPayload({ reason: "delivery_fee_dispute" }),
      ),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("rider unavailable report endpoint rejects hidden or unverified riders", async () => {
  const restoreEnv = setRiderEnv();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));
    calls.push(url.pathname);

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([vendorRow]);
    }

    if (url.pathname === "/rest/v1/riders") {
      assert.equal(url.searchParams.get("verification_status"), "eq.verified");
      assert.equal(url.searchParams.get("visibility_status"), "eq.visible");
      return Response.json([]);
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await riderReportRoute(
      createRequest(
        "/api/vendors/jabi-office-lunch-bowl/riders/report-unavailable",
        createValidReportPayload(),
      ),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.equal(calls.includes("/rest/v1/rider_unavailable_reports"), false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("rider unavailable report endpoint rate limits repeated reports", async () => {
  const restoreEnv = setRiderEnv();
  const originalFetch = globalThis.fetch;
  let reportInsertCount = 0;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    if (url.pathname === "/rest/v1/vendors") {
      return Response.json([vendorRow]);
    }

    if (url.pathname === "/rest/v1/riders") {
      return Response.json([{
        id: riderId,
        display_name: "Amina Rider",
        photo_url: null,
        vehicle_type: "Motorcycle",
        operating_areas: ["Jabi"],
        usual_available_hours: null,
      }]);
    }

    if (url.pathname === "/rest/v1/rider_unavailable_reports") {
      reportInsertCount += 1;
      return Response.json([
        {
          id: "44444444-4444-4444-8444-444444444444",
        },
      ], { status: 201 });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const firstResponse = await riderReportRoute(
      createRequest(
        "/api/vendors/jabi-office-lunch-bowl/riders/report-unavailable",
        createValidReportPayload({ reason: "no_response" }),
      ),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const secondResponse = await riderReportRoute(
      createRequest(
        "/api/vendors/jabi-office-lunch-bowl/riders/report-unavailable",
        createValidReportPayload({ reason: "unavailable" }),
      ),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const limitedResponse = await riderReportRoute(
      createRequest(
        "/api/vendors/jabi-office-lunch-bowl/riders/report-unavailable",
        createValidReportPayload({ reason: "wrong_number" }),
      ),
      { params: Promise.resolve({ slug: "jabi-office-lunch-bowl" }) },
    );
    const body = await limitedResponse.json();

    assert.equal(firstResponse.status, 201);
    assert.equal(secondResponse.status, 201);
    assert.equal(limitedResponse.status, 429);
    assert.equal(body.success, false);
    assert.equal(reportInsertCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

function hashLike(value: unknown): unknown {
  assert.equal(typeof value, "string");
  assert.match(value as string, /^[a-f0-9]{64}$/);
  return value;
}

function createRiderPhoneHash(
  purpose: "contact" | "unavailable_report",
  normalizedPhone: string,
): string {
  return createHmac("sha256", "service-role-key")
    .update(`localman-rider-connect:${purpose}:${normalizedPhone}`)
    .digest("hex");
}

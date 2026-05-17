import assert from "node:assert/strict";
import test from "node:test";
import {
  GET as riderSuggestionsRoute,
} from "../app/api/vendors/[slug]/riders/route.ts";
import {
  POST as riderContactRoute,
} from "../app/api/vendors/[slug]/riders/contact/route.ts";

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
  whatsapp_phone: "+2348111111111",
};

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

test("public rider suggestions return only verified visible safe cards", async () => {
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
          operating_areas: ["Garki"],
          usual_available_hours: null,
        },
        {
          id: riderId,
          display_name: "Amina Rider",
          photo_url: null,
          vehicle_type: "Motorcycle",
          operating_areas: ["Jabi", "Wuse"],
          usual_available_hours: {
            label: "Usually available afternoons",
          },
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
    assert.equal(body.data.riders[0].display_name, "Amina Rider");
    assert.equal(serialized.includes("phone"), false);
    assert.equal(serialized.includes("whatsapp"), false);
    assert.equal(serialized.includes(hiddenRiderPhone), false);
    assert.ok(calls.some((url) => url.pathname === "/rest/v1/riders"));
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
      return Response.json([selectedRiderRow]);
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
        createValidContactPayload(),
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
    assert.equal(body.data.rider.display_name, "Amina Rider");
    assert.match(body.data.whatsapp_url, /^https:\/\/wa\.me\/2348111111111\?/);
    assert.equal(serialized.includes("whatsapp_phone"), false);
    assert.equal(serialized.includes("full_name"), false);
    assert.equal(serialized.includes("notes"), false);
    assert.equal(insertBody.customer_phone_hash, hashLike(insertBody.customer_phone_hash));
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

function hashLike(value: unknown): unknown {
  assert.equal(typeof value, "string");
  assert.match(value as string, /^[a-f0-9]{64}$/);
  return value;
}

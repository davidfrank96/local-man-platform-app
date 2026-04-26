import assert from "node:assert/strict";
import test from "node:test";
import { POST as trackEventRoute } from "../app/api/events/route.ts";

function setTrackingEnv(): () => void {
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

test("public event route stores accepted tracking events", async () => {
  const restoreEnv = setTrackingEnv();
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> = {};

  globalThis.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    return new Response(null, { status: 201 });
  }) as typeof fetch;

  try {
    const response = await trackEventRoute(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          event_type: "vendor_selected",
          vendor_id: "00000000-0000-4000-8000-000000000001",
          device_type: "desktop",
          location_source: "precise",
        }),
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(requestBody.event_type, "vendor_selected");
    assert.equal(requestBody.device_type, "desktop");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("public event route rejects invalid event names", async () => {
  const restoreEnv = setTrackingEnv();

  try {
    const response = await trackEventRoute(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          event_type: "opened_everything",
          device_type: "desktop",
        }),
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 202);
    assert.equal(body.success, true);
    assert.equal(body.data.accepted, false);
    assert.equal(body.data.reason, "invalid_payload");
  } finally {
    restoreEnv();
  }
});

test("public event route fails clearly when write config is missing", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const response = await trackEventRoute(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          event_type: "filter_applied",
          device_type: "desktop",
        }),
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 202);
    assert.equal(body.success, true);
    assert.equal(body.data.accepted, false);
    assert.equal(body.data.reason, "tracking_unconfigured");
  } finally {
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
  }
});

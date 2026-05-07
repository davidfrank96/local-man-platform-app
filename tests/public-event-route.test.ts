import assert from "node:assert/strict";
import test from "node:test";
import { POST as trackEventRoute } from "../app/api/events/route.ts";
import {
  PUBLIC_EVENT_RATE_LIMIT,
  resetAbuseProtectionStateForTests,
} from "../lib/api/abuse-protection.ts";

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

test.beforeEach(() => {
  resetAbuseProtectionStateForTests();
});

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

test("public event route accepts text/plain beacon payloads", async () => {
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
          "content-type": "text/plain;charset=UTF-8",
        },
        body: JSON.stringify({
          event_type: "call_clicked",
          vendor_id: "00000000-0000-4000-8000-000000000001",
          vendor_slug: "test-vendor",
          page_path: "/vendors/test-vendor",
          device_type: "desktop",
          location_source: "precise",
          metadata: {
            source: "detail",
          },
        }),
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(requestBody.event_type, "call_clicked");
    assert.equal(requestBody.vendor_slug, "test-vendor");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("public event route stores call and directions click events with vendor context", async () => {
  const restoreEnv = setTrackingEnv();
  const originalFetch = globalThis.fetch;
  const requestBodies: Array<Record<string, unknown>> = [];

  globalThis.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
    requestBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
    return new Response(null, { status: 201 });
  }) as typeof fetch;

  try {
    const commonPayload = {
      vendor_id: "00000000-0000-4000-8000-000000000001",
      vendor_slug: "test-vendor",
      device_type: "desktop",
      location_source: "precise",
      page_path: "/vendors/test-vendor",
      metadata: {
        source: "detail",
      },
    };

    const callResponse = await trackEventRoute(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...commonPayload,
          event_type: "call_clicked",
        }),
      }),
    );
    const directionsResponse = await trackEventRoute(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...commonPayload,
          event_type: "directions_clicked",
        }),
      }),
    );

    assert.equal(callResponse.status, 201);
    assert.equal(directionsResponse.status, 201);
    assert.equal(requestBodies[0]?.event_type, "call_clicked");
    assert.equal(requestBodies[1]?.event_type, "directions_clicked");
    assert.equal(requestBodies[0]?.vendor_slug, "test-vendor");
    assert.equal((requestBodies[0]?.metadata as Record<string, unknown>).source, "detail");
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

test("public event route returns 400 for invalid json", async () => {
  const restoreEnv = setTrackingEnv();

  try {
    const response = await trackEventRoute(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: {
          "content-type": "text/plain;charset=UTF-8",
        },
        body: "{not-json",
      }),
    );

    assert.equal(response.status, 400);
    assert.equal(await response.text(), "Bad Request");
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

test("public event route deduplicates immediate retry payloads", async () => {
  const restoreEnv = setTrackingEnv();
  const originalFetch = globalThis.fetch;
  let upstreamWrites = 0;

  globalThis.fetch = (async () => {
    upstreamWrites += 1;
    return new Response(null, { status: 201 });
  }) as typeof fetch;

  try {
    const createRequest = () =>
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify({
          event_type: "vendor_selected",
          session_id: "90000000-0000-4000-8000-000000000001",
          vendor_id: "00000000-0000-4000-8000-000000000001",
          vendor_slug: "test-vendor",
          device_type: "mobile",
          location_source: "precise",
          page_path: "/",
        }),
      });

    const firstResponse = await trackEventRoute(createRequest());
    const secondResponse = await trackEventRoute(createRequest());
    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();

    assert.equal(firstResponse.status, 201);
    assert.equal(secondResponse.status, 202);
    assert.equal(firstBody.data.accepted, true);
    assert.equal(secondBody.data.accepted, true);
    assert.equal(secondBody.data.deduplicated, true);
    assert.equal(upstreamWrites, 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("public event route stops accepting flood traffic after the route threshold", async () => {
  const restoreEnv = setTrackingEnv();
  const originalFetch = globalThis.fetch;
  let upstreamWrites = 0;

  globalThis.fetch = (async () => {
    upstreamWrites += 1;
    return new Response(null, { status: 201 });
  }) as typeof fetch;

  try {
    let lastResponse: Response | null = null;

    for (let index = 0; index <= PUBLIC_EVENT_RATE_LIMIT.maxRequests; index += 1) {
      lastResponse = await trackEventRoute(
        new Request("http://localhost/api/events", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "203.0.113.22",
          },
          body: JSON.stringify({
            event_type: "search_used",
            session_id: `90000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
            device_type: "desktop",
            location_source: "default_city",
            page_path: "/search",
            search_query: `rice-${index}`,
          }),
        }),
      );
    }

    assert.ok(lastResponse);
    const body = await lastResponse!.json();

    assert.equal(lastResponse!.status, 202);
    assert.equal(body.data.accepted, false);
    assert.equal(body.data.reason, "rate_limited");
    assert.equal(upstreamWrites, PUBLIC_EVENT_RATE_LIMIT.maxRequests);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

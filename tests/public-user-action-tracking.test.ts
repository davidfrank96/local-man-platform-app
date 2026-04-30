import assert from "node:assert/strict";
import test from "node:test";
import {
  ensurePublicTrackingSession,
  dispatchPublicUserAction,
} from "../lib/public/user-action-tracking.ts";

function createStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key) ?? null : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

test("public action tracking uses sendBeacon when available", async () => {
  let sentBody = "";
  let sentUrl = "";
  let fetchCalled = false;

  await dispatchPublicUserAction(
    {
      event_type: "vendor_selected",
      page_path: "/",
      vendor_id: "00000000-0000-4000-8000-000000000001",
      location_source: "precise",
      filters: {},
      metadata: {
        source: "card",
      },
    },
    {
      navigatorImpl: {
        sendBeacon(url, body) {
          sentUrl = String(url);
          sentBody = body instanceof Blob ? "blob" : typeof body;
          return true;
        },
      },
      fetchImpl: (async () => {
        fetchCalled = true;
        return new Response(null, { status: 204 });
      }) as typeof fetch,
    },
  );

  assert.equal(sentBody, "blob");
  assert.equal(sentUrl, "/api/events");
  assert.equal(fetchCalled, false);
});

test("public action tracking uses an absolute events url in the browser", async () => {
  const originalWindow = globalThis.window;
  let sentUrl = "";

  Object.defineProperty(globalThis, "window", {
    value: {
      addEventListener() {},
      location: {
        origin: "https://localman.test",
        pathname: "/vendors/test-vendor",
        search: "",
      },
      sessionStorage: null,
    },
    configurable: true,
  });

  try {
    await dispatchPublicUserAction(
      {
        event_type: "directions_clicked",
        vendor_id: "00000000-0000-4000-8000-000000000001",
        vendor_slug: "test-vendor",
        metadata: {
          source: "detail",
        },
        filters: {},
      },
      {
        navigatorImpl: {
          sendBeacon(url) {
            sentUrl = String(url);
            return true;
          },
        },
      },
    );

    assert.equal(sentUrl, "https://localman.test/api/events");
  } finally {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  }
});

test("public action tracking falls back to fetch when sendBeacon is unavailable", async () => {
  let fetchUrl = "";
  let fetchBody = "";

  await dispatchPublicUserAction(
    {
      event_type: "search_used",
      page_path: "/?search=jollof",
      location_source: "precise",
      search_query: "jollof",
      filters: {
        search: "jollof",
      },
      metadata: {},
    },
    {
      navigatorImpl: null,
      fetchImpl: (async (input: URL | RequestInfo, init?: RequestInit) => {
        fetchUrl = String(input);
        fetchBody = String(init?.body ?? "");
        return new Response(null, { status: 201 });
      }) as typeof fetch,
    },
  );

  assert.equal(fetchUrl, "/api/events");
  assert.match(fetchBody, /"event_type":"search_used"/);
});

test("public session tracking emits session start once and marks first interaction", async () => {
  const storage = createStorageMock();
  const eventTypes: string[] = [];

  const fetchImpl = (async (_input: URL | RequestInfo, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { event_type: string };
    eventTypes.push(body.event_type);
    return new Response(null, { status: 201 });
  }) as typeof fetch;

  await ensurePublicTrackingSession(
    {
      page_path: "/",
      location_source: "precise",
    },
    {
      storageImpl: storage,
      navigatorImpl: null,
      fetchImpl,
    },
  );

  await dispatchPublicUserAction(
    {
      event_type: "vendor_selected",
      page_path: "/",
      location_source: "precise",
      vendor_id: "00000000-0000-4000-8000-000000000001",
      metadata: {},
      filters: {},
    },
    {
      storageImpl: storage,
      navigatorImpl: null,
      fetchImpl,
    },
  );

  await dispatchPublicUserAction(
    {
      event_type: "call_clicked",
      page_path: "/vendors/test",
      location_source: "precise",
      vendor_id: "00000000-0000-4000-8000-000000000001",
      metadata: {},
      filters: {},
    },
    {
      storageImpl: storage,
      navigatorImpl: null,
      fetchImpl,
    },
  );

  assert.deepEqual(eventTypes, [
    "session_started",
    "first_interaction",
    "vendor_selected",
    "call_clicked",
  ]);
});

test("public action tracking emits directions clicks through fetch fallback", async () => {
  const fetchBodies: string[] = [];

  await dispatchPublicUserAction(
    {
      event_type: "directions_clicked",
      page_path: "/vendors/test-vendor",
      location_source: "precise",
      vendor_id: "00000000-0000-4000-8000-000000000001",
      vendor_slug: "test-vendor",
      metadata: {
        source: "detail",
      },
      filters: {},
    },
    {
      navigatorImpl: null,
      fetchImpl: (async (_input: URL | RequestInfo, init?: RequestInit) => {
        fetchBodies.push(String(init?.body ?? ""));
        return new Response(null, { status: 201 });
      }) as typeof fetch,
    },
  );

  assert.ok(fetchBodies.some((body) => /"event_type":"directions_clicked"/.test(body)));
  assert.ok(fetchBodies.some((body) => /"vendor_slug":"test-vendor"/.test(body)));
});

test("navigation-sensitive actions dispatch the primary event before lifecycle follow-ups", async () => {
  const storage = createStorageMock();
  const eventTypes: string[] = [];

  await dispatchPublicUserAction(
    {
      event_type: "call_clicked",
      page_path: "/vendors/test-vendor",
      location_source: "precise",
      vendor_id: "00000000-0000-4000-8000-000000000001",
      vendor_slug: "test-vendor",
      metadata: {
        source: "detail",
      },
      filters: {},
    },
    {
      storageImpl: storage,
      navigatorImpl: {
        sendBeacon(_url, body) {
          const textPromise = body instanceof Blob ? body.text() : Promise.resolve(String(body));
          void textPromise.then((text) => {
            const payload = JSON.parse(text) as { event_type: string };
            eventTypes.push(payload.event_type);
          });
          return true;
        },
      },
    },
  );

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(eventTypes[0], "call_clicked");
  assert.ok(eventTypes.includes("session_started"));
  assert.ok(eventTypes.includes("first_interaction"));
});

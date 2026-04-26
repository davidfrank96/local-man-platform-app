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
        sendBeacon(_url, body) {
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
  assert.equal(fetchCalled, false);
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

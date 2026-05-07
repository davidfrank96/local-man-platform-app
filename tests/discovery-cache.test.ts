import assert from "node:assert/strict";
import test from "node:test";
import {
  applyStoredPublicDiscoveryInvalidationToRetention,
  PUBLIC_DISCOVERY_SNAPSHOT_TTL_MS,
  clearPublicDiscoveryVendorCache,
  invalidatePublicDiscoveryVendorCache,
  isPublicDiscoverySnapshotFresh,
  readPublicDiscoverySnapshot,
  shouldSkipPublicDiscoveryFetch,
} from "../lib/public/discovery-cache.ts";

function createStorage(initialEntries: Array<[string, string]> = []) {
  const values = new Map(initialEntries);

  return {
    get length() {
      return values.size;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

test("clearPublicDiscoveryVendorCache removes discovery snapshot and offline cache entries only", () => {
  const sessionStorage = createStorage([
    ["public-discovery:/", "{\"nearbyData\":{}}"],
    ["admin-session", "{\"role\":\"admin\"}"],
  ]);
  const localStorage = createStorage([
    ["public-discovery-offline:public-discovery:/", "{\"nearbyData\":{}}"],
    ["public-discovery:vendors:invalidation", "{\"reason\":\"vendor_updated\"}"],
    ["other-key", "keep"],
  ]);

  clearPublicDiscoveryVendorCache({
    sessionStorage,
    localStorage,
  });

  assert.equal(sessionStorage.getItem("public-discovery:/"), null);
  assert.equal(sessionStorage.getItem("admin-session"), "{\"role\":\"admin\"}");
  assert.equal(
    localStorage.getItem("public-discovery-offline:public-discovery:/"),
    null,
  );
  assert.equal(localStorage.getItem("other-key"), "keep");
  assert.notEqual(
    localStorage.getItem("public-discovery:vendors:invalidation"),
    null,
  );
});

test("invalidatePublicDiscoveryVendorCache clears caches and records an invalidation payload", () => {
  const sessionStorage = createStorage([
    ["public-discovery:/search?q=rice", "{\"nearbyData\":{}}"],
  ]);
  const localStorage = createStorage([
    ["public-discovery-offline:public-discovery:/search?q=rice", "{\"nearbyData\":{}}"],
  ]);

  invalidatePublicDiscoveryVendorCache(
    {
      reason: "vendor_updated",
      vendorId: "vendor-123",
    },
    {
      sessionStorage,
      localStorage,
    },
  );

  assert.equal(sessionStorage.getItem("public-discovery:/search?q=rice"), null);
  assert.equal(
    localStorage.getItem("public-discovery-offline:public-discovery:/search?q=rice"),
    null,
  );

  const rawPayload = localStorage.getItem("public-discovery:vendors:invalidation");
  assert.ok(rawPayload);
  const payload = JSON.parse(rawPayload);
  assert.equal(payload.reason, "vendor_updated");
  assert.equal(payload.vendorId, "vendor-123");
  assert.equal(typeof payload.timestamp, "string");
});

test("destructive discovery invalidation prunes retained vendor memory for the invalidated vendor", () => {
  const sessionStorage = createStorage([
    ["public-discovery:/search?q=rice", "{\"nearbyData\":{}}"],
  ]);
  const localStorage = createStorage([
    ["public-discovery-offline:public-discovery:/search?q=rice", "{\"nearbyData\":{}}"],
    [
      "public-recently-viewed-vendors",
      JSON.stringify([
        {
          vendor_id: "vendor-123",
          slug: "vendor-123",
          name: "Vendor 123",
          area: "Wuse",
          today_hours: "9:00 AM - 5:00 PM",
          is_open_now: true,
          timestamp: "2026-05-07T17:00:00.000Z",
        },
      ]),
    ],
    [
      "public-last-selected-vendor",
      JSON.stringify({
        vendor_id: "vendor-123",
        slug: "vendor-123",
        name: "Vendor 123",
        area: "Wuse",
        today_hours: "9:00 AM - 5:00 PM",
        is_open_now: true,
        timestamp: "2026-05-07T17:00:00.000Z",
      }),
    ],
  ]);

  invalidatePublicDiscoveryVendorCache(
    {
      reason: "vendor_deactivated",
      vendorId: "vendor-123",
    },
    {
      sessionStorage,
      localStorage,
    },
  );

  assert.equal(
    localStorage.getItem("public-recently-viewed-vendors"),
    "[]",
  );
  assert.equal(
    localStorage.getItem("public-last-selected-vendor"),
    "[]",
  );
});

test("stored destructive invalidation prunes retained vendor memory before hydration", () => {
  const localStorage = createStorage([
    [
      "public-discovery:vendors:invalidation",
      JSON.stringify({
        reason: "vendor_cleanup",
        vendorId: "vendor-123",
        timestamp: "2026-05-07T17:01:00.000Z",
      }),
    ],
    [
      "public-recently-viewed-vendors",
      JSON.stringify([
        {
          vendor_id: "vendor-123",
          slug: "vendor-123",
          name: "Vendor 123",
          area: "Wuse",
          today_hours: "9:00 AM - 5:00 PM",
          is_open_now: true,
          timestamp: "2026-05-07T17:00:00.000Z",
        },
      ]),
    ],
    [
      "public-last-selected-vendor",
      JSON.stringify({
        vendor_id: "vendor-123",
        slug: "vendor-123",
        name: "Vendor 123",
        area: "Wuse",
        today_hours: "9:00 AM - 5:00 PM",
        is_open_now: true,
        timestamp: "2026-05-07T17:00:00.000Z",
      }),
    ],
  ]);

  applyStoredPublicDiscoveryInvalidationToRetention({ localStorage });

  assert.equal(
    localStorage.getItem("public-recently-viewed-vendors"),
    "[]",
  );
  assert.equal(
    localStorage.getItem("public-last-selected-vendor"),
    "[]",
  );
});

test("expired discovery snapshot does not restore cached nearby vendor data", () => {
  const staleTimestamp = new Date(
    Date.now() - PUBLIC_DISCOVERY_SNAPSHOT_TTL_MS - 1_000,
  ).toISOString();
  const sessionStorage = createStorage([
    [
      "public-discovery:/",
      JSON.stringify({
        nearbyData: {
          location: {
            source: "default_city",
            label: "Abuja",
            coordinates: {
              lat: 9.0765,
              lng: 7.3986,
            },
            isApproximate: true,
          },
          vendors: [
            {
              vendor_id: "vendor-1",
            },
          ],
        },
        nearbyDataUpdatedAt: staleTimestamp,
        selectedVendorId: "vendor-1",
        scrollY: 120,
      }),
    ],
  ]);

  const snapshot = readPublicDiscoverySnapshot("public-discovery:/", {
    sessionStorage,
  });

  assert.ok(snapshot);
  assert.equal(snapshot?.selectedVendorId, "vendor-1");
  assert.equal(
    isPublicDiscoverySnapshotFresh(snapshot, {
      nowMs: Date.now(),
    }),
    false,
  );
});

test("discovery snapshot is treated as stale after a later vendor invalidation", () => {
  const nearbyDataUpdatedAt = new Date(Date.now() - 30_000).toISOString();
  const sessionStorage = createStorage([
    [
      "public-discovery:/",
      JSON.stringify({
        nearbyData: {
          location: {
            source: "default_city",
            label: "Abuja",
            coordinates: {
              lat: 9.0765,
              lng: 7.3986,
            },
            isApproximate: true,
          },
          vendors: [
            {
              vendor_id: "vendor-1",
            },
          ],
        },
        nearbyDataUpdatedAt,
        selectedVendorId: "vendor-1",
        scrollY: 120,
      }),
    ],
  ]);
  const localStorage = createStorage([
    [
      "public-discovery:vendors:invalidation",
      JSON.stringify({
        reason: "vendor_deactivated",
        vendorId: "vendor-1",
        timestamp: new Date().toISOString(),
      }),
    ],
  ]);

  const snapshot = readPublicDiscoverySnapshot("public-discovery:/", {
    sessionStorage,
  });

  assert.ok(snapshot);
  assert.equal(
    isPublicDiscoverySnapshotFresh(snapshot, {
      localStorage,
      nowMs: Date.now(),
    }),
    false,
  );
});

test("restored snapshot still requires an authoritative fetch when freshness is forced", () => {
  assert.equal(
    shouldSkipPublicDiscoveryFetch({
      existingRequestKey: null,
      nextRequestKey: "{\"source\":\"default_city\"}",
      restoredNearbyDataRequestKey: "{\"source\":\"default_city\"}",
      requiresAuthoritativeFetch: true,
    }),
    false,
  );

  assert.equal(
    shouldSkipPublicDiscoveryFetch({
      existingRequestKey: null,
      nextRequestKey: "{\"source\":\"default_city\"}",
      restoredNearbyDataRequestKey: "{\"source\":\"default_city\"}",
      requiresAuthoritativeFetch: false,
    }),
    true,
  );
});

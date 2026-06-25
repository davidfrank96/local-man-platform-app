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
  writePublicDiscoverySnapshot,
} from "../lib/public/discovery-cache.ts";
import {
  getDiscoveryOfflineCacheKey,
  readCachedNearbyDiscoveryData,
  writeCachedNearbyDiscoveryData,
} from "../lib/public/discovery-offline-cache.ts";
import {
  buildNearbyRequestKey,
} from "../lib/public/discovery-state.ts";
import {
  getPublicDiscoveryCacheEnvironmentKey,
  PUBLIC_DISCOVERY_CACHE_VERSION,
} from "../lib/public/discovery-cache-hygiene.ts";
import type { NormalizedNearbyVendorsResponseData } from "../lib/public/vendor-normalization.ts";

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

function createNearbyData(vendorId = "00000000-0000-4000-8000-000000000001") {
  return {
    location: {
      source: "default_city" as const,
      label: "Abuja",
      coordinates: {
        lat: 9.0765,
        lng: 7.3986,
      },
      isApproximate: true,
    },
    vendors: [
      {
        vendor_id: vendorId,
        name: "Safe Vendor",
        slug: "safe-vendor",
        short_description: "Safe cached vendor",
        phone_number: "+2348000000000",
        area: "Wuse",
        latitude: 9.08,
        longitude: 7.4,
        price_band: "standard" as const,
        average_rating: 4.5,
        review_count: 12,
        ranking_score: 0,
        distance_km: 1.2,
        is_open_now: true,
        featured_dish: null,
        today_hours: "9:00 AM - 5:00 PM",
      },
    ],
  };
}

function createNormalizedNearbyData(
  vendorId = "00000000-0000-4000-8000-000000000001",
): NormalizedNearbyVendorsResponseData {
  const nearbyData = createNearbyData(vendorId);

	  return {
	    ...nearbyData,
	    map_vendors: nearbyData.vendors.map((vendor) => ({
	      ...vendor,
	      id: vendor.vendor_id,
	      lat: vendor.latitude,
	      lng: vendor.longitude,
	      imageUrl: "/seed-images/rice.jpg",
	      distanceKm: vendor.distance_km,
	      hasValidCoordinates: true,
	    })),
	    vendors: nearbyData.vendors.map((vendor) => ({
	      ...vendor,
	      id: vendor.vendor_id,
      lat: vendor.latitude,
      lng: vendor.longitude,
      imageUrl: "/seed-images/rice.jpg",
	      distanceKm: vendor.distance_km,
	      hasValidCoordinates: true,
	    })),
	    pagination: {
	      page: 1,
	      page_size: nearbyData.vendors.length,
	      total: nearbyData.vendors.length,
	      has_more: false,
	    },
	  };
	}

function createSnapshot(value: Record<string, unknown>) {
  return {
    cacheVersion: PUBLIC_DISCOVERY_CACHE_VERSION,
    cacheEnvironment: getPublicDiscoveryCacheEnvironmentKey(),
    ...value,
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
      JSON.stringify(createSnapshot({
        nearbyData: createNearbyData(),
        nearbyDataUpdatedAt: staleTimestamp,
        selectedVendorId: "00000000-0000-4000-8000-000000000001",
        scrollY: 120,
      })),
    ],
  ]);

  const snapshot = readPublicDiscoverySnapshot("public-discovery:/", {
    sessionStorage,
  });

  assert.ok(snapshot);
  assert.equal(snapshot?.selectedVendorId, "00000000-0000-4000-8000-000000000001");
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
      JSON.stringify(createSnapshot({
        nearbyData: createNearbyData(),
        nearbyDataUpdatedAt,
        selectedVendorId: "00000000-0000-4000-8000-000000000001",
        scrollY: 120,
      })),
    ],
  ]);
  const localStorage = createStorage([
    [
      "public-discovery:vendors:invalidation",
      JSON.stringify({
        reason: "vendor_deactivated",
        vendorId: "00000000-0000-4000-8000-000000000001",
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

test("discovery snapshot write stamps cache version and environment", () => {
  const sessionStorage = createStorage();

  writePublicDiscoverySnapshot(
    "public-discovery:/",
    {
      nearbyData: createNearbyData(),
      nearbyDataUpdatedAt: new Date().toISOString(),
      selectedVendorId: "00000000-0000-4000-8000-000000000001",
      scrollY: 0,
    },
    { sessionStorage },
  );

  const rawSnapshot = sessionStorage.getItem("public-discovery:/");
  assert.ok(rawSnapshot);
  const snapshot = JSON.parse(rawSnapshot);

  assert.equal(snapshot.cacheVersion, PUBLIC_DISCOVERY_CACHE_VERSION);
  assert.equal(snapshot.cacheEnvironment, getPublicDiscoveryCacheEnvironmentKey());
});

test("mock discovery cache never hydrates production discovery state", () => {
  const sessionStorage = createStorage([
    [
      "public-discovery:/",
      JSON.stringify(createSnapshot({
        nearbyData: createNearbyData("30000000-0000-4000-8000-000000000003"),
        nearbyDataUpdatedAt: new Date().toISOString(),
        selectedVendorId: "30000000-0000-4000-8000-000000000003",
        selectedVendorSlug: "open-evening-grill",
        scrollY: 120,
      })),
    ],
  ]);

  const snapshot = readPublicDiscoverySnapshot("public-discovery:/", {
    sessionStorage,
  });

  assert.equal(snapshot, null);
  assert.equal(sessionStorage.getItem("public-discovery:/"), null);
});

test("malformed vendor ids are rejected during discovery cache restore", () => {
  const sessionStorage = createStorage([
    [
      "public-discovery:/",
      JSON.stringify(createSnapshot({
        nearbyData: createNearbyData("vendor-1"),
        nearbyDataUpdatedAt: new Date().toISOString(),
        selectedVendorId: null,
        scrollY: 120,
      })),
    ],
  ]);

  const snapshot = readPublicDiscoverySnapshot("public-discovery:/", {
    sessionStorage,
  });

  assert.equal(snapshot, null);
  assert.equal(sessionStorage.getItem("public-discovery:/"), null);
});

test("incomplete vendor records are rejected during discovery cache restore", () => {
  const nearbyData = createNearbyData();
  delete (nearbyData.vendors[0] as Record<string, unknown>).name;
  const sessionStorage = createStorage([
    [
      "public-discovery:/",
      JSON.stringify(createSnapshot({
        nearbyData,
        nearbyDataUpdatedAt: new Date().toISOString(),
        selectedVendorId: null,
        scrollY: 120,
      })),
    ],
  ]);

  const snapshot = readPublicDiscoverySnapshot("public-discovery:/", {
    sessionStorage,
  });

  assert.equal(snapshot, null);
  assert.equal(sessionStorage.getItem("public-discovery:/"), null);
});

test("environment-mismatched discovery snapshots are discarded", () => {
  const sessionStorage = createStorage([
    [
      "public-discovery:/",
      JSON.stringify({
        ...createSnapshot({
          nearbyData: createNearbyData(),
          nearbyDataUpdatedAt: new Date().toISOString(),
          selectedVendorId: null,
          scrollY: 120,
        }),
        cacheEnvironment: "https://production.example.test",
      }),
    ],
  ]);

  const snapshot = readPublicDiscoverySnapshot("public-discovery:/", {
    sessionStorage,
  });

  assert.equal(snapshot, null);
  assert.equal(sessionStorage.getItem("public-discovery:/"), null);
});

test("offline discovery cache rejects mock vendor payloads", () => {
  const localStorage = createStorage();
  const cacheKey = getDiscoveryOfflineCacheKey("public-discovery:/");

  writeCachedNearbyDiscoveryData(cacheKey, createNormalizedNearbyData(), localStorage);
  assert.ok(readCachedNearbyDiscoveryData(cacheKey, localStorage));

  localStorage.setItem(
    cacheKey,
    JSON.stringify(createSnapshot({
      nearbyData: createNearbyData("30000000-0000-4000-8000-000000000003"),
      cachedAt: new Date().toISOString(),
    })),
  );

  assert.equal(readCachedNearbyDiscoveryData(cacheKey, localStorage), null);
});

test("offline discovery cache rejects known mock slugs even with production-shaped ids", () => {
  const localStorage = createStorage();
  const cacheKey = getDiscoveryOfflineCacheKey("public-discovery:/");
  const nearbyData = createNormalizedNearbyData("5f000000-0000-4000-8000-000000000001");

  nearbyData.vendors[0].slug = "open-evening-grill";

  localStorage.setItem(
    cacheKey,
    JSON.stringify(createSnapshot({
      nearbyData,
      cachedAt: new Date().toISOString(),
    })),
  );

  assert.equal(readCachedNearbyDiscoveryData(cacheKey, localStorage), null);
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

  assert.equal(
    shouldSkipPublicDiscoveryFetch({
      existingRequestKey: null,
      nextRequestKey: "{\"source\":\"default_city\",\"radiusKm\":30}",
      restoredNearbyDataRequestKey: "{\"source\":\"default_city\",\"radiusKm\":1}",
      requiresAuthoritativeFetch: false,
    }),
    false,
  );

  assert.equal(
    shouldSkipPublicDiscoveryFetch({
      existingRequestKey: null,
      nextRequestKey: "{\"source\":\"default_city\",\"radiusKm\":30}",
      restoredNearbyDataRequestKey: null,
      requiresAuthoritativeFetch: false,
    }),
    false,
  );
});

test("nearby request keys include radius, search, and category dimensions", () => {
  const location = {
    source: "precise" as const,
    coordinates: {
      lat: 9.08,
      lng: 7.4,
    },
  };
  const baseFilters = {
    search: "",
    radiusKm: 10,
    openNow: false,
    priceBand: "" as const,
    category: "",
  };
  const clearedSearchKey = buildNearbyRequestKey(location, baseFilters);
  const activeSearchKey = buildNearbyRequestKey(location, {
    ...baseFilters,
    search: "suya",
  });
  const widerRadiusKey = buildNearbyRequestKey(location, {
    ...baseFilters,
    radiusKm: 30,
  });
  const categoryKey = buildNearbyRequestKey(location, {
    ...baseFilters,
    category: "grill",
  });

  assert.notEqual(activeSearchKey, clearedSearchKey);
  assert.notEqual(widerRadiusKey, clearedSearchKey);
  assert.notEqual(categoryKey, clearedSearchKey);
  assert.match(activeSearchKey, /"search":"suya"/);
  assert.match(widerRadiusKey, /"radiusKm":30/);
});

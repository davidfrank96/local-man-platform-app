import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPublicDiscoveryVendorCache,
  invalidatePublicDiscoveryVendorCache,
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

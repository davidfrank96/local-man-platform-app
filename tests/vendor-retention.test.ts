import assert from "node:assert/strict";
import test from "node:test";
import {
  createRetainedVendorPreview,
  readLastSelectedVendor,
  readRecentlyViewedVendors,
  rememberLastSelectedVendor,
  rememberRecentlyViewedVendor,
  type RetainedVendorPreview,
} from "../lib/public/vendor-retention.ts";

function createStorage() {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

function createVendor(index: number): RetainedVendorPreview {
  return {
    vendor_id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    slug: `vendor-${index}`,
    name: `Vendor ${index}`,
    area: "Wuse",
    today_hours: "9:00 AM - 6:00 PM",
    is_open_now: index % 2 === 0,
    timestamp: new Date(`2026-04-${String(index).padStart(2, "0")}T12:00:00.000Z`).toISOString(),
  };
}

test("recently viewed vendors are stored in recency order and deduplicated", () => {
  const storage = createStorage();

  rememberRecentlyViewedVendor(createVendor(1), storage);
  rememberRecentlyViewedVendor(createVendor(2), storage);
  rememberRecentlyViewedVendor(createVendor(1), storage);

  assert.deepEqual(
    readRecentlyViewedVendors(storage).map((vendor) => vendor.slug),
    ["vendor-1", "vendor-2"],
  );
});

test("recently viewed vendors are capped to five items", () => {
  const storage = createStorage();

  for (let index = 1; index <= 6; index += 1) {
    rememberRecentlyViewedVendor(createVendor(index), storage);
  }

  assert.deepEqual(
    readRecentlyViewedVendors(storage).map((vendor) => vendor.slug),
    ["vendor-6", "vendor-5", "vendor-4", "vendor-3", "vendor-2"],
  );
});

test("last selected vendor memory stores and reads back the latest vendor", () => {
  const storage = createStorage();
  const vendor = createVendor(3);

  rememberLastSelectedVendor(vendor, storage);

  assert.deepEqual(readLastSelectedVendor(storage), vendor);
});

test("retained vendor previews can be created from nearby vendor-like data", () => {
  const preview = createRetainedVendorPreview({
    vendor_id: "00000000-0000-4000-8000-000000000001",
    slug: "test-vendor",
    name: "Test Vendor",
    area: "Jabi",
    today_hours: "Closed",
    is_open_now: false,
  });

  assert.equal(preview.slug, "test-vendor");
  assert.equal(preview.today_hours, "Closed");
  assert.equal(typeof preview.timestamp, "string");
});

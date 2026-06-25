import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscoveryVendorLookup,
  normalizeNearbyDiscoveryData,
} from "../lib/public/vendor-normalization.ts";

function createNearbyVendor(index: number) {
  return {
    vendor_id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    name: `Vendor ${index}`,
    slug: `vendor-${index}`,
    short_description: "Scaled discovery vendor",
    phone_number: null,
    area: "Wuse",
    latitude: 9.0765,
    longitude: 7.3986 + index * 0.001,
    price_band: "budget" as const,
    average_rating: 4,
    review_count: 1,
    ranking_score: 0,
    distance_km: index,
    is_open_now: true,
    featured_dish: null,
    today_hours: "Open today",
  };
}

const location = {
  source: "default_city" as const,
  label: "Abuja",
  coordinates: {
    lat: 9.0765,
    lng: 7.3986,
  },
  isApproximate: true,
};

test("normalizes split discovery payload without collapsing map vendors into card vendors", () => {
  const mapVendors = [createNearbyVendor(1), createNearbyVendor(2), createNearbyVendor(3)];
  const normalized = normalizeNearbyDiscoveryData({
    location,
    map_vendors: mapVendors,
    vendors: [mapVendors[0]],
    pagination: {
      page: 1,
      page_size: 1,
      total: 3,
      has_more: true,
    },
  });

  assert.equal(normalized.map_vendors.length, 3);
  assert.equal(normalized.vendors.length, 1);
  assert.equal(normalized.pagination.total, 3);
  assert.equal(normalized.pagination.has_more, true);
});

test("selected vendor lookup includes vendors outside the current card page", () => {
  const cardVendor = normalizeNearbyDiscoveryData({
    location,
    map_vendors: [createNearbyVendor(1), createNearbyVendor(2)],
    vendors: [createNearbyVendor(1)],
    pagination: {
      page: 1,
      page_size: 1,
      total: 2,
      has_more: true,
    },
  });
  const lookup = buildDiscoveryVendorLookup(
    cardVendor.vendors,
    cardVendor.map_vendors,
  );

  assert.equal(lookup.get("00000000-0000-4000-8000-000000000002")?.slug, "vendor-2");
});

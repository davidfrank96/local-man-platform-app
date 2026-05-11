import assert from "node:assert/strict";
import test from "node:test";
import {
  compareDiscoveryVendors,
  countActiveDiscoveryFilters,
  getPopularVendorIds,
  sortDiscoveryVendors,
} from "../lib/vendors/discovery-ranking.ts";
import type { NearbyVendorsResponseData } from "../types/index.ts";

type NearbyVendor = NearbyVendorsResponseData["vendors"][number];

function createVendor(overrides: Partial<NearbyVendor> = {}): NearbyVendor {
  return {
    vendor_id: "00000000-0000-4000-8000-000000000001",
    name: "Vendor",
    slug: "vendor",
    short_description: "Local food vendor",
    phone_number: "+2348000000000",
    area: "Wuse",
    latitude: 9.08,
    longitude: 7.4,
    price_band: "standard",
    average_rating: 4.2,
    review_count: 12,
    ranking_score: 0,
    distance_km: 1.2,
    is_open_now: true,
    featured_dish: {
      dish_name: "Jollof Rice",
      description: null,
    },
    today_hours: "9:00 AM - 6:00 PM",
    ...overrides,
  };
}

const baseFilters = {
  search: "",
  radiusKm: 10,
  openNow: false,
  priceBand: "",
  category: "",
} as const;

test("discovery sorting prioritizes open vendors before closed ones", () => {
  const closedVendor = createVendor({
    vendor_id: "00000000-0000-4000-8000-000000000002",
    slug: "closed-vendor",
    name: "Closed Vendor",
    is_open_now: false,
    ranking_score: 10,
    distance_km: 0.2,
  });
  const openVendor = createVendor({
    vendor_id: "00000000-0000-4000-8000-000000000003",
    slug: "open-vendor",
    name: "Open Vendor",
    is_open_now: true,
    ranking_score: 1,
    distance_km: 1.5,
  });

  const results = sortDiscoveryVendors([closedVendor, openVendor], baseFilters);

  assert.deepEqual(results.map((vendor) => vendor.slug), [
    "open-vendor",
    "closed-vendor",
  ]);
});

test("discovery sorting keeps meaningful distance ahead of popularity within open vendors", () => {
  const nearOpenVendor = createVendor({
    vendor_id: "00000000-0000-4000-8000-000000000002",
    slug: "near-open-vendor",
    name: "Near Open Vendor",
    is_open_now: true,
    ranking_score: 1,
    distance_km: 0.6,
  });
  const popularOpenVendor = createVendor({
    vendor_id: "00000000-0000-4000-8000-000000000003",
    slug: "popular-open-vendor",
    name: "Popular Open Vendor",
    is_open_now: true,
    ranking_score: 8,
    distance_km: 3.1,
  });

  const results = sortDiscoveryVendors([nearOpenVendor, popularOpenVendor], baseFilters);

  assert.deepEqual(results.map((vendor) => vendor.slug), [
    "near-open-vendor",
    "popular-open-vendor",
  ]);
});

test("discovery sorting uses popularity as a close-distance tie-breaker", () => {
  const nearOpenVendor = createVendor({
    vendor_id: "00000000-0000-4000-8000-000000000002",
    slug: "near-open-vendor",
    name: "Near Open Vendor",
    is_open_now: true,
    ranking_score: 1,
    distance_km: 1.2,
  });
  const popularSimilarOpenVendor = createVendor({
    vendor_id: "00000000-0000-4000-8000-000000000003",
    slug: "popular-similar-open-vendor",
    name: "Popular Similar Open Vendor",
    is_open_now: true,
    ranking_score: 8,
    distance_km: 1.3,
  });

  const results = sortDiscoveryVendors(
    [nearOpenVendor, popularSimilarOpenVendor],
    baseFilters,
  );

  assert.deepEqual(results.map((vendor) => vendor.slug), [
    "popular-similar-open-vendor",
    "near-open-vendor",
  ]);
});

test("discovery sorting uses distance when open status and engagement score match", () => {
  const vendors = [
    createVendor({ vendor_id: "3", slug: "open-far", distance_km: 5 }),
    createVendor({ vendor_id: "1", slug: "open-near", distance_km: 1.2 }),
    createVendor({ vendor_id: "2", slug: "open-middle", distance_km: 3.3 }),
  ];

  const results = sortDiscoveryVendors(vendors, baseFilters);

  assert.deepEqual(results.map((vendor) => vendor.slug), [
    "open-near",
    "open-middle",
    "open-far",
  ]);
});

test("discovery sorting does not let search relevance override the ranking contract", () => {
  const exactSearchLowScore = createVendor({
    vendor_id: "00000000-0000-4000-8000-000000000002",
    slug: "exact-search-low-score",
    name: "Rice Spot",
    ranking_score: 1,
    distance_km: 0.6,
  });
  const weakerSearchHighScore = createVendor({
    vendor_id: "00000000-0000-4000-8000-000000000003",
    slug: "weaker-search-high-score",
    name: "Everyday Food",
    area: "Rice district",
    ranking_score: 8,
    distance_km: 3.1,
  });

  const results = sortDiscoveryVendors(
    [exactSearchLowScore, weakerSearchHighScore],
    {
      ...baseFilters,
      search: "rice",
    },
  );

  assert.deepEqual(results.map((vendor) => vendor.slug), [
    "exact-search-low-score",
    "weaker-search-high-score",
  ]);
});

test("discovery comparator sends unknown distances after finite distances", () => {
  const sorted = [
    createVendor({ vendor_id: "2", slug: "unknown-distance", distance_km: Number.NaN }),
    createVendor({ vendor_id: "1", slug: "known-distance", distance_km: 1.2 }),
  ].sort(compareDiscoveryVendors);

  assert.deepEqual(sorted.map((vendor) => vendor.slug), [
    "known-distance",
    "unknown-distance",
  ]);
});

test("popular vendor ids return the top ranked active vendors", () => {
  const vendors = [
    createVendor({ vendor_id: "1", slug: "one", ranking_score: 0 }),
    createVendor({ vendor_id: "2", slug: "two", ranking_score: 4 }),
    createVendor({ vendor_id: "3", slug: "three", ranking_score: 9 }),
    createVendor({ vendor_id: "4", slug: "four", ranking_score: 7 }),
    createVendor({ vendor_id: "5", slug: "five", ranking_score: 2 }),
  ];

  assert.deepEqual([...getPopularVendorIds(vendors)].sort(), ["2", "3", "4"]);
});

test("active filter count stays lightweight and explicit", () => {
  assert.equal(countActiveDiscoveryFilters(baseFilters), 0);
  assert.equal(
    countActiveDiscoveryFilters({
      ...baseFilters,
      search: "rice",
      openNow: true,
      category: "lunch",
    }),
    3,
  );
});

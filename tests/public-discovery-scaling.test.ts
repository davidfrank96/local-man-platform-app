import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getDiscoveryResultSummary,
  getLoadedVendorCountLabel,
  mergeNearbyDiscoveryPage,
  resetNearbyCardsToFirstPage,
} from "../lib/public/discovery-pagination.ts";
import {
  buildDiscoveryVendorLookup,
  normalizeNearbyDiscoveryData,
} from "../lib/public/vendor-normalization.ts";
import {
  createNearbyDiscoveryResult,
  findNearbyVendors,
  type NearbyVendorDiscoveryResult,
  type VendorLocationRecord,
} from "../lib/vendors/nearby.ts";
import type { NearbyVendorsResponseData } from "../types/index.ts";

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
const discoveryOrigin = {
  lat: 9.0813,
  lng: 7.4673,
};

function createDiscoveryData(options: {
  mapCount: number;
  page: number;
  pageSize: number;
  total: number;
}): NearbyVendorsResponseData {
  const mapVendors = Array.from(
    { length: options.mapCount },
    (_, index) => createNearbyVendor(index + 1),
  );
  const startIndex = (options.page - 1) * options.pageSize;
  const vendors = mapVendors.slice(startIndex, startIndex + options.pageSize);

  return {
    location,
    map_vendors: mapVendors,
    vendors,
    pagination: {
      page: options.page,
      page_size: options.pageSize,
      total: options.total,
      has_more: startIndex + vendors.length < options.total,
    },
  };
}

function createVendorLocationRecord(index: number, options?: {
  categorySlug?: string;
  longitudeOffset?: number;
  searchMatch?: boolean;
}): VendorLocationRecord {
  const longitudeOffset = options?.longitudeOffset ?? index * 0.0005;

  return {
    id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name: options?.searchMatch ? `Masa Vendor ${index + 1}` : `Vendor ${index + 1}`,
    slug: options?.searchMatch ? `masa-vendor-${index + 1}` : `vendor-${index + 1}`,
    short_description: options?.searchMatch ? "Fresh masa and local breakfast." : "Local food vendor.",
    phone_number: null,
    area: "Wuse",
    latitude: discoveryOrigin.lat,
    longitude: discoveryOrigin.lng + longitudeOffset,
    price_band: "budget",
    average_rating: 4,
    review_count: 1,
    is_open_override: true,
    vendor_hours: [],
    vendor_featured_dishes: options?.searchMatch
      ? [{ dish_name: "Masa", description: null, is_featured: true }]
      : [],
    vendor_category_map: options?.categorySlug
      ? [
          {
            vendor_categories: {
              slug: options.categorySlug,
              name: options.categorySlug === "rice" ? "Rice" : options.categorySlug,
            },
          },
        ]
      : [],
  };
}

function createVendorLocationRecords(count: number, options?: {
  categoryMatches?: number;
  categorySlug?: string;
  searchMatches?: number;
}): VendorLocationRecord[] {
  return Array.from({ length: count }, (_, index) =>
    createVendorLocationRecord(index, {
      categorySlug:
        options?.categorySlug && index < (options.categoryMatches ?? 0)
          ? options.categorySlug
          : undefined,
      searchMatch: index < (options?.searchMatches ?? 0),
    }),
  );
}

function runDiscoveryLockdown(options: {
  category?: string;
  locationSource?: "precise" | "approximate" | "default_city";
  radiusKm: number;
  search?: string;
  vendors: VendorLocationRecord[];
}): NearbyVendorDiscoveryResult {
  const matchingVendors = findNearbyVendors(options.vendors, {
    lat: discoveryOrigin.lat,
    lng: discoveryOrigin.lng,
    location_source: options.locationSource ?? "approximate",
    radius_km: options.radiusKm,
    category: options.category,
    search: options.search,
  });

  return createNearbyDiscoveryResult(matchingVendors);
}

function assertDiscoverySplit(result: NearbyVendorDiscoveryResult, expected: {
  cardCount: number;
  mapCount: number;
  total: number;
}) {
  assert.equal(result.map_vendors.length, expected.mapCount);
  assert.equal(result.vendors.length, expected.cardCount);
  assert.equal(result.pagination.total, expected.total);
}

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

test("formats discovery summary without implying the first page is the full result set", () => {
  assert.deepEqual(
    getDiscoveryResultSummary({
      hasSearch: false,
      isLoading: false,
      pagination: {
        page: 1,
        page_size: 25,
        total: 137,
        has_more: true,
      },
      visibleCount: 25,
    }),
    {
      primary: "137 vendors found nearby",
      secondary: "Showing the 25 closest vendors",
    },
  );

  assert.deepEqual(
    getDiscoveryResultSummary({
      hasSearch: true,
      isLoading: false,
      pagination: {
        page: 1,
        page_size: 25,
        total: 18,
        has_more: false,
      },
      visibleCount: 18,
    }),
    {
      primary: "18 matching vendors found",
      secondary: null,
    },
  );
});

test("1km discovery with 8 matching vendors sends all vendors to map and cards", () => {
  const result = runDiscoveryLockdown({
    radiusKm: 1,
    vendors: createVendorLocationRecords(8),
  });
  const summary = getDiscoveryResultSummary({
    hasSearch: false,
    isLoading: false,
    pagination: result.pagination,
    visibleCount: result.vendors.length,
  });

  assertDiscoverySplit(result, {
    mapCount: 8,
    cardCount: 8,
    total: 8,
  });
  assert.equal(summary.primary, "8 vendors found nearby");
  assert.equal(summary.secondary, null);
});

test("5km discovery with 63 matching vendors sends all vendors to map and first 25 cards", () => {
  const result = runDiscoveryLockdown({
    radiusKm: 5,
    vendors: createVendorLocationRecords(63),
  });
  const summary = getDiscoveryResultSummary({
    hasSearch: false,
    isLoading: false,
    pagination: result.pagination,
    visibleCount: result.vendors.length,
  });

  assertDiscoverySplit(result, {
    mapCount: 63,
    cardCount: 25,
    total: 63,
  });
  assert.equal(summary.primary, "63 vendors found nearby");
  assert.equal(summary.secondary, "Showing the 25 closest vendors");
  assert.equal(result.pagination.has_more, true);
});

test("30km discovery with 412 matching vendors keeps map complete and cards paginated", () => {
  const result = runDiscoveryLockdown({
    radiusKm: 30,
    vendors: createVendorLocationRecords(412),
  });

  assertDiscoverySplit(result, {
    mapCount: 412,
    cardCount: 25,
    total: 412,
  });
  assert.equal(result.pagination.total, 412);
  assert.equal(result.pagination.page, 1);
  assert.equal(result.pagination.page_size, 25);
});

test("search runs against the complete matching dataset before card pagination", () => {
  const result = runDiscoveryLockdown({
    radiusKm: 30,
    search: "masa",
    vendors: createVendorLocationRecords(80, {
      searchMatches: 41,
    }),
  });
  const summary = getDiscoveryResultSummary({
    hasSearch: true,
    isLoading: false,
    pagination: result.pagination,
    visibleCount: result.vendors.length,
  });

  assertDiscoverySplit(result, {
    mapCount: 41,
    cardCount: 25,
    total: 41,
  });
  assert.equal(summary.primary, "41 matching vendors found");
  assert.equal(summary.secondary, "Showing the 25 closest matches");
});

test("category filtering runs against the complete matching dataset before card pagination", () => {
  const result = runDiscoveryLockdown({
    radiusKm: 30,
    category: "rice",
    vendors: createVendorLocationRecords(120, {
      categoryMatches: 96,
      categorySlug: "rice",
    }),
  });

  assertDiscoverySplit(result, {
    mapCount: 96,
    cardCount: 25,
    total: 96,
  });
});

test("GPS, selected-area, and default-Wuse modes share full map and paginated card behavior", () => {
  const vendors = createVendorLocationRecords(63);
  const modes = [
    { label: "GPS", source: "precise" as const },
    { label: "Selected Area", source: "approximate" as const },
    { label: "Default Wuse", source: "approximate" as const },
  ];

  for (const mode of modes) {
    const result = runDiscoveryLockdown({
      locationSource: mode.source,
      radiusKm: 5,
      vendors,
    });

    assertDiscoverySplit(result, {
      mapCount: 63,
      cardCount: 25,
      total: 63,
    });
  }
});

test("PublicDiscovery does not re-run search, ranking, or radius filtering after the API split", () => {
  const source = readFileSync(
    new URL("../components/public/public-discovery.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("sortDiscoveryVendors"), false);
  assert.equal(source.includes("vendor.distance_km <= filters.radiusKm"), false);
});

test("mergeNearbyDiscoveryPage appends a second page without changing map visibility", () => {
  const firstPage = createDiscoveryData({
    mapCount: 137,
    page: 1,
    pageSize: 25,
    total: 137,
  });
  const secondPage = createDiscoveryData({
    mapCount: 137,
    page: 2,
    pageSize: 25,
    total: 137,
  });
  const merged = mergeNearbyDiscoveryPage(firstPage, secondPage);

  assert.equal(merged.vendors.length, 50);
  assert.equal(merged.map_vendors.length, 137);
  assert.equal(merged.vendors[0]?.vendor_id, firstPage.vendors[0]?.vendor_id);
  assert.equal(merged.vendors.at(-1)?.vendor_id, secondPage.vendors.at(-1)?.vendor_id);
  assert.equal(merged.pagination.page, 2);
  assert.equal(getLoadedVendorCountLabel({
    total: merged.pagination.total,
    visibleCount: merged.vendors.length,
  }), "Showing 50 of 137");
});

test("Load More appends without duplicates, skipped vendors, or map reduction", () => {
  const allVendors = createVendorLocationRecords(63);
  const firstPage = {
    location,
    ...createNearbyDiscoveryResult(
      findNearbyVendors(allVendors, {
        ...discoveryOrigin,
        location_source: "approximate",
        radius_km: 5,
      }),
    ),
  };
  const secondPage = {
    location,
    ...createNearbyDiscoveryResult(
      findNearbyVendors(allVendors, {
        ...discoveryOrigin,
        location_source: "approximate",
        radius_km: 5,
      }),
      { page: 2 },
    ),
  };
  const merged = mergeNearbyDiscoveryPage(firstPage, secondPage);
  const mergedIds = merged.vendors.map((vendor) => vendor.vendor_id);
  const uniqueMergedIds = new Set(mergedIds);
  const expectedIds = firstPage.map_vendors
    .slice(0, 50)
    .map((vendor) => vendor.vendor_id);

  assert.equal(merged.vendors.length, 50);
  assert.equal(uniqueMergedIds.size, 50);
  assert.deepEqual(mergedIds, expectedIds);
  assert.equal(merged.map_vendors.length, 63);
});

test("mergeNearbyDiscoveryPage ignores duplicate vendors from repeated page responses", () => {
  const firstPage = createDiscoveryData({
    mapCount: 137,
    page: 1,
    pageSize: 25,
    total: 137,
  });
  const repeatedPage = createDiscoveryData({
    mapCount: 137,
    page: 1,
    pageSize: 25,
    total: 137,
  });
  const merged = mergeNearbyDiscoveryPage(firstPage, repeatedPage);

  assert.equal(merged.vendors.length, 25);
  assert.equal(merged.map_vendors.length, 137);
});

test("resetNearbyCardsToFirstPage resets cached loaded pages for search and filter changes", () => {
  const firstPage = createDiscoveryData({
    mapCount: 137,
    page: 1,
    pageSize: 25,
    total: 137,
  });
  const secondPage = createDiscoveryData({
    mapCount: 137,
    page: 2,
    pageSize: 25,
    total: 137,
  });
  const loadedData = mergeNearbyDiscoveryPage(firstPage, secondPage);
  const resetData = resetNearbyCardsToFirstPage(loadedData);

  assert.equal(resetData.vendors.length, 25);
  assert.equal(resetData.map_vendors.length, 137);
  assert.equal(resetData.pagination.page, 1);
  assert.equal(resetData.pagination.has_more, true);
});

test("selected vendor lookup remains stable after loading more card vendors", () => {
  const firstPage = createDiscoveryData({
    mapCount: 137,
    page: 1,
    pageSize: 25,
    total: 137,
  });
  const secondPage = createDiscoveryData({
    mapCount: 137,
    page: 2,
    pageSize: 25,
    total: 137,
  });
  const merged = mergeNearbyDiscoveryPage(firstPage, secondPage);
  const normalized = normalizeNearbyDiscoveryData(merged);
  const lookup = buildDiscoveryVendorLookup(
    normalized.vendors,
    normalized.map_vendors,
  );

  assert.equal(lookup.get(createNearbyVendor(80).vendor_id)?.slug, "vendor-80");
});

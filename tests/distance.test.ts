import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDistanceKm,
  getBoundingBox,
  roundDistanceKm,
} from "../lib/location/distance.ts";
import {
  findNearbyVendors,
  getTodayHoursSummary,
  isVendorOpenNow,
  MAX_NEARBY_VENDOR_RESULTS,
  type VendorLocationRecord,
} from "../lib/vendors/nearby.ts";
import {
  nearbyVendorsQuerySchema,
  nearbyVendorsResponseDataSchema,
} from "../lib/validation/schemas.ts";
import { resolveNearbySearchLocation } from "../lib/location/user-location.ts";

const baseVendor = {
  slug: "test-vendor",
  short_description: "Test food vendor",
  phone_number: null,
  area: "Wuse",
  price_band: "budget",
  average_rating: 0,
  review_count: 0,
  is_open_override: null,
  vendor_hours: [],
  vendor_featured_dishes: null,
} satisfies Omit<
  VendorLocationRecord,
  "id" | "name" | "latitude" | "longitude"
>;

test("calculates Haversine distance accurately", () => {
  const distance = calculateDistanceKm(
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
  );

  assert.ok(distance > 111);
  assert.ok(distance < 112);
  assert.equal(roundDistanceKm(distance), 111.2);
});

test("builds a useful bounding box around a point", () => {
  const box = getBoundingBox({ lat: 9.0765, lng: 7.3986 }, 5);

  assert.ok(box.minLat < 9.0765);
  assert.ok(box.maxLat > 9.0765);
  assert.ok(box.minLng < 7.3986);
  assert.ok(box.maxLng > 7.3986);
});

test("filters nearby vendors by radius and sorts nearest first", () => {
  const vendors: VendorLocationRecord[] = [
    {
      ...baseVendor,
      id: "far",
      name: "Far Vendor",
      latitude: 0,
      longitude: 0.08,
    },
    {
      ...baseVendor,
      id: "near",
      name: "Near Vendor",
      latitude: 0,
      longitude: 0.01,
    },
    {
      ...baseVendor,
      id: "middle",
      name: "Middle Vendor",
      latitude: 0,
      longitude: 0.03,
    },
  ];

  const results = findNearbyVendors(vendors, {
    lat: 0,
    lng: 0,
    location_source: "precise",
    radius_km: 5,
  });

  assert.deepEqual(
    results.map((vendor) => vendor.vendor_id),
    ["near", "middle"],
  );
  assert.ok(results[0].distance_km < results[1].distance_km);
  assert.equal(results[0].ranking_score, 0);
});

test("sorts nearby vendors by distance before usage ranking when distance differs meaningfully", () => {
  const vendors: VendorLocationRecord[] = [
    {
      ...baseVendor,
      id: "near-low-score",
      name: "Near Low Score",
      latitude: 0,
      longitude: 0.01,
    },
    {
      ...baseVendor,
      id: "far-high-score",
      name: "Far High Score",
      latitude: 0,
      longitude: 0.03,
    },
  ];

  const results = findNearbyVendors(
    vendors,
    {
      lat: 0,
      lng: 0,
      location_source: "precise",
      radius_km: 5,
    },
    new Date("2026-04-28T12:00:00Z"),
    new Map([
      ["near-low-score", 1],
      ["far-high-score", 8],
    ]),
  );

  assert.deepEqual(
    results.map((vendor) => ({
      id: vendor.vendor_id,
      ranking_score: vendor.ranking_score,
    })),
    [
      { id: "near-low-score", ranking_score: 1 },
      { id: "far-high-score", ranking_score: 8 },
    ],
  );
});

test("uses usage ranking as a tie-breaker for similarly close vendors", () => {
  const vendors: VendorLocationRecord[] = [
    {
      ...baseVendor,
      id: "near-low-score",
      name: "Near Low Score",
      latitude: 0,
      longitude: 0.01,
    },
    {
      ...baseVendor,
      id: "similar-high-score",
      name: "Similar High Score",
      latitude: 0,
      longitude: 0.011,
    },
  ];

  const results = findNearbyVendors(
    vendors,
    {
      lat: 0,
      lng: 0,
      location_source: "precise",
      radius_km: 5,
    },
    new Date("2026-04-28T12:00:00Z"),
    new Map([
      ["near-low-score", 1],
      ["similar-high-score", 8],
    ]),
  );

  assert.deepEqual(
    results.map((vendor) => ({
      id: vendor.vendor_id,
      ranking_score: vendor.ranking_score,
    })),
    [
      { id: "similar-high-score", ranking_score: 8 },
      { id: "near-low-score", ranking_score: 1 },
    ],
  );
});

test("keeps open vendors ahead of closed vendors before ranking and distance", () => {
  const vendors: VendorLocationRecord[] = [
    {
      ...baseVendor,
      id: "closed-high-score",
      name: "Closed High Score",
      latitude: 0,
      longitude: 0.01,
      is_open_override: false,
    },
    {
      ...baseVendor,
      id: "open-lower-score",
      name: "Open Lower Score",
      latitude: 0,
      longitude: 0.03,
      is_open_override: true,
    },
  ];

  const results = findNearbyVendors(
    vendors,
    {
      lat: 0,
      lng: 0,
      location_source: "precise",
      radius_km: 5,
    },
    new Date("2026-04-28T12:00:00Z"),
    new Map([
      ["closed-high-score", 8],
      ["open-lower-score", 1],
    ]),
  );

  assert.deepEqual(
    results.map((vendor) => vendor.vendor_id),
    ["open-lower-score", "closed-high-score"],
  );
});

test("search ranking keeps closer matches ahead of stronger name matches outside close-distance ties", () => {
  const vendors: VendorLocationRecord[] = [
    {
      ...baseVendor,
      id: "ranked-area-match",
      name: "Kitchen Corner",
      area: "Rice district",
      latitude: 0,
      longitude: 0.01,
    },
    {
      ...baseVendor,
      id: "prefix-name-match",
      name: "Rice Corner",
      area: "Wuse",
      latitude: 0,
      longitude: 0.03,
    },
  ];

  const results = findNearbyVendors(
    vendors,
    {
      lat: 0,
      lng: 0,
      location_source: "precise",
      radius_km: 5,
      search: "rice",
    },
    new Date("2026-04-28T12:00:00Z"),
    new Map([
      ["ranked-area-match", 9],
      ["prefix-name-match", 1],
    ]),
  );

  assert.deepEqual(
    results.map((vendor) => vendor.vendor_id),
    ["ranked-area-match", "prefix-name-match"],
  );
});

test("search hierarchy stays stable across 1km 5km 10km and 30km radius flows", () => {
  const vendors: VendorLocationRecord[] = [
    {
      ...baseVendor,
      id: "closed-name-match",
      name: "Rice Corner",
      latitude: 0,
      longitude: 0.02,
      is_open_override: false,
    },
    {
      ...baseVendor,
      id: "closed-dish-match",
      name: "Office Lunch Bowl",
      latitude: 0,
      longitude: 0.035,
      is_open_override: false,
      vendor_featured_dishes: [
        {
          dish_name: "Fried rice and chicken",
          description: null,
          is_featured: true,
        },
      ],
    },
    {
      ...baseVendor,
      id: "open-ayobami-match",
      name: "Ayobami Jesus",
      slug: "pepper-soup-rice",
      latitude: 0,
      longitude: 0.086,
      is_open_override: true,
      vendor_featured_dishes: [
        {
          dish_name: "Pepper soup rice",
          description: null,
          is_featured: true,
        },
      ],
    },
    {
      ...baseVendor,
      id: "far-closed-match",
      name: "Rice Palace",
      latitude: 0,
      longitude: 0.22,
      is_open_override: false,
    },
  ];

  const rankedIdsForRadius = (radius_km: number) =>
    findNearbyVendors(
      vendors,
      {
        lat: 0,
        lng: 0,
        location_source: "precise",
        radius_km,
        search: "rice",
      },
      new Date("2026-04-28T12:00:00Z"),
      new Map([
        ["closed-name-match", 5],
        ["closed-dish-match", 3],
        ["open-ayobami-match", 1],
        ["far-closed-match", 10],
      ]),
    ).map((vendor) => vendor.vendor_id);

  assert.deepEqual(rankedIdsForRadius(1), []);
  assert.deepEqual(rankedIdsForRadius(5), [
    "closed-name-match",
    "closed-dish-match",
  ]);
  assert.deepEqual(rankedIdsForRadius(10), [
    "open-ayobami-match",
    "closed-name-match",
    "closed-dish-match",
  ]);
  assert.deepEqual(rankedIdsForRadius(30), [
    "open-ayobami-match",
    "closed-name-match",
    "closed-dish-match",
    "far-closed-match",
  ]);
});

test("search matches featured dishes and categories before unrelated vendors", () => {
  const vendors: VendorLocationRecord[] = [
    {
      ...baseVendor,
      id: "suya-dish",
      name: "Evening Grill",
      short_description: "Chicken and chips.",
      latitude: 0,
      longitude: 0.03,
      vendor_featured_dishes: [
        {
          dish_name: "Beef suya",
          description: "Peppered skewers",
          is_featured: true,
        },
      ],
    },
    {
      ...baseVendor,
      id: "suya-category",
      name: "Neighborhood Kitchen",
      short_description: "Daily meals.",
      latitude: 0,
      longitude: 0.02,
      vendor_category_map: [
        {
          vendor_categories: {
            slug: "suya",
            name: "Suya",
          },
        },
      ],
    },
    {
      ...baseVendor,
      id: "unrelated",
      name: "Rice Bowl",
      short_description: "Jollof rice and stew.",
      latitude: 0,
      longitude: 0.01,
    },
  ];

  const results = findNearbyVendors(vendors, {
    lat: 0,
    lng: 0,
    location_source: "precise",
    radius_km: 5,
    search: "suya",
  });

  assert.deepEqual(
    results.map((vendor) => vendor.vendor_id),
    ["suya-category", "suya-dish"],
  );
});

test("sorts open vendors by distance when engagement score matches", () => {
  const vendors: VendorLocationRecord[] = [
    {
      ...baseVendor,
      id: "open-far",
      name: "Open Far",
      latitude: 0,
      longitude: 0.045,
      is_open_override: true,
    },
    {
      ...baseVendor,
      id: "open-near",
      name: "Open Near",
      latitude: 0,
      longitude: 0.011,
      is_open_override: true,
    },
    {
      ...baseVendor,
      id: "open-middle",
      name: "Open Middle",
      latitude: 0,
      longitude: 0.03,
      is_open_override: true,
    },
  ];

  const results = findNearbyVendors(
    vendors,
    {
      lat: 0,
      lng: 0,
      location_source: "precise",
      radius_km: 10,
    },
    new Date("2026-04-28T12:00:00Z"),
    new Map([
      ["open-far", 2],
      ["open-near", 2],
      ["open-middle", 2],
    ]),
  );

  assert.deepEqual(
    results.map((vendor) => vendor.vendor_id),
    ["open-near", "open-middle", "open-far"],
  );
});

test("sorts closed vendors by distance before engagement score after open vendors", () => {
  const vendors: VendorLocationRecord[] = [
    {
      ...baseVendor,
      id: "closed-near-low-score",
      name: "Closed Near Low Score",
      latitude: 0,
      longitude: 0.005,
      is_open_override: false,
    },
    {
      ...baseVendor,
      id: "closed-far-high-score",
      name: "Closed Far High Score",
      latitude: 0,
      longitude: 0.03,
      is_open_override: false,
    },
    {
      ...baseVendor,
      id: "open-low-score",
      name: "Open Low Score",
      latitude: 0,
      longitude: 0.04,
      is_open_override: true,
    },
  ];

  const results = findNearbyVendors(
    vendors,
    {
      lat: 0,
      lng: 0,
      location_source: "precise",
      radius_km: 10,
    },
    new Date("2026-04-28T12:00:00Z"),
    new Map([
      ["closed-near-low-score", 1],
      ["closed-far-high-score", 9],
      ["open-low-score", 0],
    ]),
  );

  assert.deepEqual(
    results.map((vendor) => vendor.vendor_id),
    ["open-low-score", "closed-near-low-score", "closed-far-high-score"],
  );
});

test("includes one featured dish summary when present", () => {
  const results = findNearbyVendors(
    [
      {
        ...baseVendor,
        id: "featured",
        name: "Featured Vendor",
        latitude: 0,
        longitude: 0.01,
        vendor_featured_dishes: [
          {
            dish_name: "Rice and stew",
            description: "Lunch plate",
            is_featured: true,
          },
          {
            dish_name: "Beans and plantain",
            description: "Backup dish",
            is_featured: false,
          },
        ],
      },
    ],
    {
      lat: 0,
      lng: 0,
      location_source: "precise",
      radius_km: 5,
    },
  );

  assert.deepEqual(results[0]?.featured_dish, {
    dish_name: "Rice and stew",
    description: "Lunch plate",
  });
});

test("returns compact today hours from nearby vendors", () => {
  const results = findNearbyVendors(
    [
      {
        ...baseVendor,
        id: "hours",
        name: "Hours Vendor",
        latitude: 0,
        longitude: 0.01,
        vendor_hours: [
          {
            day_of_week: 2,
            open_time: "19:00",
            close_time: "02:00",
            is_closed: false,
          },
        ],
      },
    ],
    {
      lat: 0,
      lng: 0,
      location_source: "precise",
      radius_km: 5,
    },
    new Date("2026-04-28T12:00:00Z"),
  );

  assert.equal(results[0]?.today_hours, "7:00 PM - 2:00 AM");
});

test("returns an empty list when no vendors are nearby", () => {
  const results = findNearbyVendors(
    [
      {
        ...baseVendor,
        id: "far",
        name: "Far Vendor",
        latitude: 0,
        longitude: 1,
      },
    ],
    {
      lat: 0,
      lng: 0,
      location_source: "precise",
      radius_km: 1,
    },
  );

  assert.deepEqual(results, []);
});

test("caps nearby results to the public payload limit", () => {
  const vendors: VendorLocationRecord[] = Array.from(
    { length: MAX_NEARBY_VENDOR_RESULTS + 5 },
    (_, index) => ({
      ...baseVendor,
      id: `vendor-${index + 1}`,
      name: `Vendor ${String(index + 1).padStart(2, "0")}`,
      latitude: 0,
      longitude: 0.0005 * (index + 1),
      is_open_override: true,
    }),
  );

  const results = findNearbyVendors(vendors, {
    lat: 0,
    lng: 0,
    location_source: "precise",
    radius_km: 10,
  });

  assert.equal(results.length, MAX_NEARBY_VENDOR_RESULTS);
  assert.equal(results[0]?.vendor_id, "vendor-1");
  assert.equal(results.at(-1)?.vendor_id, `vendor-${MAX_NEARBY_VENDOR_RESULTS}`);
});

test("nearby response schema accepts the actual nearby result shape", () => {
  const results = findNearbyVendors(
    [
      {
        ...baseVendor,
        id: "00000000-0000-4000-8000-000000000001",
        name: "Near Vendor",
        latitude: 0,
        longitude: 0.01,
      },
    ],
    {
      lat: 0,
      lng: 0,
      location_source: "precise",
      radius_km: 5,
    },
  );

  const parsed = nearbyVendorsResponseDataSchema.safeParse({
    location: {
      source: "precise",
      label: "Current location",
      coordinates: {
        lat: 0,
        lng: 0,
      },
      isApproximate: false,
    },
    vendors: results,
  });

  if (!parsed.success) {
    assert.fail(JSON.stringify(parsed.error.issues));
  }
});

test("today hours summary handles closed and missing schedules", () => {
  assert.equal(
    getTodayHoursSummary(
      [
        {
          day_of_week: 2,
          open_time: null,
          close_time: null,
          is_closed: true,
        },
      ],
      new Date("2026-04-28T12:00:00Z"),
    ),
    "Closed",
  );

  assert.equal(getTodayHoursSummary([], new Date("2026-04-28T12:00:00Z")), "Hours not listed");
});

test("rejects invalid or partial user location", () => {
  assert.equal(
    nearbyVendorsQuerySchema.safeParse({
      lat: 9.0765,
    }).success,
    false,
  );
  assert.equal(
    nearbyVendorsQuerySchema.safeParse({
      lat: 120,
      lng: 7.3986,
    }).success,
    false,
  );
});

test("resolves missing user location to the Abuja default city view", () => {
  const parsed = nearbyVendorsQuerySchema.parse({});
  const resolved = resolveNearbySearchLocation(parsed);

  assert.equal(resolved.location.source, "default_city");
  assert.equal(resolved.location.label, "Abuja");
  assert.equal(resolved.location.isApproximate, true);
  assert.equal(resolved.query.lat, 9.0765);
  assert.equal(resolved.query.lng, 7.3986);
});

test("supports manual open override and open-now filtering", () => {
  const vendors: VendorLocationRecord[] = [
    {
      ...baseVendor,
      id: "open",
      name: "Open Vendor",
      latitude: 0,
      longitude: 0.01,
      is_open_override: true,
    },
    {
      ...baseVendor,
      id: "closed",
      name: "Closed Vendor",
      latitude: 0,
      longitude: 0.02,
      is_open_override: false,
    },
  ];

  const results = findNearbyVendors(vendors, {
    lat: 0,
    lng: 0,
    location_source: "precise",
    radius_km: 5,
    open_now: true,
  });

  assert.deepEqual(
    results.map((vendor) => vendor.vendor_id),
    ["open"],
  );
});

test("supports category filtering when category mappings are present", () => {
  const vendors: VendorLocationRecord[] = [
    {
      ...baseVendor,
      id: "breakfast",
      name: "Breakfast Vendor",
      latitude: 0,
      longitude: 0.01,
      vendor_category_map: [
        {
          vendor_categories: {
            slug: "breakfast",
          },
        },
      ],
    },
    {
      ...baseVendor,
      id: "dinner",
      name: "Dinner Vendor",
      latitude: 0,
      longitude: 0.02,
      vendor_category_map: [
        {
          vendor_categories: {
            slug: "dinner",
          },
        },
      ],
    },
  ];

  const results = findNearbyVendors(vendors, {
    lat: 0,
    lng: 0,
    location_source: "precise",
    radius_km: 5,
    category: "breakfast",
  });

  assert.deepEqual(
    results.map((vendor) => vendor.vendor_id),
    ["breakfast"],
  );
});

test("supports overnight hours", () => {
  const open = isVendorOpenNow(
    [
      {
        day_of_week: 1,
        open_time: "18:00",
        close_time: "02:00",
        is_closed: false,
      },
    ],
    null,
    new Date("2026-04-21T00:30:00+01:00"),
  );

  assert.equal(open, true);
});

test("today hours summary uses the overnight window that keeps a vendor open after midnight", () => {
  assert.equal(
    getTodayHoursSummary(
      [
        {
          day_of_week: 1,
          open_time: "18:00",
          close_time: "02:00",
          is_closed: false,
        },
        {
          day_of_week: 2,
          open_time: null,
          close_time: null,
          is_closed: true,
        },
      ],
      new Date("2026-04-21T00:30:00+01:00"),
    ),
    "6:00 PM - 2:00 AM",
  );
});

test("today hours summary does not contradict a manual open override on a closed day", () => {
  assert.equal(
    getTodayHoursSummary(
      [
        {
          day_of_week: 2,
          open_time: null,
          close_time: null,
          is_closed: true,
        },
      ],
      new Date("2026-04-28T12:00:00Z"),
      true,
    ),
    "Open now",
  );
});

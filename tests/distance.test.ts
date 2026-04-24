import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDistanceKm,
  getBoundingBox,
  roundDistanceKm,
} from "../lib/location/distance.ts";
import {
  findNearbyVendors,
  isVendorOpenNow,
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

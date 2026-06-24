import assert from "node:assert/strict";
import test from "node:test";
import {
  CARD_SELECTION_ANIMATION_MS,
  CLUSTER_EXPANSION_ANIMATION_MS,
  VENDOR_CLUSTER_MAX_ZOOM,
  VENDOR_CLUSTER_RADIUS_DESKTOP,
  VENDOR_CLUSTER_RADIUS_MOBILE,
  createSelectedVendorFeatureCollection,
  createVendorFeatureCollection,
  getClusterExpansionCameraOffset,
  getSameLocationGroupForVendor,
  getSameLocationGroups,
  getSelectionCameraOffset,
  getVendorClusterRadius,
} from "../components/public/vendor-map-clustering.ts";
import type { NearbyVendor } from "../components/public/vendor-map-types.ts";

function createVendor(
  vendorId: string,
  overrides: Partial<NearbyVendor> = {},
): NearbyVendor {
  return {
    vendor_id: vendorId,
    name: `Vendor ${vendorId}`,
    slug: `vendor-${vendorId}`,
    short_description: "Test vendor",
    phone_number: null,
    area: "Wuse",
    latitude: 9.0813,
    longitude: 7.4673,
    price_band: "budget",
    average_rating: 4.2,
    review_count: 3,
    ranking_score: 0,
    distance_km: 0.5,
    is_open_now: true,
    featured_dish: null,
    categories: [],
    today_hours: "9:00 AM - 5:00 PM",
    active_hours: "9:00 AM - 5:00 PM",
    ...overrides,
  };
}

test("vendor feature collection preserves vendor identity without changing order", () => {
  const vendors = [
    createVendor("first", { latitude: 9.0813, longitude: 7.4673 }),
    createVendor("second", { latitude: 9.082, longitude: 7.468 }),
  ];
  const collection = createVendorFeatureCollection(vendors);

  assert.equal(collection.type, "FeatureCollection");
  assert.deepEqual(
    collection.features.map((feature) => feature.properties.vendorId),
    ["first", "second"],
  );
  assert.deepEqual(collection.features[0]?.geometry.coordinates, [7.4673, 9.0813]);
});

test("same-location groups identify duplicate coordinate stacks", () => {
  const vendors = [
    createVendor("first"),
    createVendor("second"),
    createVendor("third", { latitude: 9.09, longitude: 7.49 }),
  ];
  const groups = getSameLocationGroups(vendors);
  const firstGroup = getSameLocationGroupForVendor(groups, "first");

  assert.equal(groups.length, 2);
  assert.equal(firstGroup?.vendors.length, 2);

  const collection = createVendorFeatureCollection(vendors, groups);
  const firstFeature = collection.features.find(
    (feature) => feature.properties.vendorId === "first",
  );
  const thirdFeature = collection.features.find(
    (feature) => feature.properties.vendorId === "third",
  );

  assert.equal(firstFeature?.properties.sameLocationCount, 2);
  assert.equal(thirdFeature?.properties.sameLocationCount, 1);
});

test("selected vendor overlay is independent from clustered source", () => {
  const vendors = [createVendor("first"), createVendor("second")];
  const selectedCollection = createSelectedVendorFeatureCollection(vendors, "second");

  assert.equal(selectedCollection.features.length, 1);
  assert.equal(selectedCollection.features[0]?.properties.vendorId, "second");
});

test("cluster sizing and camera timing stay within approved mobile UX ranges", () => {
  assert.equal(getVendorClusterRadius(false), VENDOR_CLUSTER_RADIUS_DESKTOP);
  assert.equal(getVendorClusterRadius(true), VENDOR_CLUSTER_RADIUS_MOBILE);
  assert.equal(VENDOR_CLUSTER_MAX_ZOOM, 15);
  assert.deepEqual(getSelectionCameraOffset(true), [0, -96]);
  assert.deepEqual(getClusterExpansionCameraOffset(true), [0, -52]);
  assert.equal(getSelectionCameraOffset(false), undefined);
  assert.equal(CARD_SELECTION_ANIMATION_MS >= 300 && CARD_SELECTION_ANIMATION_MS <= 380, true);
  assert.equal(
    CLUSTER_EXPANSION_ANIMATION_MS >= 280 && CLUSTER_EXPANSION_ANIMATION_MS <= 340,
    true,
  );
});

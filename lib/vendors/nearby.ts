import {
  calculateDistanceKm,
  getBoundingBox,
  roundDistanceKm,
  type BoundingBox,
  type Coordinates,
} from "../location/distance.ts";
import type { ResolvedNearbyVendorsQuery } from "../location/user-location.ts";
import type { PriceBand } from "../../types";
import { compareDiscoveryVendors } from "./discovery-ranking.ts";
import {
  getVendorAvailabilitySnapshot,
  type VendorHourWindow,
} from "./hours.ts";

export const DEFAULT_NEARBY_RADIUS_KM = 10;
export const MAX_NEARBY_VENDOR_RESULTS = 50;

export type NearbyVendorFeaturedDishSummary = {
  dish_name: string;
  description: string | null;
};

export type VendorLocationRecord = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  phone_number: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  price_band: PriceBand | null;
  average_rating: number;
  review_count: number;
  is_open_override: boolean | null;
  vendor_hours?: VendorHourWindow[] | null;
  vendor_featured_dishes?: Array<{
    dish_name: string;
    description: string | null;
    is_featured: boolean;
  }> | null;
  vendor_category_map?: Array<{
    vendor_categories: {
      slug: string;
    } | null;
  }> | null;
};

export type NearbyVendorResult = {
  vendor_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  phone_number: string | null;
  area: string | null;
  latitude: number;
  longitude: number;
  price_band: PriceBand | null;
  average_rating: number;
  review_count: number;
  ranking_score: number;
  distance_km: number;
  is_open_now: boolean;
  featured_dish: NearbyVendorFeaturedDishSummary | null;
  today_hours: string;
};

type NearbyVendorSortable = NearbyVendorResult & {
  rawDistanceKm: number;
};

export type VendorUsageScoreMap = Map<string, number>;

export function getEffectiveNearbyRadiusKm(
  radiusKm: number | undefined,
): number {
  return radiusKm ?? DEFAULT_NEARBY_RADIUS_KM;
}

export function getNearbyBoundingBox(query: ResolvedNearbyVendorsQuery): BoundingBox {
  return getBoundingBox(
    { lat: query.lat, lng: query.lng },
    getEffectiveNearbyRadiusKm(query.radius_km),
  );
}

function matchesSearch(vendor: VendorLocationRecord, search: string): boolean {
  const normalizedSearch = search.toLowerCase();

  return [vendor.name, vendor.short_description, vendor.area]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalizedSearch));
}

function matchesCategory(vendor: VendorLocationRecord, category: string): boolean {
  return (
    vendor.vendor_category_map?.some(
      (mapping) => mapping.vendor_categories?.slug === category,
    ) ?? false
  );
}

function getFeaturedDishSummary(
  vendor: VendorLocationRecord,
): NearbyVendorFeaturedDishSummary | null {
  const featuredDish =
    vendor.vendor_featured_dishes?.find((dish) => dish.is_featured) ??
    vendor.vendor_featured_dishes?.[0];

  if (!featuredDish) return null;

  return {
    dish_name: featuredDish.dish_name,
    description: featuredDish.description,
  };
}

export {
  getTodayHoursSummary,
  getVendorAvailabilitySnapshot,
  isVendorOpenNow,
  type VendorAvailabilitySnapshot,
} from "./hours.ts";

export function findNearbyVendors(
  vendors: VendorLocationRecord[],
  query: ResolvedNearbyVendorsQuery,
  now = new Date(),
  usageScores: VendorUsageScoreMap = new Map(),
): NearbyVendorResult[] {
  const userLocation: Coordinates = {
    lat: query.lat,
    lng: query.lng,
  };
  const radiusKm = getEffectiveNearbyRadiusKm(query.radius_km);
  const results: NearbyVendorSortable[] = [];

  for (const vendor of vendors) {
    if (vendor.latitude === null || vendor.longitude === null) {
      continue;
    }
    if (query.price_band && vendor.price_band !== query.price_band) {
      continue;
    }
    if (query.search && !matchesSearch(vendor, query.search)) {
      continue;
    }
    if (query.category && !matchesCategory(vendor, query.category)) {
      continue;
    }

    const rawDistanceKm = calculateDistanceKm(userLocation, {
      lat: vendor.latitude,
      lng: vendor.longitude,
    });

    if (rawDistanceKm > radiusKm) {
      continue;
    }

    const availability = getVendorAvailabilitySnapshot(
      vendor.vendor_hours,
      vendor.is_open_override,
      now,
    );

    if (query.open_now === true && !availability.isOpenNow) {
      continue;
    }

    const result: NearbyVendorSortable = {
      vendor_id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      short_description: vendor.short_description,
      phone_number: vendor.phone_number,
      area: vendor.area,
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      price_band: vendor.price_band,
      average_rating: vendor.average_rating,
      review_count: vendor.review_count,
      ranking_score: Math.max(0, Math.trunc(usageScores.get(vendor.id) ?? 0)),
      distance_km: roundDistanceKm(rawDistanceKm),
      is_open_now: availability.isOpenNow,
      featured_dish: getFeaturedDishSummary(vendor),
      today_hours: availability.todayHours,
      rawDistanceKm,
    };

    results.push(result);
  }

  results.sort(compareDiscoveryVendors);

  return results
    .slice(0, MAX_NEARBY_VENDOR_RESULTS)
    .map(({ rawDistanceKm, ...vendor }) => {
      void rawDistanceKm;
      return vendor;
    });
}

import type { NearbyVendorsResponseData, PriceBand } from "../../types/index.ts";

type NearbyVendor = NearbyVendorsResponseData["vendors"][number];
type DiscoveryRankableVendor = {
  vendor_id: string;
  name: string;
  is_open_now?: boolean | null;
  ranking_score?: number | null;
  distance_km?: number | null;
  rawDistanceKm?: number | null;
};

export const DISCOVERY_POPULARITY_DISTANCE_TIE_THRESHOLD_KM = 0.5;

export type DiscoveryFiltersLike = {
  search: string;
  radiusKm: number;
  openNow: boolean;
  priceBand: PriceBand | "";
  category: string;
};

function getOpenRank(vendor: DiscoveryRankableVendor): number {
  if (vendor.is_open_now === true) return 0;
  if (vendor.is_open_now === false) return 2;
  return 1;
}

function getPopularityRank(vendor: DiscoveryRankableVendor): number {
  return Math.max(0, Math.trunc(vendor.ranking_score ?? 0));
}

function getDistanceRank(vendor: DiscoveryRankableVendor): number {
  const distance =
    typeof vendor.rawDistanceKm === "number" ? vendor.rawDistanceKm : vendor.distance_km;

  return typeof distance === "number" && Number.isFinite(distance)
    ? distance
    : Number.POSITIVE_INFINITY;
}

function getDistanceDifference(
  left: DiscoveryRankableVendor,
  right: DiscoveryRankableVendor,
): {
  difference: number;
  isCloseTie: boolean;
} {
  const leftDistance = getDistanceRank(left);
  const rightDistance = getDistanceRank(right);

  if (leftDistance === rightDistance) {
    return {
      difference: 0,
      isCloseTie: Number.isFinite(leftDistance),
    };
  }

  const difference = leftDistance - rightDistance;

  return {
    difference,
    isCloseTie:
      Number.isFinite(leftDistance) &&
      Number.isFinite(rightDistance) &&
      Math.abs(difference) <= DISCOVERY_POPULARITY_DISTANCE_TIE_THRESHOLD_KM,
  };
}

export function compareDiscoveryVendors(
  left: DiscoveryRankableVendor,
  right: DiscoveryRankableVendor,
): number {
  const openRankDifference = getOpenRank(left) - getOpenRank(right);
  if (openRankDifference !== 0) return openRankDifference;

  const distanceRankDifference = getDistanceDifference(left, right);
  const popularityRankDifference = getPopularityRank(right) - getPopularityRank(left);

  if (distanceRankDifference.isCloseTie && popularityRankDifference !== 0) {
    return popularityRankDifference;
  }

  if (distanceRankDifference.difference !== 0) {
    return distanceRankDifference.difference;
  }

  if (popularityRankDifference !== 0) return popularityRankDifference;

  return left.name.localeCompare(right.name) || left.vendor_id.localeCompare(right.vendor_id);
}

export function sortDiscoveryVendors(
  vendors: NearbyVendor[],
  filters: DiscoveryFiltersLike,
): NearbyVendor[] {
  void filters;

  return [...vendors].sort(compareDiscoveryVendors);
}

export function getPopularVendorIds(vendors: NearbyVendor[]): Set<string> {
  const rankedVendors = [...vendors]
    .filter((vendor) => vendor.ranking_score > 0)
    .sort(
      (left, right) =>
        right.ranking_score - left.ranking_score ||
        left.distance_km - right.distance_km ||
        left.name.localeCompare(right.name) ||
        left.vendor_id.localeCompare(right.vendor_id),
    )
    .slice(0, 3);

  return new Set(rankedVendors.map((vendor) => vendor.vendor_id));
}

export function countActiveDiscoveryFilters(filters: DiscoveryFiltersLike): number {
  return [
    filters.search.length > 0,
    filters.radiusKm !== 10,
    filters.openNow,
    filters.priceBand !== "",
    filters.category !== "",
  ].filter(Boolean).length;
}

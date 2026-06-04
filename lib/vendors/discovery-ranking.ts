import type { NearbyVendorsResponseData, PriceBand } from "../../types/index.ts";
import {
  getSearchRelevanceScore,
  normalizeSearchText,
  type SearchMatchField,
} from "./search.ts";

type NearbyVendor = NearbyVendorsResponseData["vendors"][number];
type DiscoveryRankableVendor = {
  vendor_id: string;
  name: string;
  slug?: string | null;
  short_description?: string | null;
  area?: string | null;
  featured_dish?: {
    dish_name: string;
    description: string | null;
  } | null;
  categories?: Array<{
    name: string | null;
    slug: string;
  }>;
  is_open_now?: boolean | null;
  ranking_score?: number | null;
  distance_km?: number | null;
  rawDistanceKm?: number | null;
};

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

export function compareDiscoveryVendors(
  left: DiscoveryRankableVendor,
  right: DiscoveryRankableVendor,
): number {
  const openRankDifference = getOpenRank(left) - getOpenRank(right);
  if (openRankDifference !== 0) return openRankDifference;

  const distanceRankDifference = getDistanceRank(left) - getDistanceRank(right);
  const popularityRankDifference = getPopularityRank(right) - getPopularityRank(left);

  if (distanceRankDifference !== 0) return distanceRankDifference;

  if (popularityRankDifference !== 0) return popularityRankDifference;

  return left.name.localeCompare(right.name) || left.vendor_id.localeCompare(right.vendor_id);
}

export function compareSearchRankedDiscoveryVendors(
  left: DiscoveryRankableVendor,
  right: DiscoveryRankableVendor,
  leftSearchScore: number,
  rightSearchScore: number,
): number {
  const openRankDifference = getOpenRank(left) - getOpenRank(right);
  if (openRankDifference !== 0) return openRankDifference;

  const distanceRankDifference = getDistanceRank(left) - getDistanceRank(right);
  const searchRankDifference = rightSearchScore - leftSearchScore;
  const popularityRankDifference = getPopularityRank(right) - getPopularityRank(left);

  if (distanceRankDifference !== 0) return distanceRankDifference;

  if (searchRankDifference !== 0) return searchRankDifference;
  if (popularityRankDifference !== 0) return popularityRankDifference;

  return compareDiscoveryVendors(left, right);
}

export function sortDiscoveryVendors(
  vendors: NearbyVendor[],
  filters: DiscoveryFiltersLike,
): NearbyVendor[] {
  const normalizedSearch = normalizeSearchText(filters.search);

  if (!normalizedSearch) {
    return [...vendors].sort(compareDiscoveryVendors);
  }

  return vendors
    .map((vendor) => ({
      vendor,
      searchScore: getSearchRelevanceScore(normalizedSearch, getDiscoverySearchFields(vendor)),
    }))
    .filter((entry) => entry.searchScore > 0)
    .sort((left, right) =>
      compareSearchRankedDiscoveryVendors(
        left.vendor,
        right.vendor,
        left.searchScore,
        right.searchScore,
      ),
    )
    .map((entry) => entry.vendor);
}

function getDiscoverySearchFields(vendor: DiscoveryRankableVendor): SearchMatchField[] {
  const dishFields = vendor.featured_dish
    ? [
        { kind: "dish" as const, value: vendor.featured_dish.dish_name },
        { kind: "description" as const, value: vendor.featured_dish.description },
      ]
    : [];
  const categoryFields =
    vendor.categories?.flatMap((category) => [
      { kind: "category" as const, value: category.name },
      { kind: "category" as const, value: category.slug },
    ]) ?? [];

  return [
    { kind: "name", value: vendor.name },
    { kind: "slug", value: vendor.slug },
    { kind: "description", value: vendor.short_description },
    { kind: "area", value: vendor.area },
    ...dishFields,
    ...categoryFields,
  ];
}

export function getPopularVendors(vendors: NearbyVendor[]): NearbyVendor[] {
  return [...vendors]
    .filter((vendor) => getPopularityRank(vendor) > 0)
    .sort(
      (left, right) =>
        getPopularityRank(right) - getPopularityRank(left) ||
        getDistanceRank(left) - getDistanceRank(right) ||
        left.name.localeCompare(right.name) ||
        left.vendor_id.localeCompare(right.vendor_id),
    )
    .slice(0, 3);
}

export function getPopularVendorIds(vendors: NearbyVendor[]): Set<string> {
  const rankedVendors = getPopularVendors(vendors);

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

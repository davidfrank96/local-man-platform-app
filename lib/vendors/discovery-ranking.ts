import type { NearbyVendorsResponseData, PriceBand } from "../../types/index.ts";

type NearbyVendor = NearbyVendorsResponseData["vendors"][number];

export type DiscoveryFiltersLike = {
  search: string;
  radiusKm: number;
  openNow: boolean;
  priceBand: PriceBand | "";
  category: string;
};

function scoreMatch(value: string | null | undefined, search: string): number {
  if (!value) {
    return 0;
  }

  const normalizedValue = value.toLowerCase();
  const normalizedSearch = search.toLowerCase();

  if (normalizedValue === normalizedSearch) {
    return 120;
  }

  if (normalizedValue.startsWith(normalizedSearch)) {
    return 90;
  }

  if (normalizedValue.includes(normalizedSearch)) {
    return 60;
  }

  return 0;
}

export function getVendorSearchRelevance(
  vendor: NearbyVendor,
  search: string,
): number {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return 0;
  }

  return Math.max(
    scoreMatch(vendor.name, normalizedSearch),
    scoreMatch(vendor.featured_dish?.dish_name, normalizedSearch) - 10,
    scoreMatch(vendor.area, normalizedSearch) - 20,
    scoreMatch(vendor.short_description, normalizedSearch) - 30,
  );
}

export function sortDiscoveryVendors(
  vendors: NearbyVendor[],
  filters: DiscoveryFiltersLike,
): NearbyVendor[] {
  return [...vendors].sort((left, right) => {
    if (left.is_open_now !== right.is_open_now) {
      return left.is_open_now ? -1 : 1;
    }

    const leftSearchScore = getVendorSearchRelevance(left, filters.search);
    const rightSearchScore = getVendorSearchRelevance(right, filters.search);

    if (leftSearchScore !== rightSearchScore) {
      return rightSearchScore - leftSearchScore;
    }

    if (left.ranking_score !== right.ranking_score) {
      return right.ranking_score - left.ranking_score;
    }

    if (left.distance_km !== right.distance_km) {
      return left.distance_km - right.distance_km;
    }

    return left.name.localeCompare(right.name);
  });
}

export function getPopularVendorIds(vendors: NearbyVendor[]): Set<string> {
  const rankedVendors = [...vendors]
    .filter((vendor) => vendor.ranking_score > 0)
    .sort(
      (left, right) =>
        right.ranking_score - left.ranking_score || left.distance_km - right.distance_km,
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

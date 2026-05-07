import type { AcquiredUserLocation } from "../location/acquisition.ts";
import { sanitizePublicSearchInput } from "../vendors/public-api-client.ts";
import type { PublicDiscoverySnapshot } from "./discovery-cache.ts";
import type { LocationSource, NearbyVendorsResponseData, PriceBand } from "../../types/index.ts";

export type DiscoveryFiltersInput = {
  search: string;
  radiusKm: number;
  openNow: boolean;
  priceBand: PriceBand | "";
  category: string;
};

type DiscoverySnapshot = PublicDiscoverySnapshot<NearbyVendorsResponseData>;

export function parseRadius(value: string | null, fallbackRadiusKm: number): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackRadiusKm;
}

export function parseOpenNow(value: string | null): boolean {
  return value === "1" || value === "true";
}

export function parsePriceBand(value: string | null): PriceBand | "" {
  return value === "budget" || value === "standard" || value === "premium" ? value : "";
}

export function parseLocationSource(value: string | null): LocationSource | null {
  return value === "precise" || value === "approximate" || value === "default_city"
    ? value
    : null;
}

export function parseDiscoveryUrlState(
  searchParams: URLSearchParams,
  initialSearch: string,
  fallbackRadiusKm: number,
): {
  filters: DiscoveryFiltersInput;
  locationSource: LocationSource | null;
} {
  return {
    filters: {
      search: sanitizePublicSearchInput(searchParams.get("q") ?? initialSearch),
      radiusKm: parseRadius(searchParams.get("radius_km"), fallbackRadiusKm),
      openNow: parseOpenNow(searchParams.get("open_now")),
      priceBand: parsePriceBand(searchParams.get("price_band")),
      category: searchParams.get("category")?.trim() || "",
    },
    locationSource: parseLocationSource(searchParams.get("location_source")),
  };
}

export function buildDiscoverySearchParams(
  filters: DiscoveryFiltersInput,
  locationSource: LocationSource | null,
  fallbackRadiusKm: number,
): URLSearchParams {
  const params = new URLSearchParams();
  const normalizedSearch = sanitizePublicSearchInput(filters.search);

  if (normalizedSearch) {
    params.set("q", normalizedSearch);
  }

  if (filters.radiusKm !== fallbackRadiusKm) {
    params.set("radius_km", String(filters.radiusKm));
  }

  if (filters.openNow) {
    params.set("open_now", "1");
  }

  if (filters.priceBand) {
    params.set("price_band", filters.priceBand);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (locationSource === "default_city") {
    params.set("location_source", locationSource);
  }

  return params;
}

export function getDiscoverySnapshotKey(pathname: string, queryString: string): string {
  return `public-discovery:${pathname}${queryString ? `?${queryString}` : ""}`;
}

export function buildVendorDetailHref(
  slug: string,
  returnTo: string,
  locationSource: LocationSource | null,
): string {
  const params = new URLSearchParams();
  params.set("returnTo", returnTo);
  if (locationSource) {
    params.set("location_source", locationSource);
  }

  return `/vendors/${slug}?${params.toString()}`;
}

export function buildDiscoveryReturnTo(
  pathname: string,
  filters: DiscoveryFiltersInput,
  locationSource: LocationSource | null,
  fallbackRadiusKm: number,
): string {
  const queryString = buildDiscoverySearchParams(
    filters,
    locationSource,
    fallbackRadiusKm,
  ).toString();

  return `${pathname}${queryString ? `?${queryString}` : ""}`;
}

export function resolveSnapshotSelectedVendorId(snapshot: DiscoverySnapshot): string | null {
  if (snapshot.selectedVendorId) {
    return snapshot.selectedVendorId;
  }

  if (!snapshot.selectedVendorSlug || !snapshot.nearbyData) {
    return null;
  }

  return (
    snapshot.nearbyData.vendors.find((vendor) => vendor.slug === snapshot.selectedVendorSlug)
      ?.vendor_id ?? null
  );
}

export function shouldRestoreDiscoveryScroll(): boolean {
  const navigationEntry = performance
    .getEntriesByType("navigation")
    .at(0) as PerformanceNavigationTiming | undefined;

  if (navigationEntry?.type === "back_forward") {
    return true;
  }

  return /\/vendors\/[^/]+$/.test(document.referrer);
}

export function createNearbyFilters(
  location: AcquiredUserLocation,
  filters: DiscoveryFiltersInput,
) {
  const shouldSendCoordinates = location.source !== "default_city";

  return {
    ...(shouldSendCoordinates
      ? {
          lat: location.coordinates.lat,
          lng: location.coordinates.lng,
        }
      : {}),
    location_source: location.source,
    radius_km: filters.radiusKm,
    open_now: filters.openNow || undefined,
    price_band: filters.priceBand || undefined,
    category: filters.category || undefined,
    search: sanitizePublicSearchInput(filters.search) || undefined,
  };
}

export function buildNearbyRequestKey(
  location: Pick<AcquiredUserLocation, "source" | "coordinates">,
  filters: DiscoveryFiltersInput,
): string {
  return JSON.stringify({
    source: location.source,
    lat: location.coordinates.lat,
    lng: location.coordinates.lng,
    search: sanitizePublicSearchInput(filters.search),
    radiusKm: filters.radiusKm,
    openNow: filters.openNow,
    priceBand: filters.priceBand,
    category: filters.category,
  });
}

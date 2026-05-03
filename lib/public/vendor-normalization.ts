import { DEFAULT_CITY_LOCATION } from "../location/user-location.ts";
import { calculateDistanceKm, roundDistanceKm } from "../location/distance.ts";
import type { NearbyVendorsResponseData, LocationSource, PriceBand } from "../../types/index.ts";

type NearbyVendor = NearbyVendorsResponseData["vendors"][number];
type NearbyLocation = NearbyVendorsResponseData["location"];

type LocationFallback = {
  source?: LocationSource | null;
  label?: string | null;
  coordinates?: {
    lat?: number | null;
    lng?: number | null;
  } | null;
  isApproximate?: boolean | null;
} | null | undefined;

export type NormalizedVendor = Omit<NearbyVendor, "latitude" | "longitude"> & {
  id: string;
  lat: number | null;
  lng: number | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string;
  distanceKm?: number;
  hasValidCoordinates: boolean;
};

export type NormalizedNearbyVendorsResponseData = Omit<
  NearbyVendorsResponseData,
  "vendors"
> & {
  vendors: NormalizedVendor[];
};

const FALLBACK_VENDOR_IMAGE_URL = "/seed-images/rice.jpg";
const loggedMalformedVendorKeys = new Set<string>();

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeInteger(value: unknown, fallback = 0): number {
  const normalized = normalizeNumber(value);

  if (normalized === null) {
    return fallback;
  }

  return Math.max(0, Math.round(normalized));
}

function clampNumber(value: unknown, minimum: number, maximum: number, fallback: number): number {
  const normalized = normalizeNumber(value);

  if (normalized === null) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, normalized));
}

function isValidLatitude(value: number | null): value is number {
  return value !== null && value >= -90 && value <= 90;
}

function isValidLongitude(value: number | null): value is number {
  return value !== null && value >= -180 && value <= 180;
}

function normalizeLocationSource(value: unknown): LocationSource | null {
  return value === "precise" || value === "approximate" || value === "default_city"
    ? value
    : null;
}

function normalizePriceBand(value: unknown): PriceBand | null {
  return value === "budget" || value === "standard" || value === "premium" ? value : null;
}

function createSlug(value: string, fallbackId: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : fallbackId.toLowerCase();
}

function hashVendorIdentity(name: string, latitude: number, longitude: number): string {
  const source = `${name.toLowerCase()}|${latitude.toFixed(5)}|${longitude.toFixed(5)}`;
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }

  return `vendor-${Math.abs(hash).toString(36)}`;
}

function hashVendorFallbackIdentity(parts: Array<string | null | undefined>): string {
  const source = parts
    .map((part) => normalizeString(part) ?? "")
    .join("|")
    .toLowerCase();
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }

  return `vendor-${Math.abs(hash).toString(36)}`;
}

function resolveStableVendorKey(
  value: Record<string, unknown>,
  name: string,
  latitude: number | null,
  longitude: number | null,
  index: number,
): string {
  const rawId = normalizeString(value.id) ?? normalizeString(value.vendor_id);

  if (rawId) {
    return rawId;
  }

  const rawSlug = normalizeString(value.slug);

  if (rawSlug) {
    return rawSlug.toLowerCase();
  }

  if (isValidLatitude(latitude) && isValidLongitude(longitude)) {
    return hashVendorIdentity(name, latitude, longitude);
  }

  return hashVendorFallbackIdentity([
    name,
    normalizeString(value.area),
    String(index),
  ]);
}

function logMalformedVendorOnce(reason: string, key: string, payload: unknown): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const logKey = `${reason}:${key}`;

  if (loggedMalformedVendorKeys.has(logKey)) {
    return;
  }

  loggedMalformedVendorKeys.add(logKey);
  console.warn("[public-discovery] Ignoring malformed vendor record.", {
    reason,
    key,
    payload,
  });
}

function createFallbackLocation(fallback?: LocationFallback): NearbyLocation {
  const fallbackLat = normalizeNumber(fallback?.coordinates?.lat);
  const fallbackLng = normalizeNumber(fallback?.coordinates?.lng);
  const fallbackSource = normalizeLocationSource(fallback?.source);
  const fallbackLabel = normalizeString(fallback?.label);

  return {
    source: fallbackSource ?? "default_city",
    label: fallbackLabel ?? DEFAULT_CITY_LOCATION.label,
    coordinates: {
      lat: isValidLatitude(fallbackLat) ? fallbackLat : DEFAULT_CITY_LOCATION.coordinates.lat,
      lng: isValidLongitude(fallbackLng) ? fallbackLng : DEFAULT_CITY_LOCATION.coordinates.lng,
    },
    isApproximate:
      typeof fallback?.isApproximate === "boolean"
        ? fallback.isApproximate
        : (fallbackSource ?? "default_city") !== "precise",
  };
}

function normalizeLocation(
  value: unknown,
  fallback?: LocationFallback,
): NearbyLocation {
  if (!isObject(value)) {
    return createFallbackLocation(fallback);
  }

  const fallbackLocation = createFallbackLocation(fallback);
  const rawCoordinates = isObject(value.coordinates) ? value.coordinates : null;
  const latitude = normalizeNumber(rawCoordinates?.lat);
  const longitude = normalizeNumber(rawCoordinates?.lng);

  return {
    source: normalizeLocationSource(value.source) ?? fallbackLocation.source,
    label: normalizeString(value.label) ?? fallbackLocation.label,
    coordinates: {
      lat: isValidLatitude(latitude) ? latitude : fallbackLocation.coordinates.lat,
      lng: isValidLongitude(longitude) ? longitude : fallbackLocation.coordinates.lng,
    },
    isApproximate:
      typeof value.isApproximate === "boolean"
        ? value.isApproximate
        : fallbackLocation.isApproximate,
  };
}

export function normalizeVendor(value: unknown, index: number): NormalizedVendor | null {
  if (!isObject(value)) {
    logMalformedVendorOnce("invalid_shape", `vendor-${index}`, value);
    return null;
  }

  const name = normalizeString(value.name) ?? "Unknown Vendor";
  const latitude = normalizeNumber(value.latitude ?? value.lat);
  const longitude = normalizeNumber(value.longitude ?? value.lng);
  const hasValidCoordinates = isValidLatitude(latitude) && isValidLongitude(longitude);

  if (!hasValidCoordinates) {
    const invalidVendorKey =
      normalizeString(value.id) ??
      normalizeString(value.vendor_id) ??
      `vendor-${index + 1}`;
    logMalformedVendorOnce("invalid_coordinates", invalidVendorKey, value);
  }

  const vendorId = resolveStableVendorKey(value, name, latitude, longitude, index);
  const slug = normalizeString(value.slug) ?? createSlug(name, vendorId);

  const shortDescription =
    normalizeString(value.short_description) ?? normalizeString(value.description);
  const phoneNumber =
    normalizeString(value.phone_number) ?? normalizeString(value.phone);
  const area = normalizeString(value.area);
  const featuredDish = isObject(value.featured_dish)
    ? {
        dish_name: normalizeString(value.featured_dish.dish_name) ?? "Featured dish",
        description: normalizeString(value.featured_dish.description),
      }
    : null;
  const distanceKm = normalizeNumber(value.distance_km ?? value.distanceKm);

  if (name === "Unknown Vendor") {
    logMalformedVendorOnce("missing_name", vendorId, value);
  }

  return {
    vendor_id: vendorId,
    id: vendorId,
    name,
    slug,
    short_description: shortDescription,
    phone_number: phoneNumber,
    area,
    latitude: hasValidCoordinates ? latitude : null,
    longitude: hasValidCoordinates ? longitude : null,
    lat: hasValidCoordinates ? latitude : null,
    lng: hasValidCoordinates ? longitude : null,
    price_band: normalizePriceBand(value.price_band),
    average_rating: clampNumber(value.average_rating, 0, 5, 0),
    review_count: normalizeInteger(value.review_count, 0),
    ranking_score: normalizeInteger(value.ranking_score, 0),
    distance_km: distanceKm !== null && distanceKm >= 0 ? distanceKm : 0,
    distanceKm: distanceKm !== null && distanceKm >= 0 ? distanceKm : undefined,
    is_open_now: typeof value.is_open_now === "boolean" ? value.is_open_now : false,
    featured_dish: featuredDish,
    today_hours: normalizeString(value.today_hours) ?? "Hours unavailable",
    imageUrl: FALLBACK_VENDOR_IMAGE_URL,
    hasValidCoordinates,
  };
}

export function hasValidVendorCoordinates(
  vendor: NormalizedVendor,
): vendor is NormalizedVendor & {
  hasValidCoordinates: true;
  lat: number;
  lng: number;
  latitude: number;
  longitude: number;
} {
  return vendor.hasValidCoordinates;
}

export function normalizeNearbyDiscoveryData(
  value: unknown,
  fallbackLocation?: LocationFallback,
): NormalizedNearbyVendorsResponseData {
  const location = isObject(value)
    ? normalizeLocation(value.location, fallbackLocation)
    : createFallbackLocation(fallbackLocation);

  if (!isObject(value)) {
    return {
      location,
      vendors: [],
    };
  }

  const rawVendors = Array.isArray(value.vendors) ? value.vendors : [];

  const uniqueVendors = new Map<string, NormalizedVendor>();

  for (const [index, vendor] of rawVendors.entries()) {
    const normalized = normalizeVendor(vendor, index);

    if (!normalized) {
      continue;
    }

    const resolvedDistanceKm =
      normalized.distanceKm ??
      (hasValidVendorCoordinates(normalized)
        ? roundDistanceKm(
            calculateDistanceKm(location.coordinates, {
              lat: normalized.latitude,
              lng: normalized.longitude,
            }),
          )
        : 0);

    const dedupedVendor: NormalizedVendor = {
      ...normalized,
      distance_km: resolvedDistanceKm,
      distanceKm: resolvedDistanceKm,
    };
    const dedupeKey = dedupedVendor.id;

    if (uniqueVendors.has(dedupeKey)) {
      logMalformedVendorOnce("duplicate_vendor", dedupeKey, vendor);
      continue;
    }

    uniqueVendors.set(dedupeKey, dedupedVendor);
  }

  return {
    location,
    vendors: Array.from(uniqueVendors.values()),
  };
}

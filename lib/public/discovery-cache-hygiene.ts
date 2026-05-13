export const PUBLIC_DISCOVERY_CACHE_VERSION = 2;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_TEST_VENDOR_ID_PATTERNS = [
  /^00000000-0000-0000-0000-/i,
  /^30000000-0000-4000-8000-/i,
  /^39999999-0000-4000-8000-/i,
  /^40000000-0000-4000-8000-/i,
] as const;
const KNOWN_TEST_VENDOR_SLUGS = new Set([
  "closed-sunday-lunch-bowl",
  "opens-later-rice-corner",
  "open-evening-grill",
  "qa-admin-vendor-playwright-stale",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLatitude(value: unknown): boolean {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: unknown): boolean {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

export function getPublicDiscoveryCacheEnvironmentKey(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  return window.location.origin;
}

export function addPublicDiscoveryCacheEnvelope<T extends Record<string, unknown>>(value: T): T & {
  cacheVersion: number;
  cacheEnvironment: string;
} {
  return {
    ...value,
    cacheVersion: PUBLIC_DISCOVERY_CACHE_VERSION,
    cacheEnvironment: getPublicDiscoveryCacheEnvironmentKey(),
  };
}

export function isCurrentPublicDiscoveryCacheEnvelope(value: unknown): boolean {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.cacheVersion === PUBLIC_DISCOVERY_CACHE_VERSION &&
    value.cacheEnvironment === getPublicDiscoveryCacheEnvironmentKey()
  );
}

export function isKnownMockVendorIdentity(vendorId: unknown, slug: unknown): boolean {
  return (
    (isNonEmptyString(vendorId) &&
      RESERVED_TEST_VENDOR_ID_PATTERNS.some((pattern) => pattern.test(vendorId))) ||
    (isNonEmptyString(slug) && KNOWN_TEST_VENDOR_SLUGS.has(slug))
  );
}

export function getUnsafeRetainedVendorCacheReason(value: unknown): string | null {
  if (!isObject(value)) {
    return "invalid_retained_vendor_shape";
  }

  if (!isNonEmptyString(value.vendor_id) || !UUID_PATTERN.test(value.vendor_id)) {
    return "malformed_vendor_id";
  }

  if (!isNonEmptyString(value.slug) || !SLUG_PATTERN.test(value.slug)) {
    return "malformed_vendor_slug";
  }

  if (isKnownMockVendorIdentity(value.vendor_id, value.slug)) {
    return "test_vendor_identity";
  }

  if (
    !isNonEmptyString(value.name) ||
    !(typeof value.area === "string" || value.area === null) ||
    !isNonEmptyString(value.today_hours) ||
    typeof value.is_open_now !== "boolean" ||
    !isNonEmptyString(value.timestamp)
  ) {
    return "incomplete_retained_vendor";
  }

  return null;
}

export function getUnsafeDiscoveryVendorCacheReason(value: unknown): string | null {
  if (!isObject(value)) {
    return "invalid_vendor_shape";
  }

  if (!isNonEmptyString(value.vendor_id) || !UUID_PATTERN.test(value.vendor_id)) {
    return "malformed_vendor_id";
  }

  if (!isNonEmptyString(value.slug) || !SLUG_PATTERN.test(value.slug)) {
    return "malformed_vendor_slug";
  }

  if (isKnownMockVendorIdentity(value.vendor_id, value.slug)) {
    return "test_vendor_identity";
  }

  if (
    !isNonEmptyString(value.name) ||
    !isValidLatitude(value.latitude) ||
    !isValidLongitude(value.longitude) ||
    !isFiniteNumber(value.distance_km) ||
    value.distance_km < 0 ||
    typeof value.is_open_now !== "boolean" ||
    !isNonEmptyString(value.today_hours)
  ) {
    return "incomplete_vendor_record";
  }

  return null;
}

export function getUnsafeNearbyDiscoveryCacheReason(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!isObject(value)) {
    return "invalid_nearby_data";
  }

  if (!Array.isArray(value.vendors)) {
    return "invalid_vendor_list";
  }

  for (const vendor of value.vendors) {
    const reason = getUnsafeDiscoveryVendorCacheReason(vendor);

    if (reason) {
      return reason;
    }
  }

  return null;
}

import type { NearbyVendorsResponseData } from "../../types/index.ts";

type NearbyVendor = NearbyVendorsResponseData["vendors"][number];
type VendorRetentionSource = Pick<
  RetainedVendorPreview,
  "vendor_id" | "slug" | "name" | "area" | "today_hours" | "is_open_now"
>;

export type RetainedVendorPreview = {
  vendor_id: string;
  slug: string;
  name: string;
  area: string | null;
  today_hours: string;
  is_open_now: boolean;
  timestamp: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem"> | null;

const RECENTLY_VIEWED_KEY = "public-recently-viewed-vendors";
const LAST_SELECTED_KEY = "public-last-selected-vendor";
const MAX_RECENTLY_VIEWED = 5;

function getStorage(storageImpl?: StorageLike): StorageLike {
  if (storageImpl !== undefined) {
    return storageImpl;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRetainedVendorPreview(value: unknown): value is RetainedVendorPreview {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RetainedVendorPreview).vendor_id === "string" &&
    typeof (value as RetainedVendorPreview).slug === "string" &&
    typeof (value as RetainedVendorPreview).name === "string" &&
    (typeof (value as RetainedVendorPreview).area === "string" ||
      (value as RetainedVendorPreview).area === null) &&
    typeof (value as RetainedVendorPreview).today_hours === "string" &&
    typeof (value as RetainedVendorPreview).is_open_now === "boolean" &&
    typeof (value as RetainedVendorPreview).timestamp === "string"
  );
}

function readStoredArray(key: string, storageImpl?: StorageLike): RetainedVendorPreview[] {
  const storage = getStorage(storageImpl);
  const raw = storage?.getItem(key);

  if (!raw) {
    return [];
  }

  try {
    const value = JSON.parse(raw);

    return Array.isArray(value) ? value.filter(isRetainedVendorPreview) : [];
  } catch {
    return [];
  }
}

function writeStoredValue(
  key: string,
  value: RetainedVendorPreview | RetainedVendorPreview[],
  storageImpl?: StorageLike,
): void {
  const storage = getStorage(storageImpl);

  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore retention storage failures.
  }
}

export function createRetainedVendorPreview(
  vendor: NearbyVendor | VendorRetentionSource,
): RetainedVendorPreview {
  return {
    vendor_id: vendor.vendor_id,
    slug: vendor.slug,
    name: vendor.name,
    area: vendor.area,
    today_hours: vendor.today_hours,
    is_open_now: vendor.is_open_now,
    timestamp: new Date().toISOString(),
  };
}

export function readRecentlyViewedVendors(storageImpl?: StorageLike): RetainedVendorPreview[] {
  return readStoredArray(RECENTLY_VIEWED_KEY, storageImpl);
}

export function rememberRecentlyViewedVendor(
  vendor: RetainedVendorPreview,
  storageImpl?: StorageLike,
): RetainedVendorPreview[] {
  const nextVendors = [
    vendor,
    ...readRecentlyViewedVendors(storageImpl).filter(
      (entry) => entry.vendor_id !== vendor.vendor_id,
    ),
  ].slice(0, MAX_RECENTLY_VIEWED);

  writeStoredValue(RECENTLY_VIEWED_KEY, nextVendors, storageImpl);

  return nextVendors;
}

export function readLastSelectedVendor(storageImpl?: StorageLike): RetainedVendorPreview | null {
  const storage = getStorage(storageImpl);
  const raw = storage?.getItem(LAST_SELECTED_KEY);

  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw);

    return isRetainedVendorPreview(value) ? value : null;
  } catch {
    return null;
  }
}

export function rememberLastSelectedVendor(
  vendor: RetainedVendorPreview,
  storageImpl?: StorageLike,
): RetainedVendorPreview {
  writeStoredValue(LAST_SELECTED_KEY, vendor, storageImpl);
  return vendor;
}

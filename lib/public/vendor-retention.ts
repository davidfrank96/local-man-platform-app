import type { NearbyVendorsResponseData } from "../../types/index.ts";
import { getUnsafeRetainedVendorCacheReason } from "./discovery-cache-hygiene.ts";

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
    typeof (value as RetainedVendorPreview).timestamp === "string" &&
    getUnsafeRetainedVendorCacheReason(value) === null
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

    if (!Array.isArray(value)) {
      return [];
    }

    const retainedVendors = value.filter(isRetainedVendorPreview);

    if (retainedVendors.length !== value.length) {
      writeStoredValue(key, retainedVendors, storageImpl);
    }

    return retainedVendors;
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
  const safeValue = Array.isArray(value)
    ? value.filter(isRetainedVendorPreview)
    : isRetainedVendorPreview(value)
      ? value
      : [];

  try {
    storage?.setItem(key, JSON.stringify(safeValue));
  } catch {
    // Ignore retention storage failures.
  }
}

function clearStoredValue(key: string, storageImpl?: StorageLike): void {
  const storage = getStorage(storageImpl);

  try {
    storage?.setItem(key, JSON.stringify([]));
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

export function mergeRetainedVendorPreviewWithLiveVendor(
  retainedVendor: RetainedVendorPreview,
  liveVendor: NearbyVendor | VendorRetentionSource,
): RetainedVendorPreview {
  return {
    ...retainedVendor,
    vendor_id: liveVendor.vendor_id,
    slug: liveVendor.slug,
    name: liveVendor.name,
    area: liveVendor.area,
    today_hours: liveVendor.today_hours,
    is_open_now: liveVendor.is_open_now,
  };
}

export function readRecentlyViewedVendors(storageImpl?: StorageLike): RetainedVendorPreview[] {
  return readStoredArray(RECENTLY_VIEWED_KEY, storageImpl);
}

export function rememberRecentlyViewedVendor(
  vendor: RetainedVendorPreview,
  storageImpl?: StorageLike,
): RetainedVendorPreview[] {
  if (!isRetainedVendorPreview(vendor)) {
    return readRecentlyViewedVendors(storageImpl);
  }

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

    if (isRetainedVendorPreview(value)) {
      return value;
    }

    clearStoredValue(LAST_SELECTED_KEY, storageImpl);
    return null;
  } catch {
    return null;
  }
}

export function rememberLastSelectedVendor(
  vendor: RetainedVendorPreview,
  storageImpl?: StorageLike,
): RetainedVendorPreview {
  if (isRetainedVendorPreview(vendor)) {
    writeStoredValue(LAST_SELECTED_KEY, vendor, storageImpl);
  }

  return vendor;
}

export function removeRetainedVendorPreview(
  vendorId: string,
  storageImpl?: StorageLike,
): {
  recentlyViewed: RetainedVendorPreview[];
  lastSelected: RetainedVendorPreview | null;
} {
  const nextRecentlyViewed = readRecentlyViewedVendors(storageImpl).filter(
    (entry) => entry.vendor_id !== vendorId,
  );
  const currentLastSelected = readLastSelectedVendor(storageImpl);
  const nextLastSelected =
    currentLastSelected?.vendor_id === vendorId ? null : currentLastSelected;

  writeStoredValue(RECENTLY_VIEWED_KEY, nextRecentlyViewed, storageImpl);

  if (nextLastSelected) {
    writeStoredValue(LAST_SELECTED_KEY, nextLastSelected, storageImpl);
  } else {
    clearStoredValue(LAST_SELECTED_KEY, storageImpl);
  }

  return {
    recentlyViewed: nextRecentlyViewed,
    lastSelected: nextLastSelected,
  };
}

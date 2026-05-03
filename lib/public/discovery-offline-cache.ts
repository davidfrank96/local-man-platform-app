import {
  normalizeNearbyDiscoveryData,
  type NormalizedNearbyVendorsResponseData,
} from "./vendor-normalization.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem"> | null;

const OFFLINE_CACHE_PREFIX = "public-discovery-offline";

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

export function getDiscoveryOfflineCacheKey(snapshotKey: string): string {
  return `${OFFLINE_CACHE_PREFIX}:${snapshotKey}`;
}

export function readCachedNearbyDiscoveryData(
  cacheKey: string,
  storageImpl?: StorageLike,
): NormalizedNearbyVendorsResponseData | null {
  const storage = getStorage(storageImpl);
  const raw = storage?.getItem(cacheKey);

  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as { nearbyData?: unknown };
    const normalized = normalizeNearbyDiscoveryData(value?.nearbyData ?? value);

    return normalized.vendors.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

export function writeCachedNearbyDiscoveryData(
  cacheKey: string,
  nearbyData: NormalizedNearbyVendorsResponseData | null,
  storageImpl?: StorageLike,
): void {
  const storage = getStorage(storageImpl);

  if (!storage || !nearbyData || nearbyData.vendors.length === 0) {
    return;
  }

  try {
    storage.setItem(
      cacheKey,
      JSON.stringify({
        nearbyData,
        cachedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Ignore localStorage failures.
  }
}

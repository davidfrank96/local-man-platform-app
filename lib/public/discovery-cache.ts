import {
  removeRetainedVendorPreview,
} from "./vendor-retention.ts";
import {
  isDestructiveVendorInvalidationReason,
} from "../testing/playwright-artifacts.ts";

const DISCOVERY_SNAPSHOT_PREFIX = "public-discovery:";
const DISCOVERY_OFFLINE_CACHE_PREFIX = "public-discovery-offline:public-discovery:";
const PUBLIC_DISCOVERY_INVALIDATION_STORAGE_KEY = "public-discovery:vendors:invalidation";
export const PUBLIC_DISCOVERY_SNAPSHOT_TTL_MS = 5 * 60_000;

export const PUBLIC_DISCOVERY_INVALIDATION_EVENT =
  "public-discovery:vendors:invalidate";

type StorageLike = Pick<
  Storage,
  "getItem" | "length" | "key" | "removeItem" | "setItem"
> | null;

export type PublicDiscoverySnapshot<T = unknown> = {
  nearbyData: T | null;
  nearbyDataUpdatedAt?: string | null;
  selectedVendorId: string | null;
  selectedVendorSlug?: string | null;
  scrollY: number;
};

export type PublicDiscoveryInvalidationPayload = {
  reason: string;
  vendorId: string | null;
  timestamp: string;
};

function getSessionStorage(storageImpl?: StorageLike): StorageLike {
  if (storageImpl !== undefined) {
    return storageImpl;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readPublicDiscoverySnapshot<T = unknown>(
  key: string,
  options?: {
    sessionStorage?: StorageLike;
  },
): PublicDiscoverySnapshot<T> | null {
  const sessionStorage = getSessionStorage(options?.sessionStorage);

  try {
    const raw = sessionStorage?.getItem(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as PublicDiscoverySnapshot<T>;
  } catch {
    return null;
  }
}

export function writePublicDiscoverySnapshot<T = unknown>(
  key: string,
  snapshot: PublicDiscoverySnapshot<T>,
  options?: {
    sessionStorage?: StorageLike;
  },
): void {
  const sessionStorage = getSessionStorage(options?.sessionStorage);

  try {
    sessionStorage?.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Ignore session storage failures.
  }
}

export function isPublicDiscoverySnapshotFresh(
  snapshot: Pick<PublicDiscoverySnapshot, "nearbyData" | "nearbyDataUpdatedAt"> | null | undefined,
  options?: {
    localStorage?: StorageLike;
    nowMs?: number;
    ttlMs?: number;
  },
): boolean {
  if (!snapshot?.nearbyData) {
    return false;
  }

  if (typeof snapshot.nearbyDataUpdatedAt !== "string") {
    return false;
  }

  const nearbyDataUpdatedAtMs = Date.parse(snapshot.nearbyDataUpdatedAt);

  if (!Number.isFinite(nearbyDataUpdatedAtMs)) {
    return false;
  }

  const ttlMs = options?.ttlMs ?? PUBLIC_DISCOVERY_SNAPSHOT_TTL_MS;
  const nowMs = options?.nowMs ?? Date.now();

  if (nowMs - nearbyDataUpdatedAtMs > ttlMs) {
    return false;
  }

  const invalidationPayload = readStoredInvalidationPayload(options?.localStorage);
  const invalidationTimestampMs = invalidationPayload?.timestamp
    ? Date.parse(invalidationPayload.timestamp)
    : Number.NaN;

  if (Number.isFinite(invalidationTimestampMs) && invalidationTimestampMs > nearbyDataUpdatedAtMs) {
    return false;
  }

  return true;
}

export function shouldSkipPublicDiscoveryFetch(options: {
  existingRequestKey: string | null;
  nextRequestKey: string;
  restoredNearbyDataRequestKey: string | null;
  requiresAuthoritativeFetch: boolean;
}): boolean {
  if (options.existingRequestKey === options.nextRequestKey) {
    return true;
  }

  if (options.requiresAuthoritativeFetch) {
    return false;
  }

  return (
    !options.existingRequestKey &&
    options.restoredNearbyDataRequestKey === options.nextRequestKey
  );
}

function getLocalStorage(storageImpl?: StorageLike): StorageLike {
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

function clearMatchingKeys(storage: StorageLike, prefix: string): void {
  if (!storage) {
    return;
  }

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);

    if (key?.startsWith(prefix)) {
      storage.removeItem(key);
    }
  }
}

function normalizeInvalidationPayload(
  value: unknown,
): PublicDiscoveryInvalidationPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;

  return {
    reason:
      typeof payload.reason === "string" && payload.reason.trim().length > 0
        ? payload.reason.trim()
        : "vendor_mutation",
    vendorId:
      typeof payload.vendorId === "string" && payload.vendorId.trim().length > 0
        ? payload.vendorId.trim()
        : null,
    timestamp:
      typeof payload.timestamp === "string" && payload.timestamp.trim().length > 0
        ? payload.timestamp
        : new Date().toISOString(),
  };
}

function readStoredInvalidationPayload(
  storageImpl?: StorageLike,
): PublicDiscoveryInvalidationPayload | null {
  const localStorage = getLocalStorage(storageImpl);
  const raw = localStorage?.getItem(PUBLIC_DISCOVERY_INVALIDATION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return normalizeInvalidationPayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function applyStoredPublicDiscoveryInvalidationToRetention(options?: {
  localStorage?: StorageLike;
}): void {
  const invalidationPayload = readStoredInvalidationPayload(options?.localStorage);

  if (
    !invalidationPayload?.vendorId
    || !isDestructiveVendorInvalidationReason(invalidationPayload.reason)
  ) {
    return;
  }

  removeRetainedVendorPreview(
    invalidationPayload.vendorId,
    options?.localStorage,
  );
}

export function clearPublicDiscoveryVendorCache(options?: {
  sessionStorage?: StorageLike;
  localStorage?: StorageLike;
}): void {
  clearMatchingKeys(
    getSessionStorage(options?.sessionStorage),
    DISCOVERY_SNAPSHOT_PREFIX,
  );
  clearMatchingKeys(
    getLocalStorage(options?.localStorage),
    DISCOVERY_OFFLINE_CACHE_PREFIX,
  );
}

export function invalidatePublicDiscoveryVendorCache(
  details?: {
    reason?: string;
    vendorId?: string | null;
  },
  options?: {
    sessionStorage?: StorageLike;
    localStorage?: StorageLike;
  },
): void {
  const sessionStorage = getSessionStorage(options?.sessionStorage);
  const localStorage = getLocalStorage(options?.localStorage);

  clearPublicDiscoveryVendorCache({
    sessionStorage,
    localStorage,
  });

  const payload: PublicDiscoveryInvalidationPayload = {
    reason:
      typeof details?.reason === "string" && details.reason.trim().length > 0
        ? details.reason.trim()
        : "vendor_mutation",
    vendorId:
      typeof details?.vendorId === "string" && details.vendorId.trim().length > 0
        ? details.vendorId.trim()
        : null,
    timestamp: new Date().toISOString(),
  };

  try {
    localStorage?.setItem(
      PUBLIC_DISCOVERY_INVALIDATION_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // Ignore localStorage failures.
  }

  if (
    payload.vendorId
    && isDestructiveVendorInvalidationReason(payload.reason)
  ) {
    removeRetainedVendorPreview(payload.vendorId, localStorage);
  }

  if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PUBLIC_DISCOVERY_INVALIDATION_EVENT, {
        detail: payload,
      }),
    );
  }
}

export function subscribeToPublicDiscoveryVendorInvalidation(
  listener: (payload: PublicDiscoveryInvalidationPayload) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key !== PUBLIC_DISCOVERY_INVALIDATION_STORAGE_KEY ||
      !event.newValue
    ) {
      return;
    }

    try {
      const payload = normalizeInvalidationPayload(JSON.parse(event.newValue));

      if (payload) {
        listener(payload);
      }
    } catch {
      // Ignore malformed storage payloads.
    }
  };

  const handleCustomEvent = (event: Event) => {
    const payload = normalizeInvalidationPayload(
      (event as CustomEvent<unknown>).detail,
    );

    if (payload) {
      listener(payload);
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(
    PUBLIC_DISCOVERY_INVALIDATION_EVENT,
    handleCustomEvent as EventListener,
  );

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(
      PUBLIC_DISCOVERY_INVALIDATION_EVENT,
      handleCustomEvent as EventListener,
    );
  };
}

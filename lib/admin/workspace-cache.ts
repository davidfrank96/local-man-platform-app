import type {
  AdminAnalyticsRange,
  AdminAnalyticsResponseData,
  AdminUser,
  AuditActionType,
  AdminRole,
  VendorFeaturedDish,
  VendorHours,
  VendorImage,
} from "../../types/index.ts";
import type {
  AdminAuditLogListResult,
  AdminVendorFilters,
  AdminVendorSummary,
} from "./api-client.ts";

type VendorArtifactsCache = {
  hoursByVendorId: Record<string, VendorHours[]>;
  imagesByVendorId: Record<string, VendorImage[]>;
  dishesByVendorId: Record<string, VendorFeaturedDish[]>;
};

type VendorWorkspaceCache = {
  filters: AdminVendorFilters;
  selectedVendorId: string | null;
  vendors: AdminVendorSummary[];
} & VendorArtifactsCache;

const defaultVendorFilters: AdminVendorFilters = {
  limit: 100,
  offset: 0,
};

const vendorWorkspaceCache = new Map<string, VendorWorkspaceCache>();

function getOrCreateVendorWorkspaceCache(scope: string): VendorWorkspaceCache {
  const existing = vendorWorkspaceCache.get(scope);

  if (existing) {
    return existing;
  }

  const next: VendorWorkspaceCache = {
    filters: defaultVendorFilters,
    selectedVendorId: null,
    vendors: [],
    hoursByVendorId: {},
    imagesByVendorId: {},
    dishesByVendorId: {},
  };

  vendorWorkspaceCache.set(scope, next);
  return next;
}

export function getVendorWorkspaceSnapshot(scope: string): VendorWorkspaceCache {
  return getOrCreateVendorWorkspaceCache(scope);
}

export function updateVendorWorkspaceSnapshot(
  scope: string,
  next: Partial<Omit<VendorWorkspaceCache, keyof VendorArtifactsCache>>,
): VendorWorkspaceCache {
  const current = getOrCreateVendorWorkspaceCache(scope);
  const updated: VendorWorkspaceCache = {
    ...current,
    ...next,
  };

  vendorWorkspaceCache.set(scope, updated);
  return updated;
}

export function updateVendorArtifactCache(
  scope: string,
  vendorId: string,
  artifact: "hours" | "images" | "dishes",
  rows: VendorHours[] | VendorImage[] | VendorFeaturedDish[],
): VendorWorkspaceCache {
  const current = getOrCreateVendorWorkspaceCache(scope);
  const updated: VendorWorkspaceCache = {
    ...current,
    hoursByVendorId: artifact === "hours"
      ? { ...current.hoursByVendorId, [vendorId]: rows as VendorHours[] }
      : current.hoursByVendorId,
    imagesByVendorId: artifact === "images"
      ? { ...current.imagesByVendorId, [vendorId]: rows as VendorImage[] }
      : current.imagesByVendorId,
    dishesByVendorId: artifact === "dishes"
      ? { ...current.dishesByVendorId, [vendorId]: rows as VendorFeaturedDish[] }
      : current.dishesByVendorId,
  };

  vendorWorkspaceCache.set(scope, updated);
  return updated;
}

export function readVendorArtifactCache(
  scope: string,
  vendorId: string,
  artifact: "hours" | "images" | "dishes",
): VendorHours[] | VendorImage[] | VendorFeaturedDish[] | null {
  const snapshot = getOrCreateVendorWorkspaceCache(scope);

  if (artifact === "hours") {
    return snapshot.hoursByVendorId[vendorId] ?? null;
  }

  if (artifact === "images") {
    return snapshot.imagesByVendorId[vendorId] ?? null;
  }

  return snapshot.dishesByVendorId[vendorId] ?? null;
}

type AdminAnalyticsCache = {
  analyticsByRange: Partial<Record<AdminAnalyticsRange, AdminAnalyticsResponseData>>;
  auditLogsByFilterKey: Record<string, AdminAuditLogListResult>;
};

const adminAnalyticsCache: AdminAnalyticsCache = {
  analyticsByRange: {},
  auditLogsByFilterKey: {},
};

export function readAnalyticsCache(range: AdminAnalyticsRange): AdminAnalyticsResponseData | null {
  return adminAnalyticsCache.analyticsByRange[range] ?? null;
}

export function writeAnalyticsCache(
  range: AdminAnalyticsRange,
  data: AdminAnalyticsResponseData,
): void {
  adminAnalyticsCache.analyticsByRange[range] = data;
}

export function createAuditLogCacheKey(filters: {
  userRole: "all" | AdminRole;
  action: "all" | AuditActionType;
  offset?: number;
  limit?: number;
}): string {
  return [
    filters.userRole,
    filters.action,
    String(filters.offset ?? 0),
    String(filters.limit ?? 10),
  ].join(":");
}

export function readAuditLogCache(cacheKey: string): AdminAuditLogListResult | null {
  return adminAnalyticsCache.auditLogsByFilterKey[cacheKey] ?? null;
}

export function writeAuditLogCache(
  cacheKey: string,
  data: AdminAuditLogListResult,
): void {
  adminAnalyticsCache.auditLogsByFilterKey[cacheKey] = data;
}

let adminUsersCache: AdminUser[] | null = null;

export function readAdminUsersCache(): AdminUser[] | null {
  return adminUsersCache;
}

export function writeAdminUsersCache(rows: AdminUser[]): void {
  adminUsersCache = rows;
}

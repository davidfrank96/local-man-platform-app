import type { NearbyVendorsResponseData } from "../../types/index.ts";

type NearbyPagination = NearbyVendorsResponseData["pagination"];

export type DiscoveryResultSummary = {
  primary: string;
  secondary: string | null;
};

function pluralizeVendor(count: number): string {
  return count === 1 ? "vendor" : "vendors";
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function normalizePageSize(pagination: NearbyPagination): number {
  return Math.max(1, Math.min(50, normalizeCount(pagination.page_size) || 25));
}

export function getDiscoveryResultSummary(options: {
  hasSearch: boolean;
  isLoading: boolean;
  pagination: NearbyPagination;
  visibleCount: number;
}): DiscoveryResultSummary {
  const total = normalizeCount(options.pagination.total);
  const visibleCount = normalizeCount(options.visibleCount);
  const pageSize = normalizePageSize(options.pagination);

  if (options.isLoading && total === 0) {
    return {
      primary: "Finding vendors nearby",
      secondary: null,
    };
  }

  if (options.hasSearch) {
    return {
      primary: `${total} matching ${pluralizeVendor(total)} found`,
      secondary:
        total > visibleCount
          ? visibleCount <= pageSize
            ? `Showing the ${visibleCount} closest matches`
            : `Showing ${visibleCount} of ${total}`
          : null,
    };
  }

  return {
    primary: `${total} ${pluralizeVendor(total)} found nearby`,
    secondary:
      total > visibleCount
        ? visibleCount <= pageSize
          ? `Showing the ${visibleCount} closest vendors`
          : `Showing ${visibleCount} of ${total}`
        : null,
  };
}

export function getLoadedVendorCountLabel(options: {
  total: number;
  visibleCount: number;
}): string {
  const total = normalizeCount(options.total);
  const visibleCount = normalizeCount(options.visibleCount);

  return `Showing ${visibleCount} of ${total}`;
}

export function mergeNearbyDiscoveryPage(
  current: NearbyVendorsResponseData | null,
  next: NearbyVendorsResponseData,
): NearbyVendorsResponseData {
  if (!current) {
    return next;
  }

  const existingVendorIds = new Set(
    current.vendors.map((vendor) => vendor.vendor_id),
  );
  const appendedVendors = next.vendors.filter(
    (vendor) => !existingVendorIds.has(vendor.vendor_id),
  );

  return {
    ...next,
    map_vendors:
      next.map_vendors.length > 0
        ? next.map_vendors
        : current.map_vendors.length > 0
          ? current.map_vendors
          : current.vendors,
    vendors: [...current.vendors, ...appendedVendors],
    pagination: next.pagination,
  };
}

export function resetNearbyCardsToFirstPage(
  data: NearbyVendorsResponseData,
): NearbyVendorsResponseData {
  const pageSize = normalizePageSize(data.pagination);
  const total = normalizeCount(data.pagination.total);

  if (data.pagination.page === 1 && data.vendors.length <= pageSize) {
    return data;
  }

  return {
    ...data,
    vendors: data.vendors.slice(0, pageSize),
    pagination: {
      ...data.pagination,
      page: 1,
      page_size: pageSize,
      total,
      has_more: pageSize < total,
    },
  };
}

import {
  getNearbyBoundingBox,
  getVendorAvailabilitySnapshot,
  type VendorLocationRecord,
} from "./nearby.ts";
import type { ResolvedNearbyVendorsQuery } from "../location/user-location.ts";
import {
  vendorCategorySchema,
  vendorDetailResponseDataSchema,
} from "../validation/index.ts";
import { normalizeVendorImageRows } from "./images.ts";
import type {
  Vendor,
  VendorCategory,
  VendorDetailResponseData,
  VendorFeaturedDish,
  VendorHours,
  VendorImage,
} from "../../types/index.ts";
import type { VendorUsageScoreMap } from "./nearby.ts";

export type SupabaseRestConfig = {
  url: string;
  anonKey: string;
};

type SupabaseServiceRoleConfig = {
  url: string;
  serviceRoleKey: string;
};

type VendorUsageScoreRow = {
  vendor_id: string;
  ranking_score: number;
};

type VendorUsageEventType =
  | "vendor_selected"
  | "vendor_detail_opened"
  | "directions_clicked"
  | "call_clicked";

type VendorUsageEventRow = {
  vendor_id: string | null;
  event_type: VendorUsageEventType | null;
};

const nearbyVendorBaseSelect = [
  "id",
  "name",
  "slug",
  "short_description",
  "phone_number",
  "area",
  "latitude",
  "longitude",
  "price_band",
  "average_rating",
  "review_count",
  "is_open_override",
  "vendor_hours(day_of_week,open_time,close_time,is_closed)",
  "vendor_featured_dishes(dish_name,description,is_featured)",
].join(",");

const vendorUsageEventTypes: VendorUsageEventType[] = [
  "vendor_selected",
  "vendor_detail_opened",
  "directions_clicked",
  "call_clicked",
];

const vendorUsageEventWeights: Record<VendorUsageEventType, number> = {
  vendor_selected: 1,
  vendor_detail_opened: 3,
  directions_clicked: 5,
  call_clicked: 8,
};

type VendorDetailRestRecord = Vendor & {
  vendor_hours?: VendorHours[] | null;
  vendor_category_map?: Array<{
    vendor_categories: VendorCategory | null;
  }> | null;
  vendor_featured_dishes?: VendorFeaturedDish[] | null;
  vendor_images?: VendorImage[] | null;
};

export function getSupabaseRestConfig(): SupabaseRestConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return {
    url,
    anonKey,
  };
}

export function getSupabaseServiceRoleConfig(): SupabaseServiceRoleConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  if (!url || !serviceRoleKey) return null;

  return {
    url,
    serviceRoleKey,
  };
}

function appendFilter(url: URL, key: string, value: string): void {
  url.searchParams.append(key, value);
}

async function fetchSupabaseJson<T>(
  url: URL,
  config: SupabaseRestConfig,
  errorLabel: string,
  options?: {
    cache?: RequestCache;
    revalidate?: number;
  },
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      apikey: config.anonKey,
      authorization: `Bearer ${config.anonKey}`,
    },
    ...(options?.cache ? { cache: options.cache } : {}),
    ...(!options?.cache
      ? {
          next: {
            revalidate: options?.revalidate ?? 30,
          },
        }
      : {}),
  });

  if (!response.ok) {
    throw new Error(`${errorLabel}: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function callSupabaseServiceRoleRpc<T>(
  functionName: string,
  payload: Record<string, unknown>,
  config: SupabaseServiceRoleConfig,
  errorLabel: string,
): Promise<T> {
  const url = new URL(`/rest/v1/rpc/${functionName}`, config.url);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${errorLabel}: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchSupabaseServiceRoleJson<T>(
  url: URL,
  config: SupabaseServiceRoleConfig,
  errorLabel: string,
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${errorLabel}: ${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeVendorUsageScoreRows(
  rows: VendorUsageScoreRow[],
): VendorUsageScoreMap {
  const scores: VendorUsageScoreMap = new Map();

  for (const row of rows) {
    if (!row.vendor_id || !Number.isFinite(row.ranking_score)) {
      continue;
    }
    scores.set(row.vendor_id, Math.max(0, Math.trunc(row.ranking_score)));
  }

  return scores;
}

async function fetchVendorUsageScoresFromEvents(
  vendorIds: string[],
  config: SupabaseServiceRoleConfig,
): Promise<VendorUsageScoreMap> {
  const pageSize = 1000;
  const rows: VendorUsageEventRow[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const url = new URL("/rest/v1/user_events", config.url);
    url.searchParams.set("select", "vendor_id,event_type");
    appendFilter(url, "vendor_id", `in.(${vendorIds.join(",")})`);
    appendFilter(
      url,
      "event_type",
      `in.(${vendorUsageEventTypes.join(",")})`,
    );
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));

    const page = await fetchSupabaseServiceRoleJson<VendorUsageEventRow[]>(
      url,
      config,
      "Supabase vendor usage fallback query failed",
    );

    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  const scores: VendorUsageScoreMap = new Map();

  for (const row of rows) {
    if (!row.vendor_id || !row.event_type) {
      continue;
    }

    const weight = vendorUsageEventWeights[row.event_type];

    if (!weight) {
      continue;
    }

    scores.set(row.vendor_id, (scores.get(row.vendor_id) ?? 0) + weight);
  }

  return scores;
}

export async function fetchNearbyVendorCandidates(
  query: ResolvedNearbyVendorsQuery,
  config: SupabaseRestConfig,
): Promise<VendorLocationRecord[]> {
  const box = getNearbyBoundingBox(query);
  const url = new URL("/rest/v1/vendors", config.url);
  const select = query.category
    ? `${nearbyVendorBaseSelect},vendor_category_map!inner(vendor_categories!inner(slug))`
    : nearbyVendorBaseSelect;

  url.searchParams.set("select", select);
  appendFilter(url, "is_active", "eq.true");
  appendFilter(url, "latitude", `gte.${box.minLat}`);
  appendFilter(url, "latitude", `lte.${box.maxLat}`);
  appendFilter(url, "longitude", `gte.${box.minLng}`);
  appendFilter(url, "longitude", `lte.${box.maxLng}`);

  if (query.price_band) {
    appendFilter(url, "price_band", `eq.${query.price_band}`);
  }

  if (query.category) {
    appendFilter(
      url,
      "vendor_category_map.vendor_categories.slug",
      `eq.${query.category}`,
    );
  }

  if (query.search) {
    const escapedSearch = query.search.replaceAll("*", "").replaceAll(",", " ");
    appendFilter(
      url,
      "or",
      `(name.ilike.*${escapedSearch}*,short_description.ilike.*${escapedSearch}*,area.ilike.*${escapedSearch}*)`,
    );
  }

  return fetchSupabaseJson<VendorLocationRecord[]>(
    url,
    config,
    "Supabase nearby vendor query failed",
  );
}

export async function fetchVendorUsageScores(
  vendorIds: string[],
  config: SupabaseServiceRoleConfig | null,
): Promise<VendorUsageScoreMap> {
  if (!config || vendorIds.length === 0) {
    return new Map();
  }

  const uniqueVendorIds = [...new Set(vendorIds)];
  try {
    const rows = await callSupabaseServiceRoleRpc<VendorUsageScoreRow[]>(
      "get_vendor_usage_scores",
      {
        vendor_ids: uniqueVendorIds,
      },
      config,
      "Supabase vendor usage RPC failed",
    );

    return normalizeVendorUsageScoreRows(rows);
  } catch (rpcError) {
    try {
      return await fetchVendorUsageScoresFromEvents(uniqueVendorIds, config);
    } catch (fallbackError) {
      const rpcMessage =
        rpcError instanceof Error ? rpcError.message : String(rpcError);
      const fallbackMessage =
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError);

      throw new Error(`${rpcMessage}; fallback failed: ${fallbackMessage}`);
    }
  }
}

export async function fetchPublicCategoriesFromSupabase(
  config: SupabaseRestConfig,
): Promise<VendorCategory[]> {
  const url = new URL("/rest/v1/vendor_categories", config.url);
  url.searchParams.set("select", "id,name,slug,created_at");
  url.searchParams.set("order", "name.asc");

  const rows = await fetchSupabaseJson<unknown[]>(
    url,
    config,
    "Supabase categories query failed",
  );

  return rows.map((row) => vendorCategorySchema.parse(row));
}

export async function fetchVendorDetailBySlugFromSupabase(
  slug: string,
  config: SupabaseRestConfig,
): Promise<VendorDetailResponseData | null> {
  const url = new URL("/rest/v1/vendors", config.url);
  url.searchParams.set(
    "select",
    [
      "*",
      "vendor_hours(*)",
      "vendor_category_map(vendor_categories(*))",
      "vendor_featured_dishes(*)",
      "vendor_images(*)",
    ].join(","),
  );
  url.searchParams.set("slug", `eq.${slug}`);
  url.searchParams.set("is_active", "eq.true");
  url.searchParams.set("limit", "1");

  const rows = await fetchSupabaseJson<VendorDetailRestRecord[]>(
    url,
    config,
    "Supabase vendor detail query failed",
    {
      cache: "no-store",
    },
  );
  const vendor = rows[0];

  if (!vendor) return null;

  const categories =
    vendor.vendor_category_map
      ?.flatMap((mapping) =>
        mapping.vendor_categories ? [mapping.vendor_categories] : [],
      )
      .sort((left, right) => left.name.localeCompare(right.name)) ?? [];
  const hours =
    vendor.vendor_hours?.toSorted((left, right) => left.day_of_week - right.day_of_week) ??
    [];
  const images =
    (
      normalizeVendorImageRows(config.url, vendor.vendor_images ?? []) as VendorImage[]
    ).toSorted((left, right) => left.sort_order - right.sort_order) ?? [];
  const featuredDishes =
    vendor.vendor_featured_dishes?.filter((dish) => dish.is_featured) ?? [];
  const availability = getVendorAvailabilitySnapshot(hours, vendor.is_open_override);

  return vendorDetailResponseDataSchema.parse({
    ...vendor,
    hours,
    categories,
    featured_dishes: featuredDishes,
    images,
    is_open_now: availability.isOpenNow,
    today_hours: availability.todayHours,
    rating_summary: {
      average_rating: vendor.average_rating,
      review_count: vendor.review_count,
    },
  });
}

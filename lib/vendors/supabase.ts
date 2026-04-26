import { getNearbyBoundingBox, type VendorLocationRecord } from "./nearby.ts";
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

type UserEventRow = {
  vendor_id: string | null;
  event_type: string;
};

const vendorUsageEventWeights = {
  vendor_selected: 1,
  vendor_detail_opened: 3,
  directions_clicked: 5,
  call_clicked: 8,
} as const;

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

export async function fetchNearbyVendorCandidates(
  query: ResolvedNearbyVendorsQuery,
  config: SupabaseRestConfig,
): Promise<VendorLocationRecord[]> {
  const box = getNearbyBoundingBox(query);
  const url = new URL("/rest/v1/vendors", config.url);
  const select = query.category
    ? `${nearbyVendorBaseSelect},vendor_category_map(vendor_categories(slug))`
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

  const url = new URL("/rest/v1/user_events", config.url);
  url.searchParams.set("select", "vendor_id,event_type");
  url.searchParams.set("vendor_id", `in.(${vendorIds.join(",")})`);
  url.searchParams.set(
    "event_type",
    `in.(${Object.keys(vendorUsageEventWeights).join(",")})`,
  );

  const rows = await fetchSupabaseServiceRoleJson<UserEventRow[]>(
    url,
    config,
    "Supabase vendor usage query failed",
  );

  const scores: VendorUsageScoreMap = new Map();

  for (const row of rows) {
    if (!row.vendor_id) {
      continue;
    }

    const weight =
      vendorUsageEventWeights[
        row.event_type as keyof typeof vendorUsageEventWeights
      ];

    if (!weight) {
      continue;
    }

    scores.set(row.vendor_id, (scores.get(row.vendor_id) ?? 0) + weight);
  }

  return scores;
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

  return vendorDetailResponseDataSchema.parse({
    ...vendor,
    hours,
    categories,
    featured_dishes: featuredDishes,
    images,
    rating_summary: {
      average_rating: vendor.average_rating,
      review_count: vendor.review_count,
    },
  });
}

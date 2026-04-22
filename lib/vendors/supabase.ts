import { getNearbyBoundingBox, type VendorLocationRecord } from "@/lib/vendors/nearby";
import type { ResolvedNearbyVendorsQuery } from "@/lib/location/user-location";

type SupabaseRestConfig = {
  url: string;
  anonKey: string;
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
].join(",");

export function getSupabaseRestConfig(): SupabaseRestConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return {
    url,
    anonKey,
  };
}

function appendFilter(url: URL, key: string, value: string): void {
  url.searchParams.append(key, value);
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

  const response = await fetch(url, {
    headers: {
      apikey: config.anonKey,
      authorization: `Bearer ${config.anonKey}`,
    },
    next: {
      revalidate: 30,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase nearby vendor query failed: ${response.status}`);
  }

  return (await response.json()) as VendorLocationRecord[];
}

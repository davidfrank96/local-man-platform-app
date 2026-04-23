import type { ApiResponse } from "../api/responses.ts";
import type {
  LocationSource,
  NearbyVendorsResponseData,
  PriceBand,
  VendorCategory,
  VendorDetailResponseData,
} from "../../types/index.ts";

export type PublicNearbyFilters = {
  lat?: number;
  lng?: number;
  location_source?: LocationSource;
  radius_km?: number;
  open_now?: boolean;
  category?: string;
  price_band?: PriceBand;
  search?: string;
};

export type PublicCategory = Pick<VendorCategory, "id" | "name" | "slug">;

function appendDefinedParam(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  params.set(key, String(value));
}

async function requestPublicApi<T>(
  path: string,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const response = await fetchImpl(path);
  const payload = (await response.json()) as ApiResponse<T>;

  if (!payload.success) {
    throw new Error(`${payload.error.code}: ${payload.error.message}`);
  }

  return payload.data;
}

export function getDirectionsUrl(latitude: number, longitude: number): string {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", `${latitude},${longitude}`);

  return url.toString();
}

export function getPhoneHref(phoneNumber: string | null): string | null {
  if (!phoneNumber) return null;

  const normalized = phoneNumber.replace(/[^\d+]/g, "");

  return normalized.length > 0 ? `tel:${normalized}` : null;
}

export async function fetchNearbyVendors(
  filters: PublicNearbyFilters,
  fetchImpl?: typeof fetch,
): Promise<NearbyVendorsResponseData> {
  const params = new URLSearchParams();
  appendDefinedParam(params, "lat", filters.lat);
  appendDefinedParam(params, "lng", filters.lng);
  appendDefinedParam(params, "location_source", filters.location_source);
  appendDefinedParam(params, "radius_km", filters.radius_km);
  appendDefinedParam(params, "open_now", filters.open_now);
  appendDefinedParam(params, "category", filters.category);
  appendDefinedParam(params, "price_band", filters.price_band);
  appendDefinedParam(params, "search", filters.search);

  const queryString = params.toString();

  return requestPublicApi<NearbyVendorsResponseData>(
    `/api/vendors/nearby${queryString ? `?${queryString}` : ""}`,
    fetchImpl,
  );
}

export async function fetchPublicCategories(
  fetchImpl?: typeof fetch,
): Promise<PublicCategory[]> {
  const result = await requestPublicApi<{ categories: PublicCategory[] }>(
    "/api/categories",
    fetchImpl,
  );

  return result.categories;
}

export async function fetchVendorDetail(
  slug: string,
  fetchImpl?: typeof fetch,
): Promise<VendorDetailResponseData> {
  const result = await requestPublicApi<{ vendor: VendorDetailResponseData }>(
    `/api/vendors/${slug}`,
    fetchImpl,
  );

  return result.vendor;
}

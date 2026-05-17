import type { ApiResponse } from "../api/responses.ts";
import { DEFAULT_CITY_LOCATION } from "../location/user-location.ts";
import type {
  LocationSource,
  NearbyVendorsResponseData,
  PriceBand,
  RiderContactHandoffRequest,
  RiderContactHandoffResponseData,
  RiderSuggestionsResponseData,
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

const MAX_PUBLIC_SEARCH_LENGTH = 100;

function appendDefinedParam(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  params.set(key, String(value));
}

export function sanitizePublicSearchInput(input: string | null | undefined): string {
  if (typeof input !== "string") {
    return "";
  }

  return input.trim().slice(0, MAX_PUBLIC_SEARCH_LENGTH);
}

function encodePublicSearchQuery(input: string): string {
  return encodeURIComponent(input).replaceAll("'", "%27");
}

function buildNearbyFallbackLocation(
  filters: PublicNearbyFilters,
): NearbyVendorsResponseData["location"] {
  if (typeof filters.lat === "number" && typeof filters.lng === "number") {
    const source = filters.location_source ?? "precise";

    return {
      source,
      label: source === "approximate" ? "Approximate location" : "Current location",
      coordinates: {
        lat: filters.lat,
        lng: filters.lng,
      },
      isApproximate: source !== "precise",
    };
  }

  return {
    source: "default_city",
    label: DEFAULT_CITY_LOCATION.label,
    coordinates: DEFAULT_CITY_LOCATION.coordinates,
    isApproximate: true,
  };
}

function buildNearbyQueryString(filters: PublicNearbyFilters): string {
  const params = new URLSearchParams();
  appendDefinedParam(params, "lat", filters.lat);
  appendDefinedParam(params, "lng", filters.lng);
  appendDefinedParam(params, "location_source", filters.location_source);
  appendDefinedParam(params, "radius_km", filters.radius_km);
  appendDefinedParam(params, "open_now", filters.open_now);
  appendDefinedParam(params, "category", filters.category);
  appendDefinedParam(params, "price_band", filters.price_band);

  const querySegments = [params.toString()];
  const normalizedSearch = sanitizePublicSearchInput(filters.search);

  if (normalizedSearch) {
    const safeQuery = encodePublicSearchQuery(normalizedSearch);
    querySegments.push(`search=${safeQuery}`);
  }

  return querySegments.filter(Boolean).join("&");
}

async function requestPublicApi<T>(
  path: string,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const response = await fetchImpl(path);
  let payload: ApiResponse<T>;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error(
      response.ok
        ? "INVALID_RESPONSE: API returned a response that could not be parsed."
        : `HTTP_ERROR: API request failed with status ${response.status}.`,
    );
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof payload.success !== "boolean"
  ) {
    throw new Error("INVALID_RESPONSE: API returned an unexpected response shape.");
  }

  if (!payload.success) {
    const code = payload.error?.code ?? "UNKNOWN_ERROR";
    const message = payload.error?.message ?? "API request failed.";

    throw new Error(`${code}: ${message}`);
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
  const queryString = buildNearbyQueryString(filters);
  const normalizedSearch = sanitizePublicSearchInput(filters.search);

  try {
    return await requestPublicApi<NearbyVendorsResponseData>(
      `/api/vendors/nearby${queryString ? `?${queryString}` : ""}`,
      fetchImpl,
    );
  } catch (error) {
    if (!normalizedSearch) {
      throw error;
    }

    return {
      location: buildNearbyFallbackLocation(filters),
      vendors: [],
    };
  }
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

export async function fetchVendorRiderSuggestions(
  slug: string,
  fetchImpl?: typeof fetch,
): Promise<RiderSuggestionsResponseData> {
  return requestPublicApi<RiderSuggestionsResponseData>(
    `/api/vendors/${slug}/riders`,
    fetchImpl,
  );
}

export async function createVendorRiderContactHandoff(
  slug: string,
  payload: RiderContactHandoffRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<RiderContactHandoffResponseData> {
  const response = await fetchImpl(`/api/vendors/${slug}/riders/contact`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  let body: ApiResponse<RiderContactHandoffResponseData>;

  try {
    body = (await response.json()) as ApiResponse<RiderContactHandoffResponseData>;
  } catch {
    throw new Error(
      response.ok
        ? "INVALID_RESPONSE: API returned a response that could not be parsed."
        : `HTTP_ERROR: API request failed with status ${response.status}.`,
    );
  }

  if (!body.success) {
    const code = body.error?.code ?? "UNKNOWN_ERROR";
    const message = body.error?.message ?? "API request failed.";

    throw new Error(`${code}: ${message}`);
  }

  return body.data;
}

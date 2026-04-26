import type { ApiResponse } from "../api/responses.ts";
import type {
  CreateVendorDishesRequest,
  CreateVendorRequest,
  PriceBand,
  ReplaceVendorHoursRequest,
  UpdateVendorRequest,
  Vendor,
  VendorFeaturedDish,
  VendorHours,
  VendorImage,
} from "../../types/index.ts";

export type AdminVendorSummary = Pick<
  Vendor,
  | "id"
  | "name"
  | "slug"
  | "short_description"
  | "phone_number"
  | "area"
  | "latitude"
  | "longitude"
  | "price_band"
  | "average_rating"
  | "review_count"
  | "is_active"
  | "is_open_override"
> & {
  hours_count: number;
  images_count: number;
  featured_dishes_count: number;
};

export type AdminVendorListResult = {
  vendors: AdminVendorSummary[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
};

export type AdminVendorFilters = {
  search?: string;
  area?: string;
  is_active?: boolean;
  price_band?: PriceBand;
  limit?: number;
  offset?: number;
};

export class AdminApiError extends Error {
  code: string;

  status: number;

  details: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(`${code}: ${message}`);
    this.name = "AdminApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type AdminApiClientOptions = {
  accessToken: string;
  fetchImpl?: typeof fetch;
};

function createAdminHeaders(
  accessToken: string,
  body?: BodyInit | null,
): HeadersInit {
  const headers: HeadersInit = {
    authorization: `Bearer ${accessToken}`,
  };

  if (body instanceof FormData) {
    return headers;
  }

  return {
    ...headers,
    "content-type": "application/json",
  };
}

function appendDefinedParam(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  params.set(key, String(value));
}

async function requestAdminApi<T>(
  path: string,
  { accessToken, fetchImpl = fetch }: AdminApiClientOptions,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetchImpl(path, {
    ...init,
    headers: {
      ...createAdminHeaders(accessToken, init.body ?? null),
      ...init.headers,
    },
  });
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

    throw new AdminApiError(code, message, response.status, payload.error?.details);
  }

  return payload.data;
}

export async function listAdminVendors(
  filters: AdminVendorFilters,
  options: AdminApiClientOptions,
): Promise<AdminVendorListResult> {
  const params = new URLSearchParams({
    limit: String(filters.limit ?? 100),
    offset: String(filters.offset ?? 0),
  });
  appendDefinedParam(params, "search", filters.search);
  appendDefinedParam(params, "area", filters.area);
  appendDefinedParam(params, "is_active", filters.is_active);
  appendDefinedParam(params, "price_band", filters.price_band);

  return requestAdminApi<AdminVendorListResult>(
    `/api/admin/vendors?${params.toString()}`,
    options,
  );
}

export async function createAdminVendor(
  data: CreateVendorRequest,
  options: AdminApiClientOptions,
): Promise<AdminVendorSummary> {
  const result = await requestAdminApi<{ vendor: AdminVendorSummary }>(
    "/api/admin/vendors",
    options,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return result.vendor;
}

export async function updateAdminVendor(
  vendorId: string,
  data: UpdateVendorRequest,
  options: AdminApiClientOptions,
): Promise<AdminVendorSummary> {
  const result = await requestAdminApi<{ vendor: AdminVendorSummary }>(
    `/api/admin/vendors/${vendorId}`,
    options,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );

  return result.vendor;
}

export async function deactivateAdminVendor(
  vendorId: string,
  options: AdminApiClientOptions,
): Promise<{ vendor_id: string; is_active: false }> {
  const result = await requestAdminApi<{
    vendor: { vendor_id: string; is_active: false };
  }>(`/api/admin/vendors/${vendorId}`, options, {
    method: "DELETE",
  });

  return result.vendor;
}

export async function replaceAdminVendorHours(
  vendorId: string,
  data: ReplaceVendorHoursRequest,
  options: AdminApiClientOptions,
): Promise<VendorHours[]> {
  const result = await requestAdminApi<{ hours: VendorHours[] }>(
    `/api/admin/vendors/${vendorId}/hours`,
    options,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return result.hours;
}

export async function listAdminVendorHours(
  vendorId: string,
  options: AdminApiClientOptions,
): Promise<VendorHours[]> {
  const result = await requestAdminApi<{ hours: VendorHours[] }>(
    `/api/admin/vendors/${vendorId}/hours`,
    options,
  );

  return result.hours;
}

export async function createAdminVendorImages(
  vendorId: string,
  data: FormData,
  options: AdminApiClientOptions,
): Promise<VendorImage[]> {
  const result = await requestAdminApi<{ images: VendorImage[] }>(
    `/api/admin/vendors/${vendorId}/images`,
    options,
    {
      method: "POST",
      body: data,
    },
  );

  return result.images;
}

export async function listAdminVendorImages(
  vendorId: string,
  options: AdminApiClientOptions,
): Promise<VendorImage[]> {
  const result = await requestAdminApi<{ images: VendorImage[] }>(
    `/api/admin/vendors/${vendorId}/images`,
    options,
  );

  return result.images;
}

export async function deleteAdminVendorImage(
  vendorId: string,
  imageId: string,
  options: AdminApiClientOptions,
): Promise<VendorImage> {
  const result = await requestAdminApi<{ image: VendorImage }>(
    `/api/admin/vendors/${vendorId}/images/${imageId}`,
    options,
    {
      method: "DELETE",
    },
  );

  return result.image;
}

export async function createAdminVendorDishes(
  vendorId: string,
  data: CreateVendorDishesRequest,
  options: AdminApiClientOptions,
): Promise<VendorFeaturedDish[]> {
  const result = await requestAdminApi<{ dishes: VendorFeaturedDish[] }>(
    `/api/admin/vendors/${vendorId}/dishes`,
    options,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return result.dishes;
}

export async function listAdminVendorDishes(
  vendorId: string,
  options: AdminApiClientOptions,
): Promise<VendorFeaturedDish[]> {
  const result = await requestAdminApi<{ dishes: VendorFeaturedDish[] }>(
    `/api/admin/vendors/${vendorId}/dishes`,
    options,
  );

  return result.dishes;
}

export async function deleteAdminVendorDish(
  vendorId: string,
  dishId: string,
  options: AdminApiClientOptions,
): Promise<VendorFeaturedDish> {
  const result = await requestAdminApi<{ dish: VendorFeaturedDish }>(
    `/api/admin/vendors/${vendorId}/dishes/${dishId}`,
    options,
    {
      method: "DELETE",
    },
  );

  return result.dish;
}

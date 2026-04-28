import { createClient } from "@supabase/supabase-js";
import type { ApiResponse } from "../api/responses.ts";
import { AppError } from "../errors/app-error.ts";
import type { AppErrorCode } from "../api/contracts.ts";
import { auditLogSchema } from "../validation/schemas.ts";
import type {
  AdminRole,
  AdminUser,
  AuditActionType,
  AuditLog,
  AdminAnalyticsRange,
  AdminAnalyticsResponseData,
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

export type AdminAnalyticsFilters = {
  range?: AdminAnalyticsRange;
};

export type AdminAuditLogFilters = {
  limit?: number;
  offset?: number;
  user_role?: AdminRole;
  action?: AuditActionType;
  since?: string;
};

export type AdminAuditLogListResult = {
  auditLogs: AuditLog[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
};

export type CreateAdminUserRequest = {
  email: string;
  password: string;
  full_name?: string | null;
  role: AdminRole;
};

export type VendorIntakeRowInput = {
  row_number?: number | null;
  vendor_name?: string | number | null;
  category?: string | number | null;
  address?: string | number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  phone?: string | number | null;
  opening_time?: string | number | null;
  closing_time?: string | number | null;
  description?: string | number | null;
};

export type VendorIntakePreviewRow = {
  rowNumber: number;
  vendor_name: string | null;
  slug: string | null;
  category: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  opening_time: string | null;
  closing_time: string | null;
  description: string | null;
  issues: VendorIntakeIssue[];
  errors: string[];
};

export type VendorIntakeIssue = {
  row: number;
  field: string;
  error: string;
  code: string;
};

export type VendorIntakePreviewResult = {
  totalRows: number;
  rows: VendorIntakePreviewRow[];
  validRows: VendorIntakePreviewRow[];
  invalidRows: VendorIntakePreviewRow[];
};

export type VendorIntakeUploadResult = VendorIntakePreviewResult & {
  uploadedRows: Array<{
    rowNumber: number;
    vendor: Pick<AdminVendorSummary, "id" | "name" | "slug">;
  }>;
  failedRows: Array<{
    rowNumber: number;
    vendor_name: string | null;
    error: string;
  }>;
  successCount: number;
  failedCount: number;
  errors: VendorIntakeIssue[];
};

export type UpdateAdminUserRequest = {
  full_name?: string | null;
  role?: AdminRole;
};

export class AdminApiError extends AppError {}

export type AdminApiSafeError = {
  code: AppErrorCode | string;
  message: string;
  detail?: string;
};

export type AdminApiSafeResult<T> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: AdminApiSafeError;
    };

const adminAuditRoles = new Set<AdminRole>(["admin", "agent"]);
const adminAuditActions = new Set<AuditActionType>([
  "CREATE_VENDOR",
  "UPDATE_VENDOR",
  "UPDATE_VENDOR_STATUS",
  "DELETE_VENDOR",
  "UPDATE_VENDOR_HOURS",
  "CREATE_VENDOR_IMAGES",
  "UPLOAD_VENDOR_IMAGE",
  "DELETE_VENDOR_IMAGE",
  "CREATE_VENDOR_DISHES",
  "DELETE_VENDOR_DISH",
  "CREATE_ADMIN_USER",
  "UPDATE_ADMIN_USER",
  "DELETE_ADMIN_USER",
  "CHANGE_ADMIN_USER_ROLE",
]);

type AdminApiClientOptions = {
  accessToken: string;
  fetchImpl?: typeof fetch;
};

type AdminClientSupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function createAdminHeaders(
  accessToken: string,
  body?: BodyInit | null,
): HeadersInit {
  const requestId = crypto.randomUUID();
  const headers: HeadersInit = {
    authorization: `Bearer ${accessToken}`,
    "x-request-id": requestId,
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

function getAdminClientSupabaseConfig(): AdminClientSupabaseConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new AdminApiError(
      "CONFIG_ERROR",
      "System configuration error.",
      503,
      { missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] },
      "Supabase public environment variables are required for analytics reads.",
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

function normalizeAuditLogFilters(filters: AdminAuditLogFilters): AdminAuditLogFilters {
  const normalizedLimit = filters.limit ?? 10;
  const normalizedOffset = filters.offset ?? 0;

  if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1 || normalizedLimit > 10) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "Invalid audit log filters.",
      400,
      { field: "limit", value: filters.limit ?? null },
      "limit must be an integer between 1 and 10.",
    );
  }

  if (!Number.isInteger(normalizedOffset) || normalizedOffset < 0) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "Invalid audit log filters.",
      400,
      { field: "offset", value: filters.offset ?? null },
      "offset must be a non-negative integer.",
    );
  }

  if (filters.user_role && !adminAuditRoles.has(filters.user_role)) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "Invalid audit log filters.",
      400,
      { field: "user_role", value: filters.user_role },
      "user_role must be either admin or agent.",
    );
  }

  if (filters.action && !adminAuditActions.has(filters.action)) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "Invalid audit log filters.",
      400,
      { field: "action", value: filters.action },
      "action must be a supported audit action.",
    );
  }

  return {
    ...filters,
    limit: normalizedLimit,
    offset: normalizedOffset,
  };
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
    throw new AdminApiError(
      response.ok ? "INVALID_RESPONSE" : "UPSTREAM_ERROR",
      response.ok
        ? "INVALID_RESPONSE: API returned a response that could not be parsed."
        : `HTTP_ERROR: API request failed with status ${response.status}.`,
      response.status,
      undefined,
      response.ok
        ? "The API returned a response that could not be parsed."
        : `The API request failed with HTTP ${response.status}.`,
    );
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof payload.success !== "boolean"
  ) {
    throw new AdminApiError(
      "INVALID_RESPONSE",
      "INVALID_RESPONSE: API returned an unexpected response shape.",
      response.status || 502,
      undefined,
      "The API returned a response shape that does not match the shared contract.",
    );
  }

  if (!payload.success) {
    const code = payload.error?.code ?? "UNKNOWN_ERROR";
    const message = payload.error?.message ?? "API request failed.";
    const detail = payload.error?.detail ?? null;

    throw new AdminApiError(
      code,
      message,
      response.status,
      payload.error?.details,
      detail ?? undefined,
    );
  }

  return payload.data;
}

async function requestAdminApiResult<T>(
  path: string,
  options: AdminApiClientOptions,
  init: RequestInit = {},
): Promise<AdminApiSafeResult<T>> {
  try {
    const data = await requestAdminApi<T>(path, options, init);
    return {
      data,
      error: null,
    };
  } catch (error) {
    if (error instanceof AdminApiError) {
      return {
        data: null,
        error: {
          code: error.code,
          message: error.message,
          detail: error.detail ?? undefined,
        },
      };
    }

    return {
      data: null,
      error: {
        code: "UNKNOWN_ERROR",
        message: "API request failed.",
        detail: error instanceof Error ? error.message : undefined,
      },
    };
  }
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

export async function fetchAdminAnalytics(
  filters: AdminAnalyticsFilters,
  options: AdminApiClientOptions,
): Promise<AdminApiSafeResult<AdminAnalyticsResponseData>> {
  const params = new URLSearchParams();
  appendDefinedParam(params, "range", filters.range ?? "7d");

  return requestAdminApiResult<AdminAnalyticsResponseData>(
    `/api/admin/analytics?${params.toString()}`,
    options,
  );
}

export async function fetchAdminAuditLogs(
  filters: AdminAuditLogFilters,
  options: AdminApiClientOptions,
): Promise<AdminApiSafeResult<AdminAuditLogListResult>> {
  let normalizedFilters: AdminAuditLogFilters;

  try {
    normalizedFilters = normalizeAuditLogFilters(filters);
  } catch (error) {
    if (error instanceof AdminApiError) {
      return {
        data: null,
        error: {
          code: error.code,
          message: error.message,
          detail: error.detail ?? undefined,
        },
      };
    }

    return {
      data: null,
      error: {
        code: "UNKNOWN_ERROR",
        message: "Invalid audit log filters.",
        detail: error instanceof Error ? error.message : undefined,
      },
    };
  }

  try {
    const { supabaseUrl, supabaseAnonKey } = getAdminClientSupabaseConfig();
    const pageSize = Math.min(normalizedFilters.limit ?? 10, 10);
    const offset = normalizedFilters.offset ?? 0;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: options.fetchImpl,
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      accessToken: async () => options.accessToken,
    });

    let query = supabase
      .from("audit_logs")
      .select("id,user_role,entity_type,entity_id,action,metadata,created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize);

    if (normalizedFilters.user_role) {
      query = query.eq("user_role", normalizedFilters.user_role);
    }

    if (normalizedFilters.action) {
      query = query.eq("action", normalizedFilters.action);
    }

    if (normalizedFilters.since) {
      query = query.gte("created_at", normalizedFilters.since);
    }

    const { data, error } = await query;

    if (error) {
      const normalizedMessage = error.message.toLowerCase();
      const errorCode = error.code === "42501" || normalizedMessage.includes("permission denied")
        ? "FORBIDDEN"
        : normalizedMessage.includes("jwt") || normalizedMessage.includes("auth")
          ? "UNAUTHORIZED"
          : "UPSTREAM_ERROR";

      return {
        data: null,
        error: {
          code: errorCode,
          message: errorCode === "FORBIDDEN"
            ? "You do not have access to analytics"
            : errorCode === "UNAUTHORIZED"
              ? "Admin session expired. Sign in again."
              : "Activity temporarily unavailable.",
          detail: error.message,
        },
      };
    }

    const parsed = auditLogSchema.array().safeParse(data ?? []);

    if (!parsed.success) {
      return {
        data: null,
        error: {
          code: "INVALID_RESPONSE",
          message: "Activity temporarily unavailable.",
          detail: "Supabase returned an unexpected audit log payload.",
        },
      };
    }

    return {
      data: {
        auditLogs: parsed.data.slice(0, pageSize),
        pagination: {
          limit: pageSize,
          offset,
          has_more: parsed.data.length > pageSize,
        },
      },
      error: null,
    };
  } catch (error) {
    if (error instanceof AdminApiError) {
      return {
        data: null,
        error: {
          code: error.code,
          message: error.message,
          detail: error.detail ?? undefined,
        },
      };
    }

    return {
      data: null,
      error: {
        code: "UNKNOWN_ERROR",
        message: "Activity temporarily unavailable.",
        detail: error instanceof Error ? error.message : undefined,
      },
    };
  }
}

export async function listAdminUsers(
  options: AdminApiClientOptions,
): Promise<AdminUser[]> {
  const result = await requestAdminApi<{ adminUsers: AdminUser[] }>(
    "/api/admin/admin-users",
    options,
  );

  return result.adminUsers;
}

export async function createManagedAdminUser(
  data: CreateAdminUserRequest,
  options: AdminApiClientOptions,
): Promise<AdminUser> {
  const result = await requestAdminApi<{ adminUser: AdminUser }>(
    "/api/admin/admin-users",
    options,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return result.adminUser;
}

export async function updateManagedAdminUserRole(
  adminUserId: string,
  data: UpdateAdminUserRequest,
  options: AdminApiClientOptions,
): Promise<AdminUser> {
  const result = await requestAdminApi<{ adminUser: AdminUser }>(
    `/api/admin/admin-users/${adminUserId}`,
    options,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );

  return result.adminUser;
}

export async function deleteManagedAdminUser(
  adminUserId: string,
  options: AdminApiClientOptions,
): Promise<{ adminUserId: string }> {
  const result = await requestAdminApi<{ adminUserId: string }>(
    `/api/admin/admin-users/${adminUserId}`,
    options,
    {
      method: "DELETE",
    },
  );

  return { adminUserId: result.adminUserId };
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

export async function submitAdminVendorIntake(
  data: {
    action: "preview" | "upload";
    rows: VendorIntakeRowInput[];
  },
  options: AdminApiClientOptions,
): Promise<VendorIntakePreviewResult | VendorIntakeUploadResult> {
  return requestAdminApi<VendorIntakePreviewResult | VendorIntakeUploadResult>(
    "/api/admin/vendors/intake",
    options,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
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

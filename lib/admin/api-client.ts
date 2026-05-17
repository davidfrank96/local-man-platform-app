import type { ApiResponse } from "../api/responses.ts";
import { AppError } from "../errors/app-error.ts";
import type { AppErrorCode } from "../api/contracts.ts";
import { invalidatePublicDiscoveryVendorCache } from "../public/discovery-cache.ts";
import { adminUserSchema } from "../validation/schemas.ts";
import type {
  AdminRole,
  AdminRider,
  AdminRidersQuery,
  AdminUser,
  AuditActionType,
  AuditLog,
  AdminAnalyticsRange,
  AdminAnalyticsResponseData,
  OperationalEvent,
  OperationalEventLevel,
  OperationalEventTimeWindow,
  CreateManagedVendorRequest,
  CreateVendorDishesRequest,
  PriceBand,
  ReplaceVendorHoursRequest,
  UpdateVendorRequest,
  UpdateAdminRiderRequest,
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
  cursor?: string;
  offset?: number;
  user_role?: AdminRole;
  action?: AuditActionType;
  since?: string;
};

export type AdminAuditLogListResult = {
  auditLogs: AuditLog[];
  pagination: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
};

export type AdminOperationalLogFilters = {
  limit?: number;
  cursor?: string;
  offset?: number;
  level?: OperationalEventLevel;
  area?: string;
  event?: string;
  route?: string;
  since?: string;
  time_window?: OperationalEventTimeWindow;
};

export type AdminOperationalLogListResult = {
  operationalEvents: OperationalEvent[];
  pagination: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
};

export type AdminRiderListResult = {
  riders: AdminRider[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
};

export type CreateAdminUserRequest = {
  email: string;
  password: string;
  full_name?: string | null;
  role: AdminRole;
};

const maxVendorImageBytes = 5 * 1024 * 1024;
const vendorImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type VendorIntakeRowInput = {
  row_number?: number | null;
  vendor_name?: string | number | null;
  slug?: string | number | null;
  category?: string | number | null;
  price_band?: string | number | null;
  is_active?: string | number | null;
  area?: string | number | null;
  city?: string | number | null;
  state?: string | number | null;
  country?: string | number | null;
  address?: string | number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  phone?: string | number | null;
  description?: string | number | null;
  monday_open?: string | number | null;
  monday_close?: string | number | null;
  tuesday_open?: string | number | null;
  tuesday_close?: string | number | null;
  wednesday_open?: string | number | null;
  wednesday_close?: string | number | null;
  thursday_open?: string | number | null;
  thursday_close?: string | number | null;
  friday_open?: string | number | null;
  friday_close?: string | number | null;
  saturday_open?: string | number | null;
  saturday_close?: string | number | null;
  sunday_open?: string | number | null;
  sunday_close?: string | number | null;
  dish_1_name?: string | number | null;
  dish_1_description?: string | number | null;
  dish_1_image_url?: string | number | null;
  dish_2_name?: string | number | null;
  dish_2_description?: string | number | null;
  dish_2_image_url?: string | number | null;
  image_url_1?: string | number | null;
  image_sort_order_1?: string | number | null;
  image_url_2?: string | number | null;
  image_sort_order_2?: string | number | null;
};

export type VendorIntakePreviewRow = {
  rowNumber: number;
  vendor_name: string | null;
  slug: string | null;
  category: string | null;
  price_band: string | null;
  address: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  description: string | null;
  is_active: boolean;
  open_days: number;
  featured_dishes: string[];
  image_urls: string[];
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
const adminAnalyticsRanges = new Set<AdminAnalyticsRange>(["24h", "7d", "30d", "all"]);
const adminOperationalLogLevels = new Set<OperationalEventLevel>(["debug", "info", "warn", "error"]);
const adminOperationalLogWindows = new Set<OperationalEventTimeWindow>([
  "1h",
  "24h",
  "7d",
  "30d",
  "all",
]);
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
  fetchImpl?: typeof fetch;
};

function createAdminHeaders(body?: BodyInit | null): HeadersInit {
  const headers: HeadersInit = {
    "x-request-id": crypto.randomUUID(),
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

function validateAdminVendorImageFile(file: File): string | null {
  if (file.size <= 0) {
    return "Image file is empty.";
  }

  if (file.size > maxVendorImageBytes) {
    return "Image must be 5 MB or smaller.";
  }

  if (!vendorImageMimeTypes.has(file.type)) {
    return "Only JPEG, PNG, and WebP images are allowed.";
  }

  return null;
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

  return {
    limit: normalizedLimit,
    cursor: typeof filters.cursor === "string" && filters.cursor.trim().length > 0
      ? filters.cursor
      : undefined,
    offset: normalizedOffset,
    user_role: filters.user_role && adminAuditRoles.has(filters.user_role)
      ? filters.user_role
      : undefined,
    action: filters.action && adminAuditActions.has(filters.action)
      ? filters.action
      : undefined,
    since: typeof filters.since === "string" && filters.since.trim().length > 0
      ? filters.since
      : undefined,
  };
}

function normalizeOperationalLogFilters(
  filters: AdminOperationalLogFilters,
): AdminOperationalLogFilters {
  const normalizedLimit = filters.limit ?? 25;
  const normalizedOffset = filters.offset ?? 0;

  if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1 || normalizedLimit > 25) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "Invalid operational log filters.",
      400,
      { field: "limit", value: filters.limit ?? null },
      "limit must be an integer between 1 and 25.",
    );
  }

  if (!Number.isInteger(normalizedOffset) || normalizedOffset < 0) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "Invalid operational log filters.",
      400,
      { field: "offset", value: filters.offset ?? null },
      "offset must be a non-negative integer.",
    );
  }

  if (filters.level && !adminOperationalLogLevels.has(filters.level)) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "Invalid operational log filters.",
      400,
      { field: "level", value: filters.level },
      "level must be one of debug, info, warn, or error.",
    );
  }

  if (filters.time_window && !adminOperationalLogWindows.has(filters.time_window)) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "Invalid operational log filters.",
      400,
      { field: "time_window", value: filters.time_window },
      "time_window must be one of 1h, 24h, 7d, 30d, or all.",
    );
  }

  const normalizedArea = typeof filters.area === "string" && filters.area.trim()
    ? filters.area.trim()
    : undefined;
  const normalizedEvent = typeof filters.event === "string" && filters.event.trim()
    ? filters.event.trim()
    : undefined;
  const normalizedRoute = typeof filters.route === "string" && filters.route.trim()
    ? filters.route.trim()
    : undefined;

  if (normalizedArea && normalizedArea.length > 80) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "Invalid operational log filters.",
      400,
      { field: "area", value: filters.area },
      "area must be 80 characters or fewer.",
    );
  }

  if (normalizedEvent && normalizedEvent.length > 120) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "Invalid operational log filters.",
      400,
      { field: "event", value: filters.event },
      "event must be 120 characters or fewer.",
    );
  }

  if (normalizedRoute && normalizedRoute.length > 160) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "Invalid operational log filters.",
      400,
      { field: "route", value: filters.route },
      "route must be 160 characters or fewer.",
    );
  }

  return {
    limit: normalizedLimit,
    cursor: typeof filters.cursor === "string" && filters.cursor.trim().length > 0
      ? filters.cursor
      : undefined,
    offset: normalizedOffset,
    level: filters.level,
    area: normalizedArea,
    event: normalizedEvent,
    route: normalizedRoute,
    since: typeof filters.since === "string" && filters.since.trim().length > 0
      ? filters.since
      : undefined,
    time_window: filters.time_window ?? "24h",
  };
}

function normalizeAnalyticsRange(range?: AdminAnalyticsRange): AdminAnalyticsRange {
  const normalizedRange = range ?? "7d";

  if (!adminAnalyticsRanges.has(normalizedRange)) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "Invalid analytics range.",
      400,
      { field: "range", value: range ?? null },
      "range must be one of 24h, 7d, 30d, or all.",
    );
  }

  return normalizedRange;
}

function buildAnalyticsPath(range: AdminAnalyticsRange): string {
  const params = new URLSearchParams();
  appendDefinedParam(params, "range", range);
  return `/api/admin/analytics?${params.toString()}`;
}

function buildAuditLogsPath(filters: AdminAuditLogFilters): string {
  const params = new URLSearchParams();
  appendDefinedParam(params, "limit", filters.limit ?? 10);
  appendDefinedParam(params, "offset", filters.offset ?? 0);
  appendDefinedParam(params, "cursor", filters.cursor);
  appendDefinedParam(params, "user_role", filters.user_role);
  appendDefinedParam(params, "action", filters.action);
  appendDefinedParam(params, "since", filters.since);
  return `/api/admin/audit-logs?${params.toString()}`;
}

function buildOperationalLogsPath(filters: AdminOperationalLogFilters): string {
  const params = new URLSearchParams();
  appendDefinedParam(params, "limit", filters.limit ?? 25);
  appendDefinedParam(params, "offset", filters.offset ?? 0);
  appendDefinedParam(params, "cursor", filters.cursor);
  appendDefinedParam(params, "level", filters.level);
  appendDefinedParam(params, "area", filters.area);
  appendDefinedParam(params, "event", filters.event);
  appendDefinedParam(params, "route", filters.route);
  appendDefinedParam(params, "since", filters.since);
  appendDefinedParam(params, "time_window", filters.time_window ?? "24h");
  return `/api/admin/logs?${params.toString()}`;
}

async function requestAdminApi<T>(
  path: string,
  { fetchImpl = fetch }: AdminApiClientOptions = {},
  init: RequestInit = {},
  hasRetried = false,
): Promise<T> {
  const response = await fetchImpl(path, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...createAdminHeaders(init.body ?? null),
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

    if (!hasRetried && response.status === 401 && code === "UNAUTHORIZED") {
      const refreshed = await fetchImpl("/api/admin/session", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "x-request-id": crypto.randomUUID(),
        },
      }).catch(() => null);

      if (refreshed?.ok) {
        return requestAdminApi<T>(path, { fetchImpl }, init, true);
      }
    }

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
  options: AdminApiClientOptions = {},
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

function invalidatePublicDiscoveryAfterVendorMutation(
  reason: string,
  vendorId: string | null,
): void {
  invalidatePublicDiscoveryVendorCache({
    reason,
    vendorId,
  });
}

export async function listAdminVendors(
  filters: AdminVendorFilters,
  options: AdminApiClientOptions = {},
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
  options: AdminApiClientOptions = {},
): Promise<AdminApiSafeResult<AdminAnalyticsResponseData>> {
  let normalizedRange: AdminAnalyticsRange;

  try {
    normalizedRange = normalizeAnalyticsRange(filters.range);
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
        message: "Invalid analytics range.",
        detail: error instanceof Error ? error.message : undefined,
      },
    };
  }

  return requestAdminApiResult<AdminAnalyticsResponseData>(
    buildAnalyticsPath(normalizedRange),
    options,
  );
}

export async function fetchAdminAuditLogs(
  filters: AdminAuditLogFilters,
  options: AdminApiClientOptions = {},
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

  return requestAdminApiResult<AdminAuditLogListResult>(
    buildAuditLogsPath(normalizedFilters),
    options,
  );
}

export async function fetchAdminOperationalLogs(
  filters: AdminOperationalLogFilters,
  options: AdminApiClientOptions = {},
): Promise<AdminApiSafeResult<AdminOperationalLogListResult>> {
  let normalizedFilters: AdminOperationalLogFilters;

  try {
    normalizedFilters = normalizeOperationalLogFilters(filters);
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
        message: "Invalid operational log filters.",
        detail: error instanceof Error ? error.message : undefined,
      },
    };
  }

  return requestAdminApiResult<AdminOperationalLogListResult>(
    buildOperationalLogsPath(normalizedFilters),
    options,
  );
}

export async function listAdminRiders(
  filters: AdminRidersQuery,
  options: AdminApiClientOptions = {},
): Promise<AdminRiderListResult> {
  const params = new URLSearchParams({
    limit: String(filters.limit ?? 50),
    offset: String(filters.offset ?? 0),
  });
  appendDefinedParam(params, "search", filters.search);
  appendDefinedParam(params, "verification_status", filters.verification_status);
  appendDefinedParam(params, "visibility_status", filters.visibility_status);

  return requestAdminApi<AdminRiderListResult>(
    `/api/admin/riders?${params.toString()}`,
    options,
  );
}

export async function getAdminRider(
  riderId: string,
  options: AdminApiClientOptions = {},
): Promise<AdminRider> {
  const result = await requestAdminApi<{ rider: AdminRider }>(
    `/api/admin/riders/${riderId}`,
    options,
  );

  return result.rider;
}

export async function updateManagedRider(
  riderId: string,
  data: UpdateAdminRiderRequest,
  options: AdminApiClientOptions = {},
): Promise<AdminRider> {
  const result = await requestAdminApi<{ rider: AdminRider }>(
    `/api/admin/riders/${riderId}`,
    options,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );

  return result.rider;
}

export async function listAdminUsers(
  options: AdminApiClientOptions = {},
): Promise<AdminUser[]> {
  const result = await requestAdminApi<{ adminUsers: AdminUser[] }>(
    "/api/admin/admin-users",
    options,
  );

  return (Array.isArray(result.adminUsers) ? result.adminUsers : []).map((row) =>
    adminUserSchema.parse(row)
  );
}

export async function createManagedAdminUser(
  data: CreateAdminUserRequest,
  options: AdminApiClientOptions = {},
): Promise<{ adminUser: AdminUser; outcome: "created" | "existing" }> {
  return requestAdminApi<{ adminUser: AdminUser; outcome: "created" | "existing" }>(
    "/api/admin/create-user",
    options,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function updateManagedAdminUserRole(
  adminUserId: string,
  data: UpdateAdminUserRequest,
  options: AdminApiClientOptions = {},
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
  options: AdminApiClientOptions = {},
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
  data: CreateManagedVendorRequest,
  options: AdminApiClientOptions = {},
): Promise<AdminVendorSummary> {
  const result = await requestAdminApi<{ vendor: AdminVendorSummary }>(
    "/api/admin/vendors",
    options,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  invalidatePublicDiscoveryAfterVendorMutation("vendor_created", result.vendor.id);
  return result.vendor;
}

export async function submitAdminVendorIntake(
  data: {
    action: "preview" | "upload";
    rows: VendorIntakeRowInput[];
  },
  options: AdminApiClientOptions = {},
): Promise<VendorIntakePreviewResult | VendorIntakeUploadResult> {
  const result = await requestAdminApi<VendorIntakePreviewResult | VendorIntakeUploadResult>(
    "/api/admin/vendors/intake",
    options,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  if (data.action === "upload" && "uploadedRows" in result && result.uploadedRows.length > 0) {
    invalidatePublicDiscoveryAfterVendorMutation("vendor_created", null);
  }

  return result;
}

export async function updateAdminVendor(
  vendorId: string,
  data: UpdateVendorRequest,
  options: AdminApiClientOptions = {},
): Promise<AdminVendorSummary> {
  const result = await requestAdminApi<{ vendor: AdminVendorSummary }>(
    `/api/admin/vendors/${vendorId}`,
    options,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );

  invalidatePublicDiscoveryAfterVendorMutation("vendor_updated", result.vendor.id);
  return result.vendor;
}

export async function deactivateAdminVendor(
  vendorId: string,
  options: AdminApiClientOptions = {},
): Promise<{ vendor_id: string; is_active: false }> {
  const result = await requestAdminApi<{
    vendor: { vendor_id: string; is_active: false };
  }>(`/api/admin/vendors/${vendorId}`, options, {
    method: "DELETE",
  });

  invalidatePublicDiscoveryAfterVendorMutation("vendor_deactivated", result.vendor.vendor_id);
  return result.vendor;
}

export async function replaceAdminVendorHours(
  vendorId: string,
  data: ReplaceVendorHoursRequest,
  options: AdminApiClientOptions = {},
): Promise<VendorHours[]> {
  const result = await requestAdminApi<{ hours: VendorHours[] }>(
    `/api/admin/vendors/${vendorId}/hours`,
    options,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  invalidatePublicDiscoveryAfterVendorMutation("vendor_hours_updated", vendorId);
  return result.hours;
}

export async function listAdminVendorHours(
  vendorId: string,
  options: AdminApiClientOptions = {},
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
  options: AdminApiClientOptions = {},
): Promise<VendorImage[]> {
  const fileEntry = data.get("image");

  if (!(fileEntry instanceof File)) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "An image file is required.",
      400,
      { field: "image" },
    );
  }

  const fileValidationError = validateAdminVendorImageFile(fileEntry);

  if (fileValidationError) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      fileValidationError,
      400,
      { field: "image", mime_type: fileEntry.type || null, size: fileEntry.size },
    );
  }

  const sortOrderValue = Number(String(data.get("sort_order") ?? "0"));

  if (!Number.isInteger(sortOrderValue) || sortOrderValue < 0) {
    throw new AdminApiError(
      "VALIDATION_ERROR",
      "Sort order must be a non-negative integer.",
      400,
      { field: "sort_order", value: data.get("sort_order") ?? null },
    );
  }

  const formData = new FormData();
  formData.set("image", fileEntry);
  formData.set("sort_order", String(sortOrderValue));

  const result = await requestAdminApi<{ images: VendorImage[] }>(
    `/api/admin/vendors/${vendorId}/images`,
    options,
    {
      method: "POST",
      body: formData,
    },
  );

  invalidatePublicDiscoveryAfterVendorMutation("vendor_images_updated", vendorId);
  return result.images;
}

export async function listAdminVendorImages(
  vendorId: string,
  options: AdminApiClientOptions = {},
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
  options: AdminApiClientOptions = {},
): Promise<VendorImage> {
  const result = await requestAdminApi<{ image: VendorImage }>(
    `/api/admin/vendors/${vendorId}/images/${imageId}`,
    options,
    {
      method: "DELETE",
    },
  );

  invalidatePublicDiscoveryAfterVendorMutation("vendor_images_updated", vendorId);
  return result.image;
}

export async function createAdminVendorDishes(
  vendorId: string,
  data: CreateVendorDishesRequest,
  options: AdminApiClientOptions = {},
): Promise<VendorFeaturedDish[]> {
  const result = await requestAdminApi<{ dishes: VendorFeaturedDish[] }>(
    `/api/admin/vendors/${vendorId}/dishes`,
    options,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  invalidatePublicDiscoveryAfterVendorMutation("vendor_dishes_updated", vendorId);
  return result.dishes;
}

export async function listAdminVendorDishes(
  vendorId: string,
  options: AdminApiClientOptions = {},
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
  options: AdminApiClientOptions = {},
): Promise<VendorFeaturedDish> {
  const result = await requestAdminApi<{ dish: VendorFeaturedDish }>(
    `/api/admin/vendors/${vendorId}/dishes/${dishId}`,
    options,
    {
      method: "DELETE",
    },
  );

  invalidatePublicDiscoveryAfterVendorMutation("vendor_dishes_updated", vendorId);
  return result.dish;
}

import { createClient } from "@supabase/supabase-js";
import type { ApiResponse } from "../api/responses.ts";
import { AppError } from "../errors/app-error.ts";
import type { AppErrorCode } from "../api/contracts.ts";
import { getCurrentAdminAccessToken } from "./session-client.ts";
import {
  adminUserSchema,
  adminAnalyticsResponseDataSchema,
  auditLogSchema,
} from "../validation/schemas.ts";
import {
  getAuditActionFilterValues,
  normalizeAnalyticsEventType,
  normalizeAuditAction,
  vendorSlugToNameFallback,
} from "./activity-normalization.ts";
import type {
  AdminRole,
  AdminUser,
  AuditActionType,
  AuditLog,
  AdminAnalyticsRange,
  AdminAnalyticsResponseData,
  CreateManagedVendorRequest,
  CreateVendorDishesRequest,
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

export type CreateAdminUserRequest = {
  email: string;
  password: string;
  full_name?: string | null;
  role: AdminRole;
};

const vendorImageBucket = "vendor-images";
const maxVendorImageBytes = 5 * 1024 * 1024;
const vendorImageMimeTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
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
const maxAnalyticsEvents = 1500;
const recentAnalyticsEventsLimit = 25;

type AnalyticsEventRow = {
  id: string;
  event_type: string;
  vendor_id: string | null;
  vendor_slug: string | null;
  page_path?: string | null;
  search_query?: string | null;
  metadata?: Record<string, unknown> | null;
  device_type: string;
  location_source: string | null;
  timestamp: string;
  session_id?: string | null;
};

type VendorLookupRow = {
  id: string;
  name: string;
  slug: string;
};

type AdminApiClientOptions = {
  accessToken: string;
  fetchImpl?: typeof fetch;
};

type AdminClientSupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

async function resolveAdminAccessToken(fallbackToken: string): Promise<string> {
  const liveToken = await getCurrentAdminAccessToken().catch(() => null);
  return liveToken ?? fallbackToken;
}

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

function buildAdminSupabaseClient(options: AdminApiClientOptions) {
  const { supabaseUrl, supabaseAnonKey } = getAdminClientSupabaseConfig();

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: options.fetchImpl,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    accessToken: async () => resolveAdminAccessToken(options.accessToken),
  });
}

async function disposeAdminSupabaseClient(
  client: ReturnType<typeof buildAdminSupabaseClient>,
): Promise<void> {
  await client.removeAllChannels().catch(() => undefined);
  client.realtime.disconnect();
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

function buildClientVendorImageStoragePath(vendorId: string, file: File): string {
  const extension = vendorImageMimeTypes.get(file.type) ?? "bin";
  const sanitizedBaseName = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "vendor-image";

  return `${vendorId}/${crypto.randomUUID()}-${sanitizedBaseName}.${extension}`;
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

function shouldUseDevelopmentAnalyticsFallback(): boolean {
  return process.env.NODE_ENV === "development";
}

function mapDirectSupabaseReadError(error: { code?: string; message?: string } | null | undefined, fallbackMessage: string): AdminApiError {
  const normalizedMessage = error?.message?.toLowerCase() ?? "";
  const errorCode = error?.code === "42501" || normalizedMessage.includes("permission denied")
    ? "FORBIDDEN"
    : error?.code === "PGRST204" || normalizedMessage.includes("could not find")
    ? "INVALID_RESPONSE"
    : "UPSTREAM_ERROR";

  return new AdminApiError(
    errorCode,
    errorCode === "FORBIDDEN" ? "You do not have access to this resource." : fallbackMessage,
    errorCode === "FORBIDDEN" ? 403 : 502,
    error ?? undefined,
    error?.message ?? fallbackMessage,
  );
}

function buildAnalyticsFallbackPath(range: AdminAnalyticsRange): string {
  const params = new URLSearchParams();
  appendDefinedParam(params, "range", range);
  return `/api/admin/analytics?${params.toString()}`;
}

function buildAuditLogsFallbackPath(filters: AdminAuditLogFilters): string {
  const params = new URLSearchParams();
  appendDefinedParam(params, "limit", filters.limit ?? 10);
  appendDefinedParam(params, "offset", filters.offset ?? 0);
  appendDefinedParam(params, "user_role", filters.user_role);
  appendDefinedParam(params, "action", filters.action);
  appendDefinedParam(params, "since", filters.since);
  return `/api/admin/audit-logs?${params.toString()}`;
}

async function fetchAnalyticsViaDevelopmentFallback(
  range: AdminAnalyticsRange,
  options: AdminApiClientOptions,
): Promise<AdminApiSafeResult<AdminAnalyticsResponseData>> {
  return requestAdminApiResult<AdminAnalyticsResponseData>(
    buildAnalyticsFallbackPath(range),
    options,
  );
}

async function fetchAuditLogsViaDevelopmentFallback(
  filters: AdminAuditLogFilters,
  options: AdminApiClientOptions,
): Promise<AdminApiSafeResult<AdminAuditLogListResult>> {
  const result = await requestAdminApiResult<{
    auditLogs: AuditLog[];
    pagination: { limit: number; offset: number; has_more: boolean };
  }>(
    buildAuditLogsFallbackPath(filters),
    options,
  );

  if (result.error) {
    return result;
  }

  const rows = Array.isArray(result.data.auditLogs) ? result.data.auditLogs : [];
  const nextCursor = rows.length > 0 && result.data.pagination.has_more
    ? rows[rows.length - 1]?.created_at ?? null
    : null;

  return {
    data: {
      auditLogs: rows,
      pagination: {
        limit: result.data.pagination.limit,
        has_more: result.data.pagination.has_more,
        next_cursor: nextCursor,
      },
    },
    error: null,
  };
}

async function fetchAnalyticsEventRows(
  supabase: ReturnType<typeof buildAdminSupabaseClient>,
  rangeStart: string | null,
): Promise<{ rows: AnalyticsEventRow[]; sessionIdAvailable: boolean }> {
  const baseSelect =
    "id,event_type,vendor_id,vendor_slug,page_path,search_query,metadata,timestamp,device_type,location_source";

  const runQuery = async (includeSessionId: boolean) => {
    let query = supabase
      .from("user_events")
      .select(includeSessionId ? `${baseSelect},session_id` : baseSelect)
      .order("timestamp", { ascending: false })
      .limit(maxAnalyticsEvents);

    if (rangeStart) {
      query = query.gte("timestamp", rangeStart);
    }

    return query;
  };

  const initialResult = await runQuery(true);

  if (initialResult.error && isMissingSessionIdColumn(initialResult.error.message)) {
    const fallbackResult = await runQuery(false);

    if (fallbackResult.error) {
      throw fallbackResult.error;
    }

    return {
      rows: Array.isArray(fallbackResult.data) ? fallbackResult.data as unknown as AnalyticsEventRow[] : [],
      sessionIdAvailable: false,
    };
  }

  if (initialResult.error) {
    throw initialResult.error;
  }

  return {
    rows: Array.isArray(initialResult.data) ? initialResult.data as unknown as AnalyticsEventRow[] : [],
    sessionIdAvailable: true,
  };
}

function getAnalyticsRangeStart(range: AdminAnalyticsRange): string | null {
  const now = Date.now();

  switch (range) {
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "all":
      return null;
  }
}

function countEventType(rows: AnalyticsEventRow[], eventType: string): number {
  const expected = normalizeAnalyticsEventType(eventType);
  return rows.filter((row) => normalizeAnalyticsEventType(row.event_type) === expected).length;
}

function isMissingSessionIdColumn(detail: string | undefined): boolean {
  return typeof detail === "string" && detail.toLowerCase().includes("session_id");
}

function getVendorAggregateKey(row: AnalyticsEventRow): string | null {
  if (typeof row.vendor_id === "string" && row.vendor_id.length > 0) {
    return `id:${row.vendor_id}`;
  }

  if (typeof row.vendor_slug === "string" && row.vendor_slug.length > 0) {
    return `slug:${row.vendor_slug}`;
  }

  return null;
}

function getTopVendorKeys(
  rows: AnalyticsEventRow[],
  eventTypes: string[],
  limit = 5,
): string[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = getVendorAggregateKey(row);

    if (!key || !eventTypes.includes(normalizeAnalyticsEventType(row.event_type))) {
      continue;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([vendorKey]) => vendorKey);
}

function rankVendorEvents(
  rows: AnalyticsEventRow[],
  eventTypes: string[],
  vendorLookup: Map<string, VendorLookupRow>,
) {
  const counts = new Map<string, { count: number; vendorId: string | null; vendorSlug: string | null }>();

  for (const row of rows) {
    const key = getVendorAggregateKey(row);

    if (!key || !eventTypes.includes(normalizeAnalyticsEventType(row.event_type))) {
      continue;
    }

    const current = counts.get(key);
    counts.set(key, {
      count: (current?.count ?? 0) + 1,
      vendorId: row.vendor_id ?? current?.vendorId ?? null,
      vendorSlug: row.vendor_slug ?? current?.vendorSlug ?? null,
    });
  }

  return [...counts.entries()]
    .map(([, value]) => {
      const vendor = value.vendorId ? vendorLookup.get(value.vendorId) : null;

      return {
        vendor_id: value.vendorId,
        vendor_name: vendor?.name ?? vendorSlugToNameFallback(value.vendorSlug),
        vendor_slug: vendor?.slug ?? value.vendorSlug,
        count: value.count,
      };
    })
    .sort((left, right) => right.count - left.count || (left.vendor_name ?? "").localeCompare(right.vendor_name ?? ""))
    .slice(0, 5);
}

function buildDropoffSummary(
  rows: AnalyticsEventRow[],
  sessionIdAvailable: boolean,
) {
  const meaningfulInteractionEvents = new Set([
    "vendor_selected",
    "vendor_detail_opened",
    "call_clicked",
    "directions_clicked",
    "search_used",
    "filter_applied",
  ]);
  const sessionRows = rows.filter((row) => typeof row.session_id === "string" && row.session_id.length > 0);

  if (!sessionIdAvailable || sessionRows.length === 0) {
    return {
      session_metrics_available: false,
      sessions_without_meaningful_interaction: null,
      sessions_with_search_without_vendor_click: null,
      sessions_with_detail_without_action: null,
    };
  }

  const sessions = new Map<string, AnalyticsEventRow[]>();

  for (const row of sessionRows) {
    const sessionId = row.session_id as string;
    const bucket = sessions.get(sessionId) ?? [];
    bucket.push(row);
    sessions.set(sessionId, bucket);
  }

  let noMeaningfulInteraction = 0;
  let searchWithoutVendorClick = 0;
  let detailWithoutAction = 0;

  for (const sessionEvents of sessions.values()) {
    const eventTypes = new Set(
      sessionEvents.map((row) => normalizeAnalyticsEventType(row.event_type)),
    );
    const hasMeaningfulInteraction = [...eventTypes].some((eventType) =>
      meaningfulInteractionEvents.has(eventType)
    );

    if (!hasMeaningfulInteraction) {
      noMeaningfulInteraction += 1;
    }

    if (eventTypes.has("search_used") && !eventTypes.has("vendor_selected")) {
      searchWithoutVendorClick += 1;
    }

    if (
      eventTypes.has("vendor_detail_opened") &&
      !eventTypes.has("call_clicked") &&
      !eventTypes.has("directions_clicked")
    ) {
      detailWithoutAction += 1;
    }
  }

  return {
    session_metrics_available: true,
    sessions_without_meaningful_interaction: noMeaningfulInteraction,
    sessions_with_search_without_vendor_click: searchWithoutVendorClick,
    sessions_with_detail_without_action: detailWithoutAction,
  };
}

async function requestAdminApi<T>(
  path: string,
  { accessToken, fetchImpl = fetch }: AdminApiClientOptions,
  init: RequestInit = {},
): Promise<T> {
  const resolvedAccessToken = await resolveAdminAccessToken(accessToken);

  if (!resolvedAccessToken) {
    throw new AdminApiError(
      "UNAUTHORIZED",
      "Admin session is missing. Sign in again.",
      401,
      undefined,
      "No Supabase access token is available for this admin request.",
    );
  }

  const response = await fetchImpl(path, {
    ...init,
    headers: {
      ...createAdminHeaders(resolvedAccessToken, init.body ?? null),
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

  try {
    const supabase = buildAdminSupabaseClient(options);
    try {
      const rangeStart = getAnalyticsRangeStart(normalizedRange);
      let eventResult: { rows: AnalyticsEventRow[]; sessionIdAvailable: boolean };

      try {
        eventResult = await fetchAnalyticsEventRows(supabase, rangeStart);
      } catch (error) {
        const supabaseError = error as { code?: string; message?: string };
        const normalizedMessage = String(supabaseError?.message ?? "").toLowerCase();
        const errorCode = supabaseError?.code === "42501" || normalizedMessage.includes("permission denied")
          ? "FORBIDDEN"
          : normalizedMessage.includes("jwt") || normalizedMessage.includes("auth")
            ? "UNAUTHORIZED"
            : "UPSTREAM_ERROR";

        if (shouldUseDevelopmentAnalyticsFallback()) {
          return fetchAnalyticsViaDevelopmentFallback(normalizedRange, options);
        }

        return {
          data: null,
          error: {
            code: errorCode,
            message: errorCode === "FORBIDDEN"
              ? "You do not have access to analytics"
              : errorCode === "UNAUTHORIZED"
                ? "Admin session expired. Sign in again."
                : "Activity temporarily unavailable.",
            detail: supabaseError?.message,
          },
        };
      }

      const rows = eventResult.rows;
      const recentVendorIds = rows
        .slice(0, recentAnalyticsEventsLimit)
        .flatMap((row) => (row.vendor_id ? [row.vendor_id] : []));
      const rankedVendorKeys = [
        ...getTopVendorKeys(rows, ["vendor_selected"]),
        ...getTopVendorKeys(rows, ["vendor_detail_opened"]),
        ...getTopVendorKeys(rows, ["call_clicked"]),
        ...getTopVendorKeys(rows, ["directions_clicked"]),
      ];
      const vendorIds = [...new Set([
        ...recentVendorIds,
        ...rankedVendorKeys
          .filter((key) => key.startsWith("id:"))
          .map((key) => key.slice(3)),
      ])];
      let vendorLookup = new Map<string, VendorLookupRow>();

      if (vendorIds.length > 0) {
        const vendorResult = await supabase
          .from("vendors")
          .select("id,name,slug")
          .in("id", vendorIds);

        if (vendorResult.error) {
          if (shouldUseDevelopmentAnalyticsFallback()) {
            return fetchAnalyticsViaDevelopmentFallback(normalizedRange, options);
          }

          return {
            data: null,
            error: {
              code: "UPSTREAM_ERROR",
              message: "Activity temporarily unavailable.",
              detail: vendorResult.error.message,
            },
          };
        }

        vendorLookup = new Map(
          (vendorResult.data ?? []).map((vendor) => [vendor.id, vendor as VendorLookupRow]),
        );
      }

      const sessionIds = new Set(
        rows.flatMap((row) =>
          typeof row.session_id === "string" && row.session_id.length > 0 ? [row.session_id] : []
        ),
      );
      const recentEvents = rows.slice(0, recentAnalyticsEventsLimit).map((row) => {
        const vendor = row.vendor_id ? vendorLookup.get(row.vendor_id) : null;
        const normalizedEventType = normalizeAnalyticsEventType(row.event_type);

        return {
          id: row.id,
          event_type: normalizedEventType,
          vendor_id: row.vendor_id ?? null,
          vendor_name: vendor?.name ?? vendorSlugToNameFallback(row.vendor_slug),
          vendor_slug: vendor?.slug ?? row.vendor_slug ?? null,
          device_type: row.device_type === "mobile" || row.device_type === "tablet" || row.device_type === "desktop"
            ? row.device_type
            : "unknown",
          location_source:
            row.location_source === "precise" ||
            row.location_source === "approximate" ||
            row.location_source === "default_city"
              ? row.location_source
              : null,
          timestamp: row.timestamp,
        };
      });

      const payload = adminAnalyticsResponseDataSchema.safeParse({
        range: normalizedRange,
        summary: {
          total_sessions: sessionIds.size > 0 ? sessionIds.size : countEventType(rows, "session_started"),
          total_events: rows.length,
          vendor_selections: countEventType(rows, "vendor_selected"),
          vendor_detail_opens: countEventType(rows, "vendor_detail_opened"),
          call_clicks: countEventType(rows, "call_clicked"),
          directions_clicks: countEventType(rows, "directions_clicked"),
          searches_used: countEventType(rows, "search_used"),
          filters_applied: countEventType(rows, "filter_applied"),
        },
        vendor_performance: {
          most_selected_vendors: rankVendorEvents(rows, ["vendor_selected"], vendorLookup),
          most_viewed_vendor_details: rankVendorEvents(rows, ["vendor_detail_opened"], vendorLookup),
          most_call_clicks: rankVendorEvents(rows, ["call_clicked"], vendorLookup),
          most_directions_clicks: rankVendorEvents(rows, ["directions_clicked"], vendorLookup),
        },
        dropoff: buildDropoffSummary(rows, eventResult.sessionIdAvailable),
        recent_events: recentEvents,
      });

      if (!payload.success) {
        return {
          data: null,
          error: {
            code: "INVALID_RESPONSE",
            message: "Activity temporarily unavailable.",
            detail: "Supabase returned an unexpected analytics payload.",
          },
        };
      }

      return {
        data: payload.data,
        error: null,
      };
    } finally {
      await disposeAdminSupabaseClient(supabase);
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      if (shouldUseDevelopmentAnalyticsFallback()) {
        return fetchAnalyticsViaDevelopmentFallback(normalizedRange, options);
      }

      return {
        data: null,
        error: {
          code: error.code,
          message: error.message,
          detail: error.detail ?? undefined,
        },
      };
    }

    if (shouldUseDevelopmentAnalyticsFallback()) {
      return fetchAnalyticsViaDevelopmentFallback(normalizedRange, options);
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
    const pageSize = Math.min(normalizedFilters.limit ?? 10, 10);
    const supabase = buildAdminSupabaseClient(options);
    try {

    let query = supabase
      .from("audit_logs")
      .select("id,admin_user_id,user_role,entity_type,entity_id,action,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(pageSize + 1);

    if (normalizedFilters.cursor) {
      query = query.lt("created_at", normalizedFilters.cursor);
    }

    if (normalizedFilters.user_role) {
      query = query.eq("user_role", normalizedFilters.user_role);
    }

    if (normalizedFilters.action) {
      const actionValues = getAuditActionFilterValues(normalizedFilters.action);
      query = actionValues.length > 1
        ? query.in("action", actionValues)
        : query.eq("action", actionValues[0] ?? normalizedFilters.action);
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

      if (shouldUseDevelopmentAnalyticsFallback()) {
        return fetchAuditLogsViaDevelopmentFallback(normalizedFilters, options);
      }

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

    const normalizedRows = Array.isArray(data)
      ? data.map((row) => {
        const candidate = row as Partial<AuditLog> | null;
        const normalizedAction = normalizeAuditAction(
          typeof candidate?.action === "string" ? candidate.action : null,
        );

        return {
          id: typeof candidate?.id === "string" ? candidate.id : "",
          admin_user_id: typeof candidate?.admin_user_id === "string" ? candidate.admin_user_id : null,
          user_role: candidate?.user_role,
          entity_type: candidate?.entity_type,
          entity_id: typeof candidate?.entity_id === "string" ? candidate.entity_id : null,
          action: normalizedAction,
          metadata:
            candidate?.metadata && typeof candidate.metadata === "object" && !Array.isArray(candidate.metadata)
              ? candidate.metadata as Record<string, unknown>
              : {},
          created_at: typeof candidate?.created_at === "string" ? candidate.created_at : "",
        };
      }).filter((row) => row.action !== null)
      : [];
    const parsed = auditLogSchema.array().safeParse(normalizedRows);

    if (!parsed.success) {
      if (shouldUseDevelopmentAnalyticsFallback()) {
        return fetchAuditLogsViaDevelopmentFallback(normalizedFilters, options);
      }

      return {
        data: null,
        error: {
          code: "INVALID_RESPONSE",
          message: "Activity temporarily unavailable.",
          detail: "Supabase returned an unexpected audit log payload.",
        },
      };
    }

    const pageRows = parsed.data.slice(0, pageSize);
    const nextCursor = pageRows.length > 0
      ? pageRows[pageRows.length - 1]?.created_at ?? null
      : null;

    return {
      data: {
        auditLogs: pageRows,
        pagination: {
          limit: pageSize,
          has_more: parsed.data.length > pageSize,
          next_cursor: parsed.data.length > pageSize ? nextCursor : null,
        },
      },
      error: null,
    };
    } finally {
      await disposeAdminSupabaseClient(supabase);
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      if (shouldUseDevelopmentAnalyticsFallback()) {
        return fetchAuditLogsViaDevelopmentFallback(normalizedFilters, options);
      }

      return {
        data: null,
        error: {
          code: error.code,
          message: error.message,
          detail: error.detail ?? undefined,
        },
      };
    }

    if (shouldUseDevelopmentAnalyticsFallback()) {
      return fetchAuditLogsViaDevelopmentFallback(normalizedFilters, options);
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
  const client = buildAdminSupabaseClient(options);

  try {
    const response = await client
      .from("admin_users")
      .select("id,email,full_name,role,created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (response.error) {
      throw mapDirectSupabaseReadError(response.error, "Unable to load admin users.");
    }

    return (response.data ?? []).map((row) => adminUserSchema.parse(row));
  } finally {
    await disposeAdminSupabaseClient(client);
  }
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
  data: CreateManagedVendorRequest,
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

  const supabase = buildAdminSupabaseClient(options);

  try {
    const storageObjectPath = buildClientVendorImageStoragePath(vendorId, fileEntry);
    const uploadResult = await supabase.storage
      .from(vendorImageBucket)
      .upload(storageObjectPath, fileEntry, {
        contentType: fileEntry.type,
        upsert: true,
      });

    if (uploadResult.error) {
      console.error("UPLOAD ERROR:", uploadResult.error);
      throw new AdminApiError(
        uploadResult.error.message.toLowerCase().includes("permission")
          ? "FORBIDDEN"
          : "UPSTREAM_ERROR",
        "Unable to upload vendor image.",
        uploadResult.error.message.toLowerCase().includes("permission") ? 403 : 502,
        {
          bucket: vendorImageBucket,
          path: storageObjectPath,
        },
        uploadResult.error.message,
      );
    }

    const publicUrlResult = supabase.storage
      .from(vendorImageBucket)
      .getPublicUrl(storageObjectPath);
    const publicUrl = publicUrlResult.data.publicUrl;

    try {
      const result = await requestAdminApi<{ images: VendorImage[] }>(
        `/api/admin/vendors/${vendorId}/images`,
        options,
        {
          method: "POST",
          body: JSON.stringify({
            images: [
              {
                image_url: publicUrl,
                storage_object_path: storageObjectPath,
                sort_order: sortOrderValue,
              },
            ],
          }),
        },
      );

      return result.images;
    } catch (error) {
      await supabase.storage.from(vendorImageBucket).remove([storageObjectPath]);
      throw error;
    }
  } finally {
    await disposeAdminSupabaseClient(supabase);
  }
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

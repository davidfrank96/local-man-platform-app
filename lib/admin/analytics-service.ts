import {
  adminAnalyticsResponseDataSchema,
} from "../validation/schemas.ts";
import {
  normalizeAnalyticsEventType,
  vendorSlugToNameFallback,
} from "./activity-normalization.ts";
import {
  getAdminAuthConfig,
  type AdminAuthConfig,
  type AdminSession,
} from "./auth.ts";
import { AdminServiceError } from "./errors.ts";
import { logStructuredEvent } from "../observability.ts";
import type {
  AdminAnalyticsRange,
  AdminAnalyticsResponseData,
} from "../../types/index.ts";

type AdminAnalyticsServiceContext = {
  session: AdminSession;
  config?: AdminAuthConfig | null;
  fetchImpl?: typeof fetch;
};

type AdminAnalyticsResolvedContext = {
  session: AdminSession;
  config: AdminAuthConfig;
  fetchImpl: typeof fetch;
};

type AnalyticsEventRow = {
  id: string;
  event_type: string;
  vendor_id: string | null;
  vendor_slug: string | null;
  page_path: string;
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

const MAX_ANALYTICS_EVENTS = 1500;
const RECENT_EVENTS_LIMIT = 25;
const analyticsCacheTtlMs = 30_000;
const analyticsQueryWarnThresholdMs = 3_000;
const analyticsFetchTimeoutMs = 4_000;
const meaningfulInteractionEvents = new Set([
  "vendor_selected",
  "vendor_detail_opened",
  "call_clicked",
  "directions_clicked",
  "search_used",
  "filter_applied",
]);

type CachedAnalyticsResult = {
  expiresAt: number;
  payload: AdminAnalyticsResponseData;
};

const adminAnalyticsCache = new Map<AdminAnalyticsRange, CachedAnalyticsResult>();

export function clearAdminAnalyticsCache(): void {
  adminAnalyticsCache.clear();
}

function requireServiceConfig(
  config: AdminAuthConfig | null | undefined,
): AdminAuthConfig {
  if (!config) {
    throw new AdminServiceError(
      "CONFIGURATION_ERROR",
      "Supabase environment variables are required for admin analytics.",
      503,
    );
  }

  return config;
}

function createRestUrl(
  config: AdminAuthConfig,
  table: string,
  filters: Record<string, string> = {},
): URL {
  const url = new URL(`/rest/v1/${table}`, config.supabaseUrl);

  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }

  return url;
}

function requireReadServiceRoleKey(config: AdminAuthConfig): string {
  const serviceRoleKey = config.supabaseServiceRoleKey?.trim() || "";

  if (!serviceRoleKey) {
    throw new AdminServiceError(
      "CONFIGURATION_ERROR",
      "SUPABASE_SERVICE_ROLE_KEY is required for admin analytics reads.",
      503,
      { missing: "SUPABASE_SERVICE_ROLE_KEY" },
    );
  }

  return serviceRoleKey;
}

function createHeaders(session: AdminSession, config: AdminAuthConfig): HeadersInit {
  const serviceRoleKey = requireReadServiceRoleKey(config);

  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readCachedAnalytics(range: AdminAnalyticsRange): AdminAnalyticsResponseData | null {
  const cached = adminAnalyticsCache.get(range);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    adminAnalyticsCache.delete(range);
    return null;
  }

  return cached.payload;
}

function writeCachedAnalytics(range: AdminAnalyticsRange, payload: AdminAnalyticsResponseData): void {
  adminAnalyticsCache.set(range, {
    expiresAt: Date.now() + analyticsCacheTtlMs,
    payload,
  });
}

function isMissingSessionIdColumn(details: unknown): boolean {
  const text = JSON.stringify(details ?? {});
  return text.includes("session_id");
}

function getRangeStart(range: AdminAnalyticsRange): string | null {
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

async function fetchEventRows(
  {
    session,
    config,
    fetchImpl,
  }: AdminAnalyticsResolvedContext,
  range: AdminAnalyticsRange,
  includeSessionId: boolean,
): Promise<{ rows: AnalyticsEventRow[]; sessionIdAvailable: boolean }> {
  const selectFields = [
    "id",
    "event_type",
    "vendor_id",
    "vendor_slug",
    "page_path",
    "device_type",
    "location_source",
    "timestamp",
    ...(includeSessionId ? ["session_id"] : []),
  ];
  const filters: Record<string, string> = {
    select: selectFields.join(","),
    order: "timestamp.desc",
    limit: String(MAX_ANALYTICS_EVENTS),
  };
  const rangeStart = getRangeStart(range);

  if (rangeStart) {
    filters.timestamp = `gte.${rangeStart}`;
  }

  const url = createRestUrl(config, "user_events", filters);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort("ANALYTICS_EVENTS_TIMEOUT");
  }, analyticsFetchTimeoutMs);
  const startedAt = Date.now();
  let response: Response;

  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: createHeaders(session, config),
      signal: controller.signal,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || controller.signal.aborted)
    ) {
      throw new AdminServiceError(
        "NETWORK_ERROR",
        "Analytics event query timed out.",
        504,
        { timeoutMs: analyticsFetchTimeoutMs },
        "Activity temporarily unavailable.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const durationMs = Date.now() - startedAt;
  if (durationMs > analyticsQueryWarnThresholdMs) {
    logStructuredEvent("warn", {
      type: "ANALYTICS_EVENTS_SLOW_QUERY",
      requestId: session.requestId,
      range,
      durationMs,
      url: url.toString(),
    });
  }
  const payload = await readJson(response);

  if (!response.ok) {
    if (includeSessionId && isMissingSessionIdColumn(payload)) {
      return fetchEventRows({ session, config, fetchImpl }, range, false);
    }

    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Unable to load analytics events.",
      502,
      payload,
    );
  }

  if (!Array.isArray(payload)) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Analytics event payload was malformed.",
      502,
      payload,
    );
  }

  return {
    rows: payload as AnalyticsEventRow[],
    sessionIdAvailable: includeSessionId,
  };
}

async function fetchVendorLookup(
  {
    session,
    config,
    fetchImpl,
  }: AdminAnalyticsResolvedContext,
  vendorIds: string[],
): Promise<Map<string, VendorLookupRow>> {
  if (vendorIds.length === 0) {
    return new Map();
  }

  const url = createRestUrl(config, "vendors", {
      select: "id,name,slug",
      id: `in.(${vendorIds.join(",")})`,
    });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort("ANALYTICS_VENDOR_LOOKUP_TIMEOUT");
  }, analyticsFetchTimeoutMs);
  const startedAt = Date.now();

  let response: Response;

  try {
    response = await fetchImpl(
      url,
      {
      method: "GET",
      headers: createHeaders(session, config),
      signal: controller.signal,
    },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || controller.signal.aborted)
    ) {
      throw new AdminServiceError(
        "NETWORK_ERROR",
        "Vendor lookup for analytics timed out.",
        504,
        { timeoutMs: analyticsFetchTimeoutMs },
        "Activity temporarily unavailable.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const durationMs = Date.now() - startedAt;
  if (durationMs > analyticsQueryWarnThresholdMs) {
    logStructuredEvent("warn", {
      type: "ANALYTICS_VENDOR_LOOKUP_SLOW_QUERY",
      requestId: session.requestId,
      durationMs,
      vendorCount: vendorIds.length,
      url: url.toString(),
    });
  }
  const payload = await readJson(response);

  if (!response.ok) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Unable to load vendor names for analytics.",
      502,
      payload,
    );
  }

  if (!Array.isArray(payload)) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Vendor lookup payload was malformed.",
      502,
      payload,
    );
  }

  return new Map(
    (payload as VendorLookupRow[]).map((vendor) => [vendor.id, vendor]),
  );
}

function countEventType(rows: AnalyticsEventRow[], eventType: string): number {
  const expected = normalizeAnalyticsEventType(eventType);
  return rows.filter((row) => normalizeAnalyticsEventType(row.event_type) === expected).length;
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
    const eventTypes = new Set(sessionEvents.map((row) => normalizeAnalyticsEventType(row.event_type)));
    const hasMeaningfulInteraction = [...eventTypes].some((eventType) =>
      meaningfulInteractionEvents.has(eventType),
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

export async function getAdminAnalytics(
  range: AdminAnalyticsRange,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminAnalyticsServiceContext,
): Promise<AdminAnalyticsResponseData> {
  const cached = readCachedAnalytics(range);

  if (cached) {
    logStructuredEvent("info", {
      type: "ANALYTICS_CACHE_HIT",
      requestId: session.requestId,
      range,
      resultCount: cached.summary.total_events,
    });
    return cached;
  }

  const resolvedConfig = requireServiceConfig(config);
  const startedAt = Date.now();
  const eventResult = await fetchEventRows(
    {
      session,
      config: resolvedConfig,
      fetchImpl,
    },
    range,
    true,
  );
  const rows = [...eventResult.rows].sort(
    (left, right) => new Date(right.timestamp).valueOf() - new Date(left.timestamp).valueOf(),
  );
  const recentVendorIds = rows
    .slice(0, RECENT_EVENTS_LIMIT)
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
  const vendorLookup = await fetchVendorLookup(
    {
      session,
      config: resolvedConfig,
      fetchImpl,
    },
    vendorIds,
  );
  const sessionIds = new Set(
    rows.flatMap((row) =>
      typeof row.session_id === "string" && row.session_id.length > 0 ? [row.session_id] : [],
    ),
  );
  const recentEvents = rows.slice(0, RECENT_EVENTS_LIMIT).map((row) => {
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

  const payload = {
    range,
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
  };

  const parsedPayload = adminAnalyticsResponseDataSchema.parse(payload);
  writeCachedAnalytics(range, parsedPayload);

  const durationMs = Date.now() - startedAt;
  logStructuredEvent("info", {
    type: "ANALYTICS_FETCH",
    requestId: session.requestId,
    range,
    resultCount: rows.length,
    vendorCount: vendorIds.length,
    recentEventCount: recentEvents.length,
    durationMs,
    supabaseHost: new URL(resolvedConfig.supabaseUrl).host,
    usingServiceRole: true,
  });

  if (durationMs > analyticsQueryWarnThresholdMs) {
    logStructuredEvent("warn", {
      type: "ANALYTICS_SLOW_REQUEST",
      requestId: session.requestId,
      range,
      durationMs,
      resultCount: rows.length,
      vendorCount: vendorIds.length,
    });
  }

  return parsedPayload;
}

import { z } from "zod";
import { formatZodIssues } from "../errors/app-error.ts";
import {
  adminOperationalLogsQuerySchema,
  operationalEventSchema,
} from "../validation/schemas.ts";
import {
  getAdminAuthConfig,
  type AdminAuthConfig,
  type AdminSession,
} from "./auth.ts";
import { AdminServiceError } from "./errors.ts";
import {
  logStructuredEvent,
  sanitizeLogMetadata,
} from "../observability.ts";
import type { OperationalEventTimeWindow } from "../../types/index.ts";

type OperationalLogServiceContext = {
  session: AdminSession;
  config?: AdminAuthConfig | null;
  fetchImpl?: typeof fetch;
};

type OperationalLogsQuery = z.infer<typeof adminOperationalLogsQuerySchema>;

export type OperationalLogListResult = {
  operationalEvents: Array<z.infer<typeof operationalEventSchema>>;
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
    next_cursor: string | null;
  };
};

type CachedOperationalLogResult = {
  expiresAt: number;
  result: OperationalLogListResult;
};

const operationalLogsCacheTtlMs = 15_000;
const operationalLogsTimeoutMs = 4_000;
const maxOperationalLogsPageSize = 25;
const operationalLogsReadCache = new Map<string, CachedOperationalLogResult>();

const timeWindowDurationsMs: Record<Exclude<OperationalEventTimeWindow, "all">, number> = {
  "1h": 60 * 60 * 1_000,
  "24h": 24 * 60 * 60 * 1_000,
  "7d": 7 * 24 * 60 * 60 * 1_000,
  "30d": 30 * 24 * 60 * 60 * 1_000,
};

export function clearOperationalLogsReadCache(): void {
  operationalLogsReadCache.clear();
}

function requireServiceConfig(
  config: AdminAuthConfig | null | undefined,
): AdminAuthConfig {
  if (!config) {
    throw new AdminServiceError(
      "CONFIGURATION_ERROR",
      "Supabase environment variables are required for admin operational log reads.",
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

function createReadHeaders(
  config: AdminAuthConfig,
  prefer = "count=exact",
): HeadersInit {
  const serviceRoleKey = config.supabaseServiceRoleKey?.trim() || "";

  if (!serviceRoleKey) {
    throw new AdminServiceError(
      "CONFIGURATION_ERROR",
      "SUPABASE_SERVICE_ROLE_KEY is required for admin operational log reads.",
      503,
      { missing: "SUPABASE_SERVICE_ROLE_KEY" },
    );
  }

  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    ...(prefer ? { prefer } : {}),
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function createOperationalLogCacheKey(query: OperationalLogsQuery): string {
  return JSON.stringify({
    limit: query.limit ?? 25,
    offset: query.offset ?? 0,
    level: query.level ?? null,
    area: query.area ?? null,
    event: query.event ?? null,
    route: query.route ?? null,
    since: query.since ?? null,
    time_window: query.time_window ?? null,
  });
}

function readCachedOperationalLogs(query: OperationalLogsQuery): OperationalLogListResult | null {
  const cached = operationalLogsReadCache.get(createOperationalLogCacheKey(query));

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    operationalLogsReadCache.delete(createOperationalLogCacheKey(query));
    return null;
  }

  return cached.result;
}

function writeCachedOperationalLogs(query: OperationalLogsQuery, result: OperationalLogListResult): void {
  operationalLogsReadCache.set(createOperationalLogCacheKey(query), {
    expiresAt: Date.now() + operationalLogsCacheTtlMs,
    result,
  });
}

function sanitizeLikeFilter(value: string): string {
  return value.replaceAll(/[%*(),]/g, "").trim();
}

function resolveSinceFilter(query: OperationalLogsQuery): string | null {
  if (query.since) {
    return query.since;
  }

  if (!query.time_window || query.time_window === "all") {
    return null;
  }

  const durationMs = timeWindowDurationsMs[query.time_window];
  return new Date(Date.now() - durationMs).toISOString();
}

function parseOperationalEvents(payload: unknown): Array<z.infer<typeof operationalEventSchema>> {
  const normalizedPayload = Array.isArray(payload)
    ? payload.map((row) => {
      const candidate = row as Record<string, unknown> | null;
      const metadata =
        candidate?.metadata && typeof candidate.metadata === "object" && !Array.isArray(candidate.metadata)
          ? (sanitizeLogMetadata(candidate.metadata) ?? {})
          : {};

      return {
        id: candidate?.id,
        created_at: candidate?.created_at,
        level: candidate?.level,
        area: candidate?.area,
        event: candidate?.event,
        message: candidate?.message ?? null,
        route: candidate?.route ?? null,
        method: candidate?.method ?? null,
        status: candidate?.status ?? null,
        duration_ms: candidate?.duration_ms ?? null,
        request_id: candidate?.request_id ?? null,
        actor_role: candidate?.actor_role ?? null,
        actor_id: candidate?.actor_id ?? null,
        vendor_id: candidate?.vendor_id ?? null,
        vendor_slug: candidate?.vendor_slug ?? null,
        environment: candidate?.environment ?? null,
        metadata,
      };
    })
    : payload;
  const parsed = z.array(operationalEventSchema).safeParse(normalizedPayload);

  if (!parsed.success) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Supabase returned an unexpected operational log payload.",
      502,
      { issues: parsed.error.issues },
    );
  }

  return parsed.data;
}

export async function listOperationalLogs(
  query: OperationalLogsQuery,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: OperationalLogServiceContext,
): Promise<OperationalLogListResult> {
  const resolvedConfig = requireServiceConfig(config);
  const validatedQuery = adminOperationalLogsQuerySchema.safeParse(query);

  if (!validatedQuery.success) {
    throw new AdminServiceError(
      "VALIDATION_ERROR",
      "Invalid operational log filters.",
      400,
      { issues: formatZodIssues(validatedQuery.error) },
      "One or more operational log filters were invalid.",
    );
  }

  const cacheableQuery = validatedQuery.data;
  const cachedResult = readCachedOperationalLogs(cacheableQuery);

  if (cachedResult) {
    logStructuredEvent("info", {
      type: "OPERATIONAL_LOGS_CACHE_HIT",
      requestId: session.requestId,
      query: cacheableQuery,
      resultCount: cachedResult.operationalEvents.length,
    });
    return cachedResult;
  }

  const limit = cacheableQuery.limit ?? 25;
  const offset = cacheableQuery.offset ?? 0;
  const pageSize = Math.min(limit, maxOperationalLogsPageSize);
  const url = createRestUrl(resolvedConfig, "operational_events", {
    select:
      "id,created_at,level,area,event,message,route,method,status,duration_ms,request_id,actor_role,actor_id,vendor_id,vendor_slug,environment,metadata",
    order: "created_at.desc",
    limit: String(pageSize + 1),
    offset: String(offset),
  });

  if (cacheableQuery.level) {
    url.searchParams.set("level", `eq.${cacheableQuery.level}`);
  }

  if (cacheableQuery.area) {
    url.searchParams.set("area", `eq.${cacheableQuery.area}`);
  }

  if (cacheableQuery.event) {
    const value = sanitizeLikeFilter(cacheableQuery.event);
    if (value) {
      url.searchParams.set("event", `ilike.*${value}*`);
    }
  }

  if (cacheableQuery.route) {
    const value = sanitizeLikeFilter(cacheableQuery.route);
    if (value) {
      url.searchParams.set("route", `ilike.*${value}*`);
    }
  }

  const since = resolveSinceFilter(cacheableQuery);
  if (since) {
    url.searchParams.set("created_at", `gte.${since}`);
  }

  logStructuredEvent("info", {
    type: "OPERATIONAL_LOGS_SUPABASE_REQUEST",
    requestId: session.requestId,
    query: cacheableQuery,
    supabaseUrl: url.toString(),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort("OPERATIONAL_LOGS_TIMEOUT");
  }, operationalLogsTimeoutMs);

  let response: Response;

  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: createReadHeaders(resolvedConfig),
      signal: controller.signal,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || controller.signal.aborted)
    ) {
      logStructuredEvent("warn", {
        type: "OPERATIONAL_LOGS_TIMEOUT",
        requestId: session.requestId,
        query: cacheableQuery,
        timeoutMs: operationalLogsTimeoutMs,
      });
      throw new AdminServiceError(
        "NETWORK_ERROR",
        "Operational log request timed out.",
        504,
        { timeoutMs: operationalLogsTimeoutMs },
        "Logs are temporarily unavailable.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = await readJson(response);

  if (!response.ok) {
    logStructuredEvent("error", {
      type: "OPERATIONAL_LOGS_SUPABASE_ERROR",
      requestId: session.requestId,
      status: response.status,
      query: cacheableQuery,
      payload,
    });

    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      `Supabase operational log read failed with HTTP ${response.status}.`,
      502,
      payload,
    );
  }

  const rows = parseOperationalEvents(payload);
  const hasMore = rows.length > pageSize;
  const operationalEvents = hasMore ? rows.slice(0, pageSize) : rows;
  const result: OperationalLogListResult = {
    operationalEvents,
    pagination: {
      limit: pageSize,
      offset,
      has_more: hasMore,
      next_cursor: hasMore ? String(offset + pageSize) : null,
    },
  };

  logStructuredEvent("info", {
    type: "OPERATIONAL_LOGS_FETCH",
    requestId: session.requestId,
    query: cacheableQuery,
    resultCount: operationalEvents.length,
    supabaseHost: new URL(resolvedConfig.supabaseUrl).host,
    usingServiceRole: true,
  });

  writeCachedOperationalLogs(cacheableQuery, result);
  return result;
}

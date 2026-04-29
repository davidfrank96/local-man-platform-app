import { z } from "zod";
import {
  auditLogSchema,
  auditLogsQuerySchema,
} from "../validation/schemas.ts";
import {
  getAuditActionFilterValues,
  normalizeAuditAction,
} from "./activity-normalization.ts";
import {
  getAdminAuthConfig,
  type AdminAuthConfig,
  type AdminSession,
} from "./auth.ts";
import { AdminServiceError } from "./errors.ts";
import { logStructuredEvent } from "../observability.ts";
import { formatZodIssues } from "../errors/app-error.ts";
import type {
  AdminRole,
  AuditActionType,
  AuditEntityType,
  AuditLog,
} from "../../types/index.ts";

type AuditLogServiceContext = {
  session: AdminSession;
  config?: AdminAuthConfig | null;
  fetchImpl?: typeof fetch;
};

type AuditLogQuery = z.infer<typeof auditLogsQuerySchema>;
const auditLogsCacheTtlMs = 30_000;
const auditLogsTimeoutMs = 4_000;
const maxAuditLogsPageSize = 20;

type CachedAuditLogResult = {
  expiresAt: number;
  result: AuditLogListResult;
};

const auditLogsReadCache = new Map<string, CachedAuditLogResult>();

export type AuditLogListResult = {
  auditLogs: AuditLog[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
};

type WriteAuditLogInput = {
  action: AuditActionType;
  entityType: AuditEntityType;
  entityId: string | null;
  metadata?: Record<string, unknown>;
};

function requireServiceConfig(
  config: AdminAuthConfig | null | undefined,
): AdminAuthConfig {
  if (!config) {
    throw new AdminServiceError(
      "CONFIGURATION_ERROR",
      "Supabase environment variables are required for admin audit logging.",
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

function createSessionHeaders(
  session: AdminSession,
  config: AdminAuthConfig,
  prefer = "return=minimal",
): HeadersInit {
  return {
    apikey: config.supabaseAnonKey,
    authorization: `Bearer ${session.accessToken}`,
    "content-type": "application/json",
    ...(prefer ? { prefer } : {}),
  };
}

function createReadHeaders(
  session: AdminSession,
  config: AdminAuthConfig,
  prefer = "count=exact",
): HeadersInit {
  const serviceRoleKey = config.supabaseServiceRoleKey?.trim() || "";

  if (!serviceRoleKey) {
    throw new AdminServiceError(
      "CONFIGURATION_ERROR",
      "SUPABASE_SERVICE_ROLE_KEY is required for admin audit log reads.",
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

function buildActorLabel(session: AdminSession): string {
  return session.adminUser.full_name?.trim() || session.adminUser.email;
}

function createAuditLogCacheKey(query: AuditLogQuery): string {
  return JSON.stringify({
    limit: query.limit ?? 10,
    offset: query.offset ?? 0,
    user_role: query.user_role ?? null,
    action: query.action ?? null,
    entity_type: query.entity_type ?? null,
    entity_id: query.entity_id ?? null,
    since: query.since ?? null,
  });
}

function readCachedAuditLogs(query: AuditLogQuery): AuditLogListResult | null {
  const cacheKey = createAuditLogCacheKey(query);
  const cached = auditLogsReadCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    auditLogsReadCache.delete(cacheKey);
    return null;
  }

  return cached.result;
}

function writeCachedAuditLogs(query: AuditLogQuery, result: AuditLogListResult): void {
  auditLogsReadCache.set(createAuditLogCacheKey(query), {
    expiresAt: Date.now() + auditLogsCacheTtlMs,
    result,
  });
}

export async function writeAuditLog(
  input: WriteAuditLogInput,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AuditLogServiceContext,
): Promise<void> {
  const resolvedConfig = requireServiceConfig(config);
  const response = await fetchImpl(
    createRestUrl(resolvedConfig, "audit_logs"),
    {
      method: "POST",
      headers: createSessionHeaders(session, resolvedConfig),
      body: JSON.stringify({
        admin_user_id: session.adminUser.id,
        user_role: session.adminUser.role,
        entity_type: input.entityType,
        entity_id: input.entityId,
        action: input.action,
        metadata: {
          request_id: session.requestId,
          actor_label: buildActorLabel(session),
          ...input.metadata,
        },
      }),
    },
  );

  if (!response.ok) {
    const payload = await readJson(response);
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      `Audit log write failed with HTTP ${response.status}.`,
      502,
      payload,
    );
  }
}

export async function writeAuditLogSafely(
  input: WriteAuditLogInput,
  context: AuditLogServiceContext,
): Promise<void> {
  try {
    await writeAuditLog(input, context);
  } catch (error) {
    logStructuredEvent("warn", {
      type: "AUDIT_LOG_FAILED",
      requestId: context.session.requestId,
      action: input.action,
      userId: context.session.adminUser.id,
      userRole: context.session.adminUser.role,
      entityType: input.entityType,
      entityId: input.entityId,
      error: error instanceof Error ? error.message : "Unknown audit log error",
    });
  }
}

function parseAuditLogs(payload: unknown): AuditLog[] {
  const normalizedPayload = Array.isArray(payload)
    ? payload.flatMap((row) => {
      const candidate = row as Partial<AuditLog> | null;
      const normalizedAction = normalizeAuditAction(
        typeof candidate?.action === "string" ? candidate.action : null,
      );

      if (!normalizedAction) {
        return [];
      }

      return [{
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
        admin_user:
          candidate?.admin_user && typeof candidate.admin_user === "object"
            ? candidate.admin_user
            : undefined,
      }];
    })
    : payload;
  const parsed = z.array(auditLogSchema).safeParse(normalizedPayload);

  if (!parsed.success) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Supabase returned an unexpected audit log payload.",
      502,
      { issues: parsed.error.issues },
    );
  }

  return parsed.data;
}

export async function listAuditLogs(
  query: AuditLogQuery,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AuditLogServiceContext,
): Promise<AuditLogListResult> {
  const resolvedConfig = requireServiceConfig(config);
  const validatedQuery = auditLogsQuerySchema.safeParse(query);

  if (!validatedQuery.success) {
    throw new AdminServiceError(
      "VALIDATION_ERROR",
      "Invalid audit log filters.",
      400,
      { issues: formatZodIssues(validatedQuery.error) },
      "One or more audit log filters were invalid.",
    );
  }

  const cacheableQuery = validatedQuery.data;
  const cachedResult = readCachedAuditLogs(cacheableQuery);

  if (cachedResult) {
    logStructuredEvent("info", {
      type: "AUDIT_LOGS_CACHE_HIT",
      requestId: session.requestId,
      query: cacheableQuery,
      resultCount: cachedResult.auditLogs.length,
    });
    return cachedResult;
  }

  const limit = cacheableQuery.limit ?? 10;
  const offset = validatedQuery.data.offset ?? 0;
  const pageSize = Math.min(limit, maxAuditLogsPageSize);
  const url = createRestUrl(resolvedConfig, "audit_logs", {
    select:
      "id,admin_user_id,user_role,entity_type,entity_id,action,metadata,created_at",
    order: "created_at.desc",
    limit: String(pageSize + 1),
    offset: String(offset),
  });

  if (cacheableQuery.user_role) {
    url.searchParams.set("user_role", `eq.${cacheableQuery.user_role}`);
  }

  if (cacheableQuery.action) {
    const actionValues = getAuditActionFilterValues(cacheableQuery.action);
    if (actionValues.length > 1) {
      url.searchParams.set("action", `in.(${actionValues.join(",")})`);
    } else {
      url.searchParams.set("action", `eq.${actionValues[0] ?? cacheableQuery.action}`);
    }
  }

  if (cacheableQuery.entity_type) {
    url.searchParams.set("entity_type", `eq.${cacheableQuery.entity_type}`);
  }

  if (cacheableQuery.entity_id) {
    url.searchParams.set("entity_id", `eq.${cacheableQuery.entity_id}`);
  }

  if (cacheableQuery.since) {
    url.searchParams.set("created_at", `gte.${cacheableQuery.since}`);
  }

  logStructuredEvent("info", {
    type: "AUDIT_LOGS_SUPABASE_REQUEST",
    requestId: session.requestId,
    query: cacheableQuery,
    supabaseUrl: url.toString(),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort("AUDIT_LOGS_TIMEOUT");
  }, auditLogsTimeoutMs);

  let response: Response;

  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: createReadHeaders(session, resolvedConfig),
      signal: controller.signal,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || controller.signal.aborted)
    ) {
      logStructuredEvent("warn", {
        type: "AUDIT_LOGS_TIMEOUT",
        requestId: session.requestId,
        query: cacheableQuery,
        supabaseUrl: url.toString(),
        timeoutMs: auditLogsTimeoutMs,
      });
      throw new AdminServiceError(
        "NETWORK_ERROR",
        "Audit log request timed out.",
        504,
        { timeoutMs: auditLogsTimeoutMs },
        "Activity temporarily unavailable.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = await readJson(response);

  if (!response.ok) {
    logStructuredEvent("error", {
      type: "AUDIT_LOGS_SUPABASE_ERROR",
      requestId: session.requestId,
      status: response.status,
      query: cacheableQuery,
      supabaseUrl: url.toString(),
      payload,
    });

    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      `Supabase audit log read failed with HTTP ${response.status}.`,
      502,
      payload,
    );
  }

  const rows = parseAuditLogs(payload);

  logStructuredEvent("info", {
    type: "AUDIT_LOGS_FETCH",
    requestId: session.requestId,
    resultCount: rows.length,
    offset,
    limit: pageSize,
    userRole: cacheableQuery.user_role ?? "all",
    action: cacheableQuery.action ?? "all",
    supabaseHost: new URL(resolvedConfig.supabaseUrl).host,
    usingServiceRole: true,
  });

  const result: AuditLogListResult = {
    auditLogs: rows.slice(0, pageSize),
    pagination: {
      limit: pageSize,
      offset,
      has_more: rows.length > pageSize,
    },
  };

  writeCachedAuditLogs(cacheableQuery, result);

  return result;
}

export function getAuditActionOptions(): AuditActionType[] {
  return [
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
  ];
}

export function getAuditRoleOptions(): AdminRole[] {
  return ["admin", "agent"];
}

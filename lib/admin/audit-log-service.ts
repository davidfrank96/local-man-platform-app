import { z } from "zod";
import {
  auditLogSchema,
  auditLogsQuerySchema,
} from "../validation/schemas.ts";
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
  const parsed = z.array(auditLogSchema).safeParse(payload);

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

  const limit = validatedQuery.data.limit ?? 10;
  const offset = validatedQuery.data.offset ?? 0;
  const pageSize = Math.min(limit, 50);
  const url = createRestUrl(resolvedConfig, "audit_logs", {
    select:
      "id,admin_user_id,user_role,entity_type,entity_id,action,metadata,created_at,admin_user:admin_users(id,email,full_name,role)",
    order: "created_at.desc",
    limit: String(pageSize + 1),
    offset: String(offset),
  });

  if (validatedQuery.data.user_role) {
    url.searchParams.set("user_role", `eq.${validatedQuery.data.user_role}`);
  }

  if (validatedQuery.data.action) {
    url.searchParams.set("action", `eq.${validatedQuery.data.action}`);
  }

  if (validatedQuery.data.entity_type) {
    url.searchParams.set("entity_type", `eq.${validatedQuery.data.entity_type}`);
  }

  if (validatedQuery.data.entity_id) {
    url.searchParams.set("entity_id", `eq.${validatedQuery.data.entity_id}`);
  }

  if (validatedQuery.data.since) {
    url.searchParams.set("created_at", `gte.${validatedQuery.data.since}`);
  }

  logStructuredEvent("info", {
    type: "AUDIT_LOGS_SUPABASE_REQUEST",
    requestId: session.requestId,
    query: validatedQuery.data,
    supabaseUrl: url.toString(),
  });

  const response = await fetchImpl(url, {
    method: "GET",
    headers: createReadHeaders(session, resolvedConfig),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    logStructuredEvent("error", {
      type: "AUDIT_LOGS_SUPABASE_ERROR",
      requestId: session.requestId,
      status: response.status,
      query: validatedQuery.data,
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
    userRole: validatedQuery.data.user_role ?? "all",
    action: validatedQuery.data.action ?? "all",
    supabaseHost: new URL(resolvedConfig.supabaseUrl).host,
    usingServiceRole: true,
  });

  return {
    auditLogs: rows.slice(0, pageSize),
    pagination: {
      limit: pageSize,
      offset,
      has_more: rows.length > pageSize,
    },
  };
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

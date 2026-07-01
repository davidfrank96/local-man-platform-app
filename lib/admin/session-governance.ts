import { createHash, randomUUID } from "node:crypto";
import type { AdminAuthConfig, AdminUserRecord, SupabaseAuthUser } from "./auth.ts";
import type { AdminCookieSession } from "./session-cookies.ts";
import { logStructuredEvent } from "../observability.ts";

export type AdminSessionStatus =
  | "active"
  | "idle_expired"
  | "absolute_expired"
  | "revoked"
  | "logged_out";

export type AdminSessionGovernanceConfig = {
  tableName: string;
  enabled: boolean;
  idleTimeoutMs: number;
  absoluteTimeoutMs: number;
  activityUpdateThresholdMs: number;
};

export type AdminSessionGovernanceIdentity = {
  sessionId: string | null;
  ipAddress: string;
  userAgent: string | null;
  requestId: string;
};

type AdminSessionRecord = {
  id: string;
  auth_user_id: string;
  admin_user_id: string | null;
  login_at: string;
  last_activity_at: string;
  refreshed_at: string | null;
  expires_at: string;
  status: AdminSessionStatus;
  revoked_at: string | null;
  revoked_reason: string | null;
};

type ServiceOptions = {
  config?: AdminSessionGovernanceConfig;
  now?: Date;
  fetchImpl?: typeof fetch;
};

export type AdminSessionGovernanceFailure = {
  code: "SESSION_IDLE_TIMEOUT" | "SESSION_ABSOLUTE_TIMEOUT" | "SESSION_REVOKED" | "SESSION_NOT_FOUND";
  message: string;
  status: number;
  statusToPersist?: AdminSessionStatus;
};

export type AdminSessionGovernanceResult =
  | {
    success: true;
    sessionId: string;
    setSessionCookie: boolean;
    responseHeaders: Headers | null;
  }
  | {
    success: false;
    failure: AdminSessionGovernanceFailure;
  };

export const DEFAULT_ADMIN_SESSION_GOVERNANCE_CONFIG: AdminSessionGovernanceConfig = {
  tableName: "admin_sessions",
  enabled: true,
  idleTimeoutMs: 60 * 60_000,
  absoluteTimeoutMs: 24 * 60 * 60_000,
  activityUpdateThresholdMs: 5 * 60_000,
};

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim();
  const parsed = Number.parseInt(rawValue ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const normalized = process.env[name]?.trim().toLowerCase();

  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return fallback;
}

export function getAdminSessionGovernanceConfig(): AdminSessionGovernanceConfig {
  return {
    tableName: process.env.ADMIN_SESSION_GOVERNANCE_TABLE?.trim() ||
      DEFAULT_ADMIN_SESSION_GOVERNANCE_CONFIG.tableName,
    enabled: readBooleanEnv("ADMIN_SESSION_GOVERNANCE_ENABLED", true),
    idleTimeoutMs: readPositiveIntegerEnv(
      "ADMIN_SESSION_IDLE_TIMEOUT_MS",
      DEFAULT_ADMIN_SESSION_GOVERNANCE_CONFIG.idleTimeoutMs,
    ),
    absoluteTimeoutMs: readPositiveIntegerEnv(
      "ADMIN_SESSION_ABSOLUTE_TIMEOUT_MS",
      DEFAULT_ADMIN_SESSION_GOVERNANCE_CONFIG.absoluteTimeoutMs,
    ),
    activityUpdateThresholdMs: readPositiveIntegerEnv(
      "ADMIN_SESSION_ACTIVITY_UPDATE_THRESHOLD_MS",
      DEFAULT_ADMIN_SESSION_GOVERNANCE_CONFIG.activityUpdateThresholdMs,
    ),
  };
}

function hashValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return createHash("sha256").update(value).digest("hex");
}

function createServiceHeaders(config: AdminAuthConfig): HeadersInit {
  const serviceRoleKey = config.supabaseServiceRoleKey?.trim() ?? "";

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin session governance.");
  }

  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
}

function createTableUrl(
  authConfig: AdminAuthConfig,
  governanceConfig: AdminSessionGovernanceConfig,
): URL {
  return new URL(`/rest/v1/${governanceConfig.tableName}`, authConfig.supabaseUrl);
}

export function getAdminSessionClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  if (forwardedFor) {
    return forwardedFor;
  }

  for (const headerName of [
    "x-real-ip",
    "cf-connecting-ip",
    "x-client-ip",
    "fastly-client-ip",
  ]) {
    const value = request.headers.get(headerName)?.trim();

    if (value) {
      return value;
    }
  }

  return "unknown";
}

async function readSessionRecord(
  authConfig: AdminAuthConfig,
  governanceConfig: AdminSessionGovernanceConfig,
  sessionId: string,
  fetchImpl: typeof fetch,
): Promise<AdminSessionRecord | null> {
  const url = createTableUrl(authConfig, governanceConfig);

  url.searchParams.set("id", `eq.${sessionId}`);
  url.searchParams.set(
    "select",
    "id,auth_user_id,admin_user_id,login_at,last_activity_at,refreshed_at,expires_at,status,revoked_at,revoked_reason",
  );
  url.searchParams.set("limit", "1");

  const response = await fetchImpl(url, {
    method: "GET",
    headers: createServiceHeaders(authConfig),
  });

  if (!response.ok) {
    throw new Error(`Admin session read failed: ${response.status}`);
  }

  const rows = (await response.json()) as AdminSessionRecord[];

  return rows[0] ?? null;
}

async function updateSessionRecord(
  authConfig: AdminAuthConfig,
  governanceConfig: AdminSessionGovernanceConfig,
  sessionId: string,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<void> {
  const url = createTableUrl(authConfig, governanceConfig);

  url.searchParams.set("id", `eq.${sessionId}`);

  const response = await fetchImpl(url, {
    method: "PATCH",
    headers: {
      ...createServiceHeaders(authConfig),
      prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Admin session update failed: ${response.status}`);
  }
}

async function updateSessionsByFilter(
  authConfig: AdminAuthConfig,
  governanceConfig: AdminSessionGovernanceConfig,
  filter: Record<string, string>,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<void> {
  const url = createTableUrl(authConfig, governanceConfig);

  for (const [key, value] of Object.entries(filter)) {
    url.searchParams.set(key, value);
  }

  const response = await fetchImpl(url, {
    method: "PATCH",
    headers: {
      ...createServiceHeaders(authConfig),
      prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Admin session bulk update failed: ${response.status}`);
  }
}

function evaluateSessionRecord(
  record: AdminSessionRecord | null,
  now: Date,
  config: AdminSessionGovernanceConfig,
): AdminSessionGovernanceFailure | null {
  if (!record) {
    return {
      code: "SESSION_NOT_FOUND",
      message: "Admin session was not found. Sign in again.",
      status: 401,
    };
  }

  if (record.status !== "active") {
    return {
      code: "SESSION_REVOKED",
      message: "Admin session is no longer active. Sign in again.",
      status: 401,
    };
  }

  if (new Date(record.expires_at).getTime() <= now.getTime()) {
    return {
      code: "SESSION_ABSOLUTE_TIMEOUT",
      message: "Admin session expired. Sign in again.",
      status: 401,
      statusToPersist: "absolute_expired",
    };
  }

  if (new Date(record.last_activity_at).getTime() + config.idleTimeoutMs <= now.getTime()) {
    return {
      code: "SESSION_IDLE_TIMEOUT",
      message: "Admin session expired due to inactivity. Sign in again.",
      status: 401,
      statusToPersist: "idle_expired",
    };
  }

  return null;
}

function shouldRecordActivity(
  record: AdminSessionRecord,
  now: Date,
  config: AdminSessionGovernanceConfig,
): boolean {
  return new Date(record.last_activity_at).getTime() + config.activityUpdateThresholdMs <= now.getTime();
}

function logSessionGovernanceEvent(
  event: string,
  identity: AdminSessionGovernanceIdentity,
  metadata: Record<string, unknown> = {},
): void {
  logStructuredEvent("info", {
    event,
    area: "auth",
    requestId: identity.requestId,
    metadata: {
      sessionId: identity.sessionId,
      ipAddressHash: hashValue(identity.ipAddress)?.slice(0, 16),
      ...metadata,
    },
  });
}

export async function createAdminGovernedSession(
  authConfig: AdminAuthConfig,
  user: SupabaseAuthUser,
  adminUser: AdminUserRecord,
  cookieSession: AdminCookieSession,
  identity: AdminSessionGovernanceIdentity,
  options: ServiceOptions = {},
): Promise<string | null> {
  const governanceConfig = options.config ?? getAdminSessionGovernanceConfig();
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!governanceConfig.enabled) {
    return null;
  }

  const sessionId = randomUUID();
  const url = createTableUrl(authConfig, governanceConfig);
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      ...createServiceHeaders(authConfig),
      prefer: "return=representation",
    },
    body: JSON.stringify({
      id: sessionId,
      auth_user_id: user.id,
      admin_user_id: adminUser.id,
      login_at: now.toISOString(),
      last_activity_at: now.toISOString(),
      expires_at: new Date(now.getTime() + governanceConfig.absoluteTimeoutMs).toISOString(),
      ip_address: identity.ipAddress,
      ip_address_hash: hashValue(identity.ipAddress),
      user_agent: identity.userAgent,
      access_token_hash: hashValue(cookieSession.accessToken),
      refresh_token_hash: hashValue(cookieSession.refreshToken),
      metadata: {
        source: "admin_login",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Admin session create failed: ${response.status}`);
  }

  logSessionGovernanceEvent("ADMIN_SESSION_CREATED", { ...identity, sessionId }, {
    adminUserId: adminUser.id,
    authUserId: user.id,
  });

  return sessionId;
}

export async function ensureAdminGovernedSession(
  authConfig: AdminAuthConfig,
  user: SupabaseAuthUser,
  adminUser: AdminUserRecord,
  cookieSession: {
    accessToken: string | null;
    refreshToken: string | null;
    adminSessionId: string | null;
  },
  identity: AdminSessionGovernanceIdentity,
  options: ServiceOptions = {},
): Promise<AdminSessionGovernanceResult> {
  const governanceConfig = options.config ?? getAdminSessionGovernanceConfig();
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!governanceConfig.enabled) {
    return {
      success: true,
      sessionId: cookieSession.adminSessionId ?? "",
      setSessionCookie: false,
      responseHeaders: null,
    };
  }

  let sessionId = cookieSession.adminSessionId;
  let record = sessionId
    ? await readSessionRecord(authConfig, governanceConfig, sessionId, fetchImpl)
    : null;
  let setSessionCookie = false;

  if (!record) {
    sessionId = randomUUID();
    await createAdoptedSession(authConfig, governanceConfig, sessionId, user, adminUser, cookieSession, identity, now, fetchImpl);
    record = await readSessionRecord(authConfig, governanceConfig, sessionId, fetchImpl);
    setSessionCookie = true;
  }

  const failure = evaluateSessionRecord(record, now, governanceConfig);

  if (failure) {
    if (record && failure.statusToPersist) {
      await updateSessionRecord(
        authConfig,
        governanceConfig,
        record.id,
        {
          status: failure.statusToPersist,
          revoked_at: now.toISOString(),
          revoked_reason: failure.code,
        },
        fetchImpl,
      );
    }

    return {
      success: false,
      failure,
    };
  }

  if (!record || !sessionId) {
    return {
      success: false,
      failure: {
        code: "SESSION_NOT_FOUND",
        message: "Admin session was not found. Sign in again.",
        status: 401,
      },
    };
  }

  const responseHeaders = new Headers();

  if (shouldRecordActivity(record, now, governanceConfig)) {
    await updateSessionRecord(
      authConfig,
      governanceConfig,
      record.id,
      {
        admin_user_id: adminUser.id,
        last_activity_at: now.toISOString(),
        access_token_hash: hashValue(cookieSession.accessToken),
        refresh_token_hash: hashValue(cookieSession.refreshToken),
      },
      fetchImpl,
    );
    logSessionGovernanceEvent("ADMIN_SESSION_ACTIVITY_UPDATED", { ...identity, sessionId }, {
      adminUserId: adminUser.id,
    });
  }

  return {
    success: true,
    sessionId,
    setSessionCookie,
    responseHeaders: responseHeaders.keys().next().done ? null : responseHeaders,
  };
}

async function createAdoptedSession(
  authConfig: AdminAuthConfig,
  governanceConfig: AdminSessionGovernanceConfig,
  sessionId: string,
  user: SupabaseAuthUser,
  adminUser: AdminUserRecord,
  cookieSession: {
    accessToken: string | null;
    refreshToken: string | null;
  },
  identity: AdminSessionGovernanceIdentity,
  now: Date,
  fetchImpl: typeof fetch,
): Promise<void> {
  const url = createTableUrl(authConfig, governanceConfig);
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      ...createServiceHeaders(authConfig),
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      id: sessionId,
      auth_user_id: user.id,
      admin_user_id: adminUser.id,
      login_at: now.toISOString(),
      last_activity_at: now.toISOString(),
      expires_at: new Date(now.getTime() + governanceConfig.absoluteTimeoutMs).toISOString(),
      ip_address: identity.ipAddress,
      ip_address_hash: hashValue(identity.ipAddress),
      user_agent: identity.userAgent,
      access_token_hash: hashValue(cookieSession.accessToken),
      refresh_token_hash: hashValue(cookieSession.refreshToken),
      metadata: {
        source: "legacy_cookie_adoption",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Admin session adoption failed: ${response.status}`);
  }

  logSessionGovernanceEvent("ADMIN_SESSION_ADOPTED", { ...identity, sessionId }, {
    adminUserId: adminUser.id,
    authUserId: user.id,
  });
}

export async function markAdminSessionRefreshed(
  authConfig: AdminAuthConfig,
  sessionId: string | null,
  cookieSession: AdminCookieSession,
  identity: AdminSessionGovernanceIdentity,
  options: ServiceOptions = {},
): Promise<void> {
  const governanceConfig = options.config ?? getAdminSessionGovernanceConfig();
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!governanceConfig.enabled || !sessionId) {
    return;
  }

  await updateSessionRecord(
    authConfig,
    governanceConfig,
    sessionId,
    {
      refreshed_at: now.toISOString(),
      last_activity_at: now.toISOString(),
      access_token_hash: hashValue(cookieSession.accessToken),
      refresh_token_hash: hashValue(cookieSession.refreshToken),
    },
    fetchImpl,
  );
  logSessionGovernanceEvent("ADMIN_SESSION_REFRESHED", identity, {
    rotatedRefreshToken: Boolean(cookieSession.refreshToken),
  });
}

export async function revokeAdminSession(
  authConfig: AdminAuthConfig,
  sessionId: string,
  reason: string,
  options: ServiceOptions = {},
): Promise<void> {
  const governanceConfig = options.config ?? getAdminSessionGovernanceConfig();
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!governanceConfig.enabled) {
    return;
  }

  await updateSessionRecord(
    authConfig,
    governanceConfig,
    sessionId,
    {
      status: reason === "manual_logout" ? "logged_out" : "revoked",
      revoked_at: now.toISOString(),
      revoked_reason: reason,
    },
    fetchImpl,
  );
}

export async function revokeAllAdminSessionsForUser(
  authConfig: AdminAuthConfig,
  authUserId: string,
  reason: string,
  options: ServiceOptions = {},
): Promise<void> {
  const governanceConfig = options.config ?? getAdminSessionGovernanceConfig();
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!governanceConfig.enabled) {
    return;
  }

  await updateSessionsByFilter(
    authConfig,
    governanceConfig,
    {
      auth_user_id: `eq.${authUserId}`,
      status: "eq.active",
    },
    {
      status: "revoked",
      revoked_at: now.toISOString(),
      revoked_reason: reason,
    },
    fetchImpl,
  );
}

export async function revokeOtherAdminSessionsForUser(
  authConfig: AdminAuthConfig,
  authUserId: string,
  currentSessionId: string | null,
  reason: string,
  options: ServiceOptions = {},
): Promise<void> {
  const governanceConfig = options.config ?? getAdminSessionGovernanceConfig();
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!governanceConfig.enabled) {
    return;
  }

  const filters: Record<string, string> = {
    auth_user_id: `eq.${authUserId}`,
    status: "eq.active",
  };

  if (currentSessionId) {
    filters.id = `neq.${currentSessionId}`;
  }

  await updateSessionsByFilter(
    authConfig,
    governanceConfig,
    filters,
    {
      status: "revoked",
      revoked_at: now.toISOString(),
      revoked_reason: reason,
    },
    fetchImpl,
  );
}

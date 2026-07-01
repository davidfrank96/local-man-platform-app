import { createHash } from "node:crypto";
import { apiError } from "../api/responses.ts";
import type { AdminAuthConfig } from "./auth.ts";
import { logStructuredEvent, redactEmailForLog } from "../observability.ts";

export type AdminLoginProtectionAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGIN_RATE_LIMITED"
  | "LOGIN_DELAY_APPLIED"
  | "LOGIN_COOLDOWN_STARTED"
  | "LOGIN_COOLDOWN_ENDED"
  | "SUSPICIOUS_LOGIN_ACTIVITY";

export type AdminLoginProtectionOutcome =
  | "allowed"
  | "failed"
  | "delayed"
  | "rate_limited"
  | "cooldown_started"
  | "cooldown_ended";

export type AdminLoginProtectionScopeType = "ip" | "account" | "ip_account" | "global";

export type AdminLoginProtectionLayerConfig = {
  maxFailures: number;
  windowMs: number;
  cooldownMs: number;
  delayThresholds: Array<{
    afterFailures: number;
    delayMs: number;
  }>;
};

export type AdminLoginProtectionConfig = {
  tableName: string;
  enabled: boolean;
  ip: AdminLoginProtectionLayerConfig;
  account: AdminLoginProtectionLayerConfig;
  ipAccount: AdminLoginProtectionLayerConfig;
};

export type AdminLoginProtectionIdentity = {
  email: string;
  ipAddress: string;
  userAgent: string | null;
  requestId: string;
};

export type AdminLoginProtectionDecision = {
  allowed: boolean;
  delayMs: number;
  reason: string | null;
  limit: number;
  remaining: number;
  resetInSeconds: number;
  retryAfterSeconds: number;
  activeScope: AdminLoginProtectionScopeType;
};

type AdminLoginSecurityEventRow = {
  action: AdminLoginProtectionAction;
  outcome: AdminLoginProtectionOutcome;
  created_at: string;
  scope_type: AdminLoginProtectionScopeType;
  scope_key: string;
  cooldown_until: string | null;
};

type ScopeInfo = {
  type: AdminLoginProtectionScopeType;
  key: string;
  rawValue: string;
  config: AdminLoginProtectionLayerConfig;
};

type ProtectionContext = {
  identity: AdminLoginProtectionIdentity;
  normalizedEmail: string;
  emailHash: string;
  ipHash: string;
  scopes: ScopeInfo[];
};

type ServiceOptions = {
  config?: AdminLoginProtectionConfig;
  now?: Date;
  fetchImpl?: typeof fetch;
};

export const DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG: AdminLoginProtectionConfig = {
  tableName: "admin_login_security_events",
  enabled: true,
  ip: {
    maxFailures: 20,
    windowMs: 10 * 60_000,
    cooldownMs: 15 * 60_000,
    delayThresholds: [
      { afterFailures: 5, delayMs: 250 },
      { afterFailures: 10, delayMs: 750 },
      { afterFailures: 15, delayMs: 1500 },
    ],
  },
  account: {
    maxFailures: 5,
    windowMs: 10 * 60_000,
    cooldownMs: 15 * 60_000,
    delayThresholds: [
      { afterFailures: 2, delayMs: 250 },
      { afterFailures: 3, delayMs: 750 },
      { afterFailures: 4, delayMs: 1500 },
    ],
  },
  ipAccount: {
    maxFailures: 5,
    windowMs: 10 * 60_000,
    cooldownMs: 15 * 60_000,
    delayThresholds: [
      { afterFailures: 2, delayMs: 250 },
      { afterFailures: 3, delayMs: 750 },
      { afterFailures: 4, delayMs: 1500 },
    ],
  },
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

export function getAdminLoginProtectionConfig(): AdminLoginProtectionConfig {
  return {
    tableName: process.env.ADMIN_LOGIN_PROTECTION_TABLE?.trim() ||
      DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.tableName,
    enabled: readBooleanEnv("ADMIN_LOGIN_PROTECTION_ENABLED", true),
    ip: {
      ...DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.ip,
      maxFailures: readPositiveIntegerEnv(
        "ADMIN_LOGIN_PROTECTION_IP_MAX_FAILURES",
        DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.ip.maxFailures,
      ),
      windowMs: readPositiveIntegerEnv(
        "ADMIN_LOGIN_PROTECTION_IP_WINDOW_MS",
        DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.ip.windowMs,
      ),
      cooldownMs: readPositiveIntegerEnv(
        "ADMIN_LOGIN_PROTECTION_IP_COOLDOWN_MS",
        DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.ip.cooldownMs,
      ),
    },
    account: {
      ...DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.account,
      maxFailures: readPositiveIntegerEnv(
        "ADMIN_LOGIN_PROTECTION_ACCOUNT_MAX_FAILURES",
        DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.account.maxFailures,
      ),
      windowMs: readPositiveIntegerEnv(
        "ADMIN_LOGIN_PROTECTION_ACCOUNT_WINDOW_MS",
        DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.account.windowMs,
      ),
      cooldownMs: readPositiveIntegerEnv(
        "ADMIN_LOGIN_PROTECTION_ACCOUNT_COOLDOWN_MS",
        DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.account.cooldownMs,
      ),
    },
    ipAccount: {
      ...DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.ipAccount,
      maxFailures: readPositiveIntegerEnv(
        "ADMIN_LOGIN_PROTECTION_IP_ACCOUNT_MAX_FAILURES",
        DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.ipAccount.maxFailures,
      ),
      windowMs: readPositiveIntegerEnv(
        "ADMIN_LOGIN_PROTECTION_IP_ACCOUNT_WINDOW_MS",
        DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.ipAccount.windowMs,
      ),
      cooldownMs: readPositiveIntegerEnv(
        "ADMIN_LOGIN_PROTECTION_IP_ACCOUNT_COOLDOWN_MS",
        DEFAULT_ADMIN_LOGIN_PROTECTION_CONFIG.ipAccount.cooldownMs,
      ),
    },
  };
}

function firstHeaderToken(value: string | null): string | null {
  const token = value?.split(",")[0]?.trim();

  return token || null;
}

export function getAdminLoginClientIp(request: Request): string {
  const forwardedFor = firstHeaderToken(request.headers.get("x-forwarded-for"));

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

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function createScopeKey(type: AdminLoginProtectionScopeType, value: string): string {
  return hashValue(`${type}:${value.trim().toLowerCase()}`);
}

function createProtectionContext(
  identity: AdminLoginProtectionIdentity,
  config: AdminLoginProtectionConfig,
): ProtectionContext {
  const normalizedEmail = normalizeEmail(identity.email);
  const normalizedIp = identity.ipAddress.trim().toLowerCase() || "unknown";
  const emailHash = hashValue(normalizedEmail);
  const ipHash = hashValue(normalizedIp);

  return {
    identity: {
      ...identity,
      ipAddress: normalizedIp,
    },
    normalizedEmail,
    emailHash,
    ipHash,
    scopes: [
      {
        type: "ip",
        key: createScopeKey("ip", normalizedIp),
        rawValue: normalizedIp,
        config: config.ip,
      },
      {
        type: "account",
        key: createScopeKey("account", normalizedEmail),
        rawValue: normalizedEmail,
        config: config.account,
      },
      {
        type: "ip_account",
        key: createScopeKey("ip_account", `${normalizedIp}|${normalizedEmail}`),
        rawValue: `${normalizedIp}|${normalizedEmail}`,
        config: config.ipAccount,
      },
    ],
  };
}

function createServiceHeaders(config: AdminAuthConfig): HeadersInit {
  const serviceRoleKey = config.supabaseServiceRoleKey?.trim() ?? "";

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin login protection.");
  }

  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
}

function createEventsUrl(
  authConfig: AdminAuthConfig,
  protectionConfig: AdminLoginProtectionConfig,
): URL {
  return new URL(`/rest/v1/${protectionConfig.tableName}`, authConfig.supabaseUrl);
}

function getMaxLookbackMs(config: AdminLoginProtectionConfig): number {
  return Math.max(
    config.ip.windowMs + config.ip.cooldownMs,
    config.account.windowMs + config.account.cooldownMs,
    config.ipAccount.windowMs + config.ipAccount.cooldownMs,
  );
}

async function readRecentEvents(
  authConfig: AdminAuthConfig,
  context: ProtectionContext,
  protectionConfig: AdminLoginProtectionConfig,
  now: Date,
  fetchImpl: typeof fetch,
): Promise<AdminLoginSecurityEventRow[]> {
  const url = createEventsUrl(authConfig, protectionConfig);
  const scopeKeys = context.scopes.map((scope) => scope.key).join(",");
  const lookback = new Date(now.getTime() - getMaxLookbackMs(protectionConfig)).toISOString();

  url.searchParams.set("select", "action,outcome,created_at,scope_type,scope_key,cooldown_until");
  url.searchParams.set("scope_key", `in.(${scopeKeys})`);
  url.searchParams.set("created_at", `gte.${lookback}`);
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "500");

  const response = await fetchImpl(url, {
    method: "GET",
    headers: createServiceHeaders(authConfig),
  });

  if (!response.ok) {
    throw new Error(`Admin login protection read failed: ${response.status}`);
  }

  return (await response.json()) as AdminLoginSecurityEventRow[];
}

async function insertEvent(
  authConfig: AdminAuthConfig,
  context: ProtectionContext,
  protectionConfig: AdminLoginProtectionConfig,
  input: {
    action: AdminLoginProtectionAction;
    outcome: AdminLoginProtectionOutcome;
    scope: ScopeInfo | { type: "global"; key: string; rawValue: string };
    reason?: string | null;
    delayMs?: number;
    cooldownUntil?: Date | null;
    metadata?: Record<string, unknown>;
  },
  fetchImpl: typeof fetch,
): Promise<void> {
  const url = createEventsUrl(authConfig, protectionConfig);
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      ...createServiceHeaders(authConfig),
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      action: input.action,
      outcome: input.outcome,
      attempted_email: context.normalizedEmail,
      attempted_email_hash: context.emailHash,
      ip_address: context.identity.ipAddress,
      ip_address_hash: context.ipHash,
      user_agent: context.identity.userAgent,
      scope_type: input.scope.type,
      scope_key: input.scope.key,
      reason: input.reason ?? null,
      request_id: context.identity.requestId,
      delay_ms: input.delayMs ?? 0,
      cooldown_until: input.cooldownUntil?.toISOString() ?? null,
      metadata: input.metadata ?? {},
    }),
  });

  if (!response.ok) {
    throw new Error(`Admin login protection write failed: ${response.status}`);
  }

  logStructuredEvent(input.outcome === "rate_limited" ? "warn" : "info", {
    event: input.action,
    area: "auth",
    requestId: context.identity.requestId,
    metadata: {
      emailHint: redactEmailForLog(context.normalizedEmail),
      ipAddressHash: context.ipHash.slice(0, 16),
      scopeType: input.scope.type,
      reason: input.reason ?? null,
      delayMs: input.delayMs ?? 0,
      cooldownUntil: input.cooldownUntil?.toISOString() ?? null,
    },
  });
}

function getFailureCount(
  rows: AdminLoginSecurityEventRow[],
  scope: ScopeInfo,
  now: Date,
): number {
  const windowStartedAt = now.getTime() - scope.config.windowMs;

  return rows.filter((row) =>
    row.scope_key === scope.key &&
    row.scope_type === scope.type &&
    row.action === "LOGIN_FAILED" &&
    new Date(row.created_at).getTime() >= windowStartedAt
  ).length;
}

function getActiveCooldown(
  rows: AdminLoginSecurityEventRow[],
  scope: ScopeInfo,
  now: Date,
): AdminLoginSecurityEventRow | null {
  return rows.find((row) =>
    row.scope_key === scope.key &&
    row.scope_type === scope.type &&
    row.action === "LOGIN_COOLDOWN_STARTED" &&
    row.cooldown_until !== null &&
    new Date(row.cooldown_until).getTime() > now.getTime()
  ) ?? null;
}

function getExpiredCooldownToClose(
  rows: AdminLoginSecurityEventRow[],
  scope: ScopeInfo,
  now: Date,
): AdminLoginSecurityEventRow | null {
  const cooldown = rows.find((row) =>
    row.scope_key === scope.key &&
    row.scope_type === scope.type &&
    row.action === "LOGIN_COOLDOWN_STARTED" &&
    row.cooldown_until !== null &&
    new Date(row.cooldown_until).getTime() <= now.getTime()
  );

  if (!cooldown) {
    return null;
  }

  const cooldownCreatedAt = new Date(cooldown.created_at).getTime();
  const alreadyClosed = rows.some((row) =>
    row.scope_key === scope.key &&
    row.scope_type === scope.type &&
    row.action === "LOGIN_COOLDOWN_ENDED" &&
    new Date(row.created_at).getTime() >= cooldownCreatedAt
  );

  return alreadyClosed ? null : cooldown;
}

function getDelayMs(scope: ScopeInfo, failures: number): number {
  return scope.config.delayThresholds.reduce((delayMs, threshold) =>
    failures >= threshold.afterFailures ? Math.max(delayMs, threshold.delayMs) : delayMs, 0);
}

function computeResetInSeconds(scope: ScopeInfo, rows: AdminLoginSecurityEventRow[], now: Date): number {
  const failures = rows
    .filter((row) =>
      row.scope_key === scope.key &&
      row.scope_type === scope.type &&
      row.action === "LOGIN_FAILED"
    )
    .map((row) => new Date(row.created_at).getTime())
    .sort((left, right) => left - right);
  const oldest = failures[0] ?? now.getTime();

  return Math.max(1, Math.ceil((oldest + scope.config.windowMs - now.getTime()) / 1000));
}

function createAllowedDecision(
  context: ProtectionContext,
  rows: AdminLoginSecurityEventRow[],
  now: Date,
): AdminLoginProtectionDecision {
  let activeScope = context.scopes[0];
  let maxDelayMs = 0;
  let remaining = Number.POSITIVE_INFINITY;

  for (const scope of context.scopes) {
    const failures = getFailureCount(rows, scope, now);
    const delayMs = getDelayMs(scope, failures);
    const scopeRemaining = Math.max(0, scope.config.maxFailures - failures);

    if (delayMs > maxDelayMs || scopeRemaining < remaining) {
      activeScope = scope;
      maxDelayMs = delayMs;
      remaining = scopeRemaining;
    }
  }

  return {
    allowed: true,
    delayMs: maxDelayMs,
    reason: maxDelayMs > 0 ? "progressive_delay" : null,
    limit: activeScope.config.maxFailures,
    remaining: Number.isFinite(remaining) ? remaining : activeScope.config.maxFailures,
    resetInSeconds: computeResetInSeconds(activeScope, rows, now),
    retryAfterSeconds: 0,
    activeScope: activeScope.type,
  };
}

export async function evaluateAdminLoginProtection(
  authConfig: AdminAuthConfig,
  identity: AdminLoginProtectionIdentity,
  options: ServiceOptions = {},
): Promise<AdminLoginProtectionDecision> {
  const protectionConfig = options.config ?? getAdminLoginProtectionConfig();
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;
  const context = createProtectionContext(identity, protectionConfig);

  if (!protectionConfig.enabled) {
    return {
      allowed: true,
      delayMs: 0,
      reason: null,
      limit: protectionConfig.account.maxFailures,
      remaining: protectionConfig.account.maxFailures,
      resetInSeconds: Math.ceil(protectionConfig.account.windowMs / 1000),
      retryAfterSeconds: 0,
      activeScope: "account",
    };
  }

  const rows = await readRecentEvents(authConfig, context, protectionConfig, now, fetchImpl);

  for (const scope of context.scopes) {
    const activeCooldown = getActiveCooldown(rows, scope, now);

    if (!activeCooldown?.cooldown_until) {
      continue;
    }

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(activeCooldown.cooldown_until).getTime() - now.getTime()) / 1000),
    );
    await insertEvent(
      authConfig,
      context,
      protectionConfig,
      {
        action: "LOGIN_RATE_LIMITED",
        outcome: "rate_limited",
        scope,
        reason: "cooldown_active",
        cooldownUntil: new Date(activeCooldown.cooldown_until),
      },
      fetchImpl,
    );

    return {
      allowed: false,
      delayMs: 0,
      reason: "cooldown_active",
      limit: scope.config.maxFailures,
      remaining: 0,
      resetInSeconds: retryAfterSeconds,
      retryAfterSeconds,
      activeScope: scope.type,
    };
  }

  for (const scope of context.scopes) {
    const expiredCooldown = getExpiredCooldownToClose(rows, scope, now);

    if (!expiredCooldown?.cooldown_until) {
      continue;
    }

    await insertEvent(
      authConfig,
      context,
      protectionConfig,
      {
        action: "LOGIN_COOLDOWN_ENDED",
        outcome: "cooldown_ended",
        scope,
        reason: "cooldown_expired",
        cooldownUntil: new Date(expiredCooldown.cooldown_until),
      },
      fetchImpl,
    );
  }

  return createAllowedDecision(context, rows, now);
}

export async function recordAdminLoginProtectionOutcome(
  authConfig: AdminAuthConfig,
  identity: AdminLoginProtectionIdentity,
  action: "LOGIN_SUCCESS" | "LOGIN_FAILED",
  options: ServiceOptions = {},
): Promise<void> {
  const protectionConfig = options.config ?? getAdminLoginProtectionConfig();
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;
  const context = createProtectionContext(identity, protectionConfig);

  if (!protectionConfig.enabled) {
    return;
  }

  const rows = await readRecentEvents(authConfig, context, protectionConfig, now, fetchImpl);
  const primaryScope = context.scopes.find((scope) => scope.type === "ip_account") ?? context.scopes[0];
  const scopesToRecord = action === "LOGIN_FAILED" ? context.scopes : [primaryScope];

  for (const scope of scopesToRecord) {
    await insertEvent(
      authConfig,
      context,
      protectionConfig,
      {
        action,
        outcome: action === "LOGIN_SUCCESS" ? "allowed" : "failed",
        scope,
        reason: action === "LOGIN_SUCCESS" ? "credentials_accepted" : "credentials_rejected",
      },
      fetchImpl,
    );
  }

  if (action !== "LOGIN_FAILED") {
    return;
  }

  const syntheticFailureRows: AdminLoginSecurityEventRow[] = context.scopes.map((scope) => ({
      action: "LOGIN_FAILED",
      outcome: "failed",
      created_at: now.toISOString(),
      scope_type: scope.type,
      scope_key: scope.key,
      cooldown_until: null,
    }));
  const updatedRows: AdminLoginSecurityEventRow[] = [
    ...syntheticFailureRows,
    ...rows,
  ];

  for (const scope of context.scopes) {
    const failures = getFailureCount(updatedRows, scope, now);

    if (failures < scope.config.maxFailures || getActiveCooldown(rows, scope, now)) {
      continue;
    }

    const cooldownUntil = new Date(now.getTime() + scope.config.cooldownMs);
    await insertEvent(
      authConfig,
      context,
      protectionConfig,
      {
        action: "LOGIN_COOLDOWN_STARTED",
        outcome: "cooldown_started",
        scope,
        reason: "failure_threshold_reached",
        cooldownUntil,
        metadata: {
          failureCount: failures,
          maxFailures: scope.config.maxFailures,
          windowMs: scope.config.windowMs,
        },
      },
      fetchImpl,
    );
  }
}

export async function recordAdminLoginDelayApplied(
  authConfig: AdminAuthConfig,
  identity: AdminLoginProtectionIdentity,
  decision: AdminLoginProtectionDecision,
  options: ServiceOptions = {},
): Promise<void> {
  const protectionConfig = options.config ?? getAdminLoginProtectionConfig();
  const fetchImpl = options.fetchImpl ?? fetch;
  const context = createProtectionContext(identity, protectionConfig);
  const scope = context.scopes.find((candidate) => candidate.type === decision.activeScope) ?? context.scopes[0];

  if (!protectionConfig.enabled || decision.delayMs <= 0) {
    return;
  }

  await insertEvent(
    authConfig,
    context,
    protectionConfig,
    {
      action: "LOGIN_DELAY_APPLIED",
      outcome: "delayed",
      scope,
      reason: decision.reason ?? "progressive_delay",
      delayMs: decision.delayMs,
    },
    fetchImpl,
  );
}

export function applyAdminLoginProtectionHeaders(
  response: Response,
  decision: AdminLoginProtectionDecision,
): Response {
  response.headers.set("RateLimit-Limit", String(decision.limit));
  response.headers.set("RateLimit-Remaining", String(decision.remaining));
  response.headers.set("RateLimit-Reset", String(decision.resetInSeconds));

  if (!decision.allowed) {
    response.headers.set("Retry-After", String(decision.retryAfterSeconds));
  }

  return response;
}

export function adminLoginProtectionRateLimitedResponse(
  decision: AdminLoginProtectionDecision,
): Response {
  return applyAdminLoginProtectionHeaders(
    apiError(
      "TOO_MANY_REQUESTS",
      "Too many login attempts. Please wait before trying again.",
      429,
      {
        retry_after_seconds: decision.retryAfterSeconds,
        scope: decision.activeScope,
      },
      "Authentication is temporarily rate limited to protect Local Man.",
    ),
    decision,
  );
}

export function waitForAdminLoginProtectionDelay(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

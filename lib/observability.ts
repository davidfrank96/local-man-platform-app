export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogArea =
  | "auth"
  | "admin"
  | "api"
  | "public_discovery"
  | "map"
  | "ratings"
  | "analytics"
  | "storage"
  | "abuse"
  | "db"
  | "cache";

export type StructuredLogEvent = {
  event?: string;
  type?: string;
  message?: string;
  area?: LogArea | string;
  route?: string | null;
  method?: string | null;
  status?: number | null;
  durationMs?: number | null;
  requestId?: string | null;
  userRole?: string | null;
  userId?: string | null;
  adminUserId?: string | null;
  vendorId?: string | null;
  vendorSlug?: string | null;
  error?: unknown;
  errorCode?: string | number | null;
  errorName?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type StructuredLogRecord = {
  timestamp: string;
  level: LogLevel;
  event: string;
  message?: string;
  area?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  requestId?: string;
  userRole?: string;
  userId?: string;
  adminUserId?: string;
  vendorId?: string;
  vendorSlug?: string;
  errorCode?: string | number;
  errorName?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

export type SerializedLogError = {
  errorName: string;
  errorMessage: string;
  errorCode?: string | number;
  status?: number;
};

export type RouteLogContext = {
  requestId: string;
  route: string;
  method: string;
  area: LogArea | string;
  startedAt: number;
};

type OperationalEventInsertRow = {
  level: LogLevel;
  area: string;
  event: string;
  message: string | null;
  route: string | null;
  method: string | null;
  status: number | null;
  duration_ms: number | null;
  request_id: string | null;
  actor_role: string | null;
  actor_id: string | null;
  vendor_id: string | null;
  vendor_slug: string | null;
  metadata: Record<string, unknown>;
  environment: string | null;
};

type OperationalEventStorageConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  environment: string | null;
};

const REQUEST_ID_HEADER_NAMES = ["x-request-id", "x-correlation-id"] as const;
const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};
const RESERVED_LOG_FIELDS = new Set([
  "event",
  "type",
  "message",
  "area",
  "route",
  "method",
  "status",
  "durationMs",
  "requestId",
  "userRole",
  "userId",
  "adminUserId",
  "vendorId",
  "vendorSlug",
  "error",
  "errorCode",
  "errorName",
  "errorMessage",
  "metadata",
]);
const SENSITIVE_LOG_KEYS = new Set([
  "access_token",
  "api_key",
  "apikey",
  "authorization",
  "body",
  "cookie",
  "database_url",
  "db_url",
  "headers",
  "id_token",
  "password",
  "raw_body",
  "rawbody",
  "refresh_token",
  "request_body",
  "response_body",
  "secret",
  "service_role",
  "service_role_key",
  "set-cookie",
  "stack",
  "supabase_service_role_key",
  "token",
]);
const REDACTED_VALUE = "[REDACTED]";
const TRUNCATED_VALUE = "[Truncated]";
const MAX_STRING_LENGTH = 280;
const MAX_ARRAY_ITEMS = 25;
const MAX_OBJECT_KEYS = 40;
const MAX_METADATA_DEPTH = 5;
const operationalEventPersistenceFailureCooldownMs = 60_000;
const persistedOperationalInfoEvents = new Set([
  "ADMIN_VENDOR_CREATED",
  "ADMIN_VENDOR_UPDATED",
  "ADMIN_VENDOR_DELETED",
  "ADMIN_VENDOR_IMAGE_UPLOADED",
  "ADMIN_VENDOR_IMAGE_METADATA_CREATED",
  "ADMIN_VENDOR_IMAGE_DELETED",
  "ADMIN_VENDOR_DISHES_CREATED",
  "ADMIN_VENDOR_DISH_DELETED",
  "ADMIN_VENDOR_HOURS_REPLACED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "PASSWORD_CHANGED",
  "SESSIONS_REVOKED_AFTER_PASSWORD_CHANGE",
]);
const persistedLowVolumeWarnAreas = new Set([
  "auth",
  "admin",
  "analytics",
  "storage",
  "db",
]);
const persistedPublicWarnEvents = new Set([
  "PUBLIC_NEARBY_REQUEST_INVALID",
  "PUBLIC_VENDOR_RATING_REJECTED",
]);
const persistedWarnEventKeywords = [
  "FAILED",
  "RATE_LIMITED",
  "SLOW",
  "TIMEOUT",
  "UNAVAILABLE",
  "DENIED",
];
const pendingOperationalEventWrites = new Set<Promise<void>>();
let lastOperationalEventPersistenceFailureAt = 0;

function parseBooleanEnv(value: string | undefined): boolean | null {
  if (value === undefined) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return null;
}

function isServerObservabilityRuntime(): boolean {
  return typeof window === "undefined";
}

function getConfiguredLogLevel(): LogLevel {
  const configuredLevel = process.env.LOCALMAN_LOG_LEVEL?.trim().toLowerCase();

  if (
    configuredLevel === "debug" ||
    configuredLevel === "info" ||
    configuredLevel === "warn" ||
    configuredLevel === "error"
  ) {
    return configuredLevel;
  }

  return "info";
}

function isDebugLoggingEnabled(): boolean {
  const debugFlag = parseBooleanEnv(process.env.LOCALMAN_ENABLE_DEBUG_LOGS);

  if (debugFlag !== null) {
    return debugFlag;
  }

  return getConfiguredLogLevel() === "debug";
}

function normalizeShortText(
  value: unknown,
  maxLength = MAX_STRING_LENGTH,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 1))}…`;
}

function looksSensitiveString(value: string): boolean {
  const trimmed = value.trim();

  return (
    /^bearer\s+/i.test(trimmed) ||
    /^postgres(ql)?:\/\//i.test(trimmed) ||
    /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed) ||
    /sb_secret_[A-Za-z0-9]+/i.test(trimmed)
  );
}

function isSensitiveLogKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();

  return (
    SENSITIVE_LOG_KEYS.has(normalized) ||
    normalized.endsWith("_token") ||
    normalized.endsWith("_secret") ||
    normalized.endsWith("_password") ||
    normalized.startsWith("x-") && normalized.includes("token")
  );
}

function sanitizeStringValue(value: string, keyHint?: string): string {
  if (keyHint && isSensitiveLogKey(keyHint)) {
    return REDACTED_VALUE;
  }

  if (looksSensitiveString(value)) {
    return REDACTED_VALUE;
  }

  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH - 1)}…`;
}

function sanitizeUnknownValue(
  value: unknown,
  keyHint?: string,
  depth = 0,
): unknown {
  if (depth >= MAX_METADATA_DEPTH) {
    return TRUNCATED_VALUE;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return sanitizeStringValue(value, keyHint);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof URL) {
    return sanitizeStringValue(value.toString(), keyHint);
  }

  if (value instanceof Error) {
    return serializeErrorForLog(value);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((entry) => sanitizeUnknownValue(entry, keyHint, depth + 1));
  }

  if (typeof value === "object") {
    const sanitizedEntries = Object.entries(value as Record<string, unknown>)
      .slice(0, MAX_OBJECT_KEYS)
      .map(([entryKey, entryValue]) => {
        if (isSensitiveLogKey(entryKey)) {
          return [entryKey, REDACTED_VALUE] as const;
        }

        return [
          entryKey,
          sanitizeUnknownValue(entryValue, entryKey, depth + 1),
        ] as const;
      });

    return Object.fromEntries(sanitizedEntries);
  }

  return sanitizeStringValue(String(value), keyHint);
}

export function sanitizeLogMetadata(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const sanitized = sanitizeUnknownValue(value, undefined, 0);

  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) {
    return undefined;
  }

  return Object.keys(sanitized).length > 0
    ? sanitized as Record<string, unknown>
    : undefined;
}

function getErrorCode(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return undefined;
}

function getErrorStatus(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function serializeErrorForLog(error: unknown): SerializedLogError | undefined {
  if (error instanceof Error) {
    const candidate = error as Error & {
      code?: unknown;
      status?: unknown;
      cause?: unknown;
    };

    return {
      errorName: normalizeShortText(candidate.name, 80) ?? "Error",
      errorMessage: normalizeShortText(candidate.message, 320) ?? "Unknown error",
      ...(getErrorCode(candidate.code) === undefined
        ? {}
        : { errorCode: getErrorCode(candidate.code) }),
      ...(getErrorStatus(candidate.status) === undefined
        ? {}
        : { status: getErrorStatus(candidate.status) }),
    };
  }

  if (typeof error === "string") {
    return {
      errorName: "Error",
      errorMessage: normalizeShortText(error, 320) ?? "Unknown error",
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const errorName = normalizeShortText(record.name, 80) ?? "Error";
    const errorMessage = normalizeShortText(record.message, 320)
      ?? normalizeShortText(String(error), 320)
      ?? "Unknown error";

    return {
      errorName,
      errorMessage,
      ...(getErrorCode(record.code) === undefined
        ? {}
        : { errorCode: getErrorCode(record.code) }),
      ...(getErrorStatus(record.status) === undefined
        ? {}
        : { status: getErrorStatus(record.status) }),
    };
  }

  return undefined;
}

export function sanitizeRequestId(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (
    trimmed.length < 8 ||
    trimmed.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(trimmed)
  ) {
    return null;
  }

  return trimmed;
}

export function generateRequestId(): string {
  return `req_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export function redactEmailForLog(email: string | null | undefined): string | null {
  if (typeof email !== "string") {
    return null;
  }

  const trimmed = email.trim().toLowerCase();

  if (!trimmed || !trimmed.includes("@")) {
    return null;
  }

  const [localPart, domain] = trimmed.split("@");

  if (!localPart || !domain) {
    return null;
  }

  const visiblePrefix = localPart.slice(0, 1);
  return `${visiblePrefix || "*"}***@${domain}`;
}

export function getOrCreateRequestId(request: Request): string {
  for (const headerName of REQUEST_ID_HEADER_NAMES) {
    const safeRequestId = sanitizeRequestId(request.headers.get(headerName));

    if (safeRequestId) {
      return safeRequestId;
    }
  }

  return generateRequestId();
}

export function attachRequestIdHeader(
  response: Response,
  requestId: string | null | undefined,
): Response {
  response.headers.set(
    "x-request-id",
    sanitizeRequestId(requestId) ?? generateRequestId(),
  );
  return response;
}

export function createRouteLogContext(
  request: Request,
  {
    route,
    area,
    method = request.method,
  }: {
    route: string;
    area: LogArea | string;
    method?: string | null | undefined;
  },
): RouteLogContext {
  return {
    requestId: getOrCreateRequestId(request),
    route,
    method: normalizeShortText(method, 16)?.toUpperCase() ?? request.method,
    area,
    startedAt: Date.now(),
  };
}

export function logRouteEvent(
  level: LogLevel,
  context: RouteLogContext,
  event: StructuredLogEvent,
): void {
  logStructuredEvent(level, {
    ...event,
    requestId: context.requestId,
    route: context.route,
    method: context.method,
    area: event.area ?? context.area,
    durationMs:
      typeof event.durationMs === "number" && Number.isFinite(event.durationMs)
        ? event.durationMs
        : Date.now() - context.startedAt,
  });
}

export function isLogLevelEnabled(level: LogLevel): boolean {
  if (level === "debug") {
    const debugFlag = parseBooleanEnv(process.env.LOCALMAN_ENABLE_DEBUG_LOGS);

    if (debugFlag === false) {
      return false;
    }

    if (debugFlag === true) {
      return true;
    }
  }

  if (level === "debug" && !isDebugLoggingEnabled()) {
    return false;
  }

  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[getConfiguredLogLevel()];
}

function extractAdditionalMetadata(
  event: StructuredLogEvent,
): Record<string, unknown> | undefined {
  const additionalEntries = Object.entries(event).filter(([key]) =>
    !RESERVED_LOG_FIELDS.has(key)
  );
  const additionalMetadata = additionalEntries.length > 0
    ? Object.fromEntries(additionalEntries)
    : undefined;

  const sanitizedExplicitMetadata = sanitizeLogMetadata(event.metadata ?? undefined);
  const sanitizedAdditionalMetadata = sanitizeLogMetadata(additionalMetadata);

  if (!sanitizedExplicitMetadata && !sanitizedAdditionalMetadata) {
    return undefined;
  }

  return {
    ...(sanitizedExplicitMetadata ?? {}),
    ...(sanitizedAdditionalMetadata ?? {}),
  };
}

export function createStructuredLogRecord(
  level: LogLevel,
  event: StructuredLogEvent,
): StructuredLogRecord {
  const serializedError = serializeErrorForLog(event.error);
  const errorName = normalizeShortText(event.errorName, 80)
    ?? serializedError?.errorName;
  const errorMessage = normalizeShortText(event.errorMessage, 320)
    ?? serializedError?.errorMessage;
  const errorCode = getErrorCode(event.errorCode) ?? serializedError?.errorCode;
  const status = getErrorStatus(event.status) ?? serializedError?.status;
  const metadata = extractAdditionalMetadata(event);

  return {
    timestamp: new Date().toISOString(),
    level,
    event:
      normalizeShortText(event.event, 120)
      ?? normalizeShortText(event.type, 120)
      ?? "LOG_EVENT",
    ...(normalizeShortText(event.message, 320) === undefined
      ? {}
      : { message: normalizeShortText(event.message, 320) }),
    ...(normalizeShortText(event.area, 80) === undefined
      ? {}
      : { area: normalizeShortText(event.area, 80) }),
    ...(normalizeShortText(event.route, 160) === undefined
      ? {}
      : { route: normalizeShortText(event.route, 160) }),
    ...(normalizeShortText(event.method, 16) === undefined
      ? {}
      : { method: normalizeShortText(event.method, 16)?.toUpperCase() }),
    ...(status === undefined ? {} : { status }),
    ...(typeof event.durationMs === "number" && Number.isFinite(event.durationMs)
      ? { durationMs: Math.max(0, Math.round(event.durationMs)) }
      : {}),
    ...(sanitizeRequestId(event.requestId) === null
      ? {}
      : { requestId: sanitizeRequestId(event.requestId) as string }),
    ...(normalizeShortText(event.userRole, 40) === undefined
      ? {}
      : { userRole: normalizeShortText(event.userRole, 40) }),
    ...(normalizeShortText(event.userId, 120) === undefined
      ? {}
      : { userId: normalizeShortText(event.userId, 120) }),
    ...(normalizeShortText(event.adminUserId, 120) === undefined
      ? {}
      : { adminUserId: normalizeShortText(event.adminUserId, 120) }),
    ...(normalizeShortText(event.vendorId, 120) === undefined
      ? {}
      : { vendorId: normalizeShortText(event.vendorId, 120) }),
    ...(normalizeShortText(event.vendorSlug, 160) === undefined
      ? {}
      : { vendorSlug: normalizeShortText(event.vendorSlug, 160) }),
    ...(errorCode === undefined ? {} : { errorCode }),
    ...(errorName === undefined ? {} : { errorName }),
    ...(errorMessage === undefined ? {} : { errorMessage }),
    ...(metadata === undefined ? {} : { metadata }),
  };
}

function shouldEnableOperationalEventStorage(): boolean {
  if (!isServerObservabilityRuntime()) {
    return false;
  }

  if ((process.env.NEXT_PHASE ?? "").includes("build")) {
    return false;
  }

  return parseBooleanEnv(process.env.LOCALMAN_ENABLE_OPERATIONAL_EVENT_STORAGE) === true;
}

function getOperationalEventStorageConfig(): OperationalEventStorageConfig | null {
  if (!shouldEnableOperationalEventStorage()) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    environment:
      normalizeShortText(
        process.env.LOCALMAN_RUNTIME_ENVIRONMENT
          ?? process.env.NODE_ENV
          ?? undefined,
        80,
      ) ?? null,
  };
}

export function shouldPersistOperationalLogRecord(
  record: StructuredLogRecord,
): boolean {
  if (record.level === "debug") {
    return false;
  }

  if (record.level === "error") {
    return true;
  }

  if (record.level === "info") {
    return persistedOperationalInfoEvents.has(record.event);
  }

  if (persistedPublicWarnEvents.has(record.event)) {
    return true;
  }

  if (persistedWarnEventKeywords.some((keyword) => record.event.includes(keyword))) {
    return true;
  }

  return typeof record.area === "string" && persistedLowVolumeWarnAreas.has(record.area);
}

export function buildOperationalEventInsertPayload(
  record: StructuredLogRecord,
): OperationalEventInsertRow | null {
  if (!shouldPersistOperationalLogRecord(record)) {
    return null;
  }

  const config = getOperationalEventStorageConfig();

  if (!config) {
    return null;
  }

  const metadata = {
    ...(sanitizeLogMetadata(record.metadata ?? undefined) ?? {}),
    ...(record.errorCode === undefined ? {} : { errorCode: record.errorCode }),
    ...(record.errorName === undefined ? {} : { errorName: record.errorName }),
    ...(record.errorMessage === undefined ? {} : { errorMessage: record.errorMessage }),
  };

  return {
    level: record.level,
    area: normalizeShortText(record.area, 80) ?? "unknown",
    event: record.event,
    message: normalizeShortText(record.message, 320) ?? null,
    route: normalizeShortText(record.route, 160) ?? null,
    method: normalizeShortText(record.method, 16)?.toUpperCase() ?? null,
    status: typeof record.status === "number" ? record.status : null,
    duration_ms: typeof record.durationMs === "number" ? record.durationMs : null,
    request_id: sanitizeRequestId(record.requestId) ?? null,
    actor_role: normalizeShortText(record.userRole, 40) ?? null,
    actor_id:
      normalizeShortText(record.adminUserId, 120)
      ?? normalizeShortText(record.userId, 120)
      ?? null,
    vendor_id: normalizeShortText(record.vendorId, 120) ?? null,
    vendor_slug: normalizeShortText(record.vendorSlug, 160) ?? null,
    metadata,
    environment: config.environment,
  };
}

async function persistOperationalLogRecord(
  record: StructuredLogRecord,
): Promise<void> {
  const config = getOperationalEventStorageConfig();

  if (!config) {
    return;
  }

  const payload = buildOperationalEventInsertPayload(record);

  if (!payload) {
    return;
  }

  const response = await fetch(new URL("/rest/v1/operational_events", config.supabaseUrl), {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = new Error(`Operational event persistence failed: ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
}

function writeConsoleRecordSafely(
  level: LogLevel,
  record: StructuredLogRecord,
): void {
  try {
    const logger = console[level] ?? console.info;
    logger(record);
  } catch (error) {
    writeObservabilityFallbackSafely("STRUCTURED_LOG_CONSOLE_WRITE_FAILED", error, {
      attemptedLevel: level,
      attemptedEvent: record.event,
    });
  }
}

function writeObservabilityFallbackSafely(
  event: string,
  error: unknown,
  metadata?: Record<string, unknown>,
): void {
  try {
    const fallbackRecord = {
      timestamp: new Date().toISOString(),
      level: "warn",
      event,
      area: "db",
      message: "Observability pipeline failed and was isolated from application flow.",
      ...serializeErrorForLog(error),
      metadata: sanitizeLogMetadata(metadata ?? {}),
    };
    const logger = console.warn ?? console.info;
    logger(fallbackRecord);
  } catch {
    // Observability must never become a render or request-path dependency.
  }
}

function trackOperationalEventWrite(write: Promise<void>): void {
  pendingOperationalEventWrites.add(write);
  void write.then(
    () => {
      pendingOperationalEventWrites.delete(write);
    },
    () => {
      pendingOperationalEventWrites.delete(write);
    },
  );
}

function reportOperationalEventPersistenceFailure(
  record: StructuredLogRecord,
  error: unknown,
): void {
  try {
    const now = Date.now();

    if (
      now - lastOperationalEventPersistenceFailureAt <
      operationalEventPersistenceFailureCooldownMs
    ) {
      return;
    }

    lastOperationalEventPersistenceFailureAt = now;
    writeConsoleRecordSafely("error", createStructuredLogRecord("error", {
      event: "OPERATIONAL_EVENT_PERSIST_FAILED",
      area: "db",
      route: record.route ?? null,
      method: record.method ?? null,
      requestId: record.requestId ?? null,
      message: "Operational event storage write failed.",
      error,
      metadata: {
        originalEvent: record.event,
        originalLevel: record.level,
        targetTable: "operational_events",
      },
    }));
  } catch (fallbackError) {
    writeObservabilityFallbackSafely("OPERATIONAL_EVENT_PERSIST_REPORT_FAILED", fallbackError);
  }
}

export async function flushOperationalEventWritesForTests(): Promise<void> {
  if (pendingOperationalEventWrites.size === 0) {
    return;
  }

  await Promise.allSettled(Array.from(pendingOperationalEventWrites));
}

export function resetOperationalEventPersistenceForTests(): void {
  pendingOperationalEventWrites.clear();
  lastOperationalEventPersistenceFailureAt = 0;
}

export function logStructuredEvent(
  level: LogLevel,
  event: StructuredLogEvent,
): void {
  try {
    if (!isLogLevelEnabled(level)) {
      return;
    }

    const record = createStructuredLogRecord(level, event);
    writeConsoleRecordSafely(level, record);

    const persistenceWrite = persistOperationalLogRecord(record)
      .catch((error) => {
        reportOperationalEventPersistenceFailure(record, error);
      });

    trackOperationalEventWrite(persistenceWrite);
  } catch (error) {
    writeObservabilityFallbackSafely("STRUCTURED_LOGGING_FAILED", error, {
      attemptedLevel: level,
      attemptedEvent: normalizeShortText(event.event ?? event.type, 120) ?? null,
    });
  }
}

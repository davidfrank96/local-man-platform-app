import { createHash } from "node:crypto";
import { getOrCreateRequestId, logStructuredEvent } from "../observability.ts";

const PUBLIC_CLIENT_COOKIE_NAME = "localman_public_client";
const PUBLIC_CLIENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const STORE_SWEEP_INTERVAL_MS = 30_000;

export const ADMIN_LOGIN_RATE_LIMIT = {
  id: "admin_login",
  maxRequests: 5,
  windowMs: 10 * 60_000,
  blockDurationMs: 15 * 60_000,
} as const;

export const PUBLIC_EVENT_RATE_LIMIT = {
  id: "public_events",
  maxRequests: 120,
  windowMs: 5 * 60_000,
  blockDurationMs: 2 * 60_000,
} as const;

export const PUBLIC_RATING_RATE_LIMIT = {
  id: "public_ratings",
  maxRequests: 8,
  windowMs: 10 * 60_000,
  blockDurationMs: 10 * 60_000,
} as const;

export const PUBLIC_NEARBY_SEARCH_RATE_LIMIT = {
  id: "public_nearby_search",
  maxRequests: 45,
  windowMs: 60_000,
  blockDurationMs: 2 * 60_000,
} as const;

type RateLimitPolicy = {
  id: string;
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
  blockedUntil: number | null;
};

type StoredSingleFlightEntry = {
  expiresAt: number;
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type AbuseProtectionStore = {
  buckets: Map<string, RateLimitBucket>;
  singleFlight: Map<string, StoredSingleFlightEntry>;
  lastSweepAt: number;
};

type ConsumeRateLimitOptions = {
  policy: RateLimitPolicy;
  scope?: string | null;
  sessionHint?: string | null;
  useClientCookie?: boolean;
};

export type RateLimitDecision = {
  allowed: boolean;
  policy: RateLimitPolicy;
  identityKey: string;
  identifierHash: string;
  responseClientId: string | null;
  shouldSetClientCookie: boolean;
  remaining: number;
  limit: number;
  resetInSeconds: number;
  retryAfterSeconds: number;
};

declare global {
  var __localmanAbuseProtectionStore: AbuseProtectionStore | undefined;
}

function getStore(): AbuseProtectionStore {
  if (!globalThis.__localmanAbuseProtectionStore) {
    globalThis.__localmanAbuseProtectionStore = {
      buckets: new Map<string, RateLimitBucket>(),
      singleFlight: new Map<string, StoredSingleFlightEntry>(),
      lastSweepAt: 0,
    };
  }

  return globalThis.__localmanAbuseProtectionStore;
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function isProductionLikeRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

function parseCookies(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();

  for (const segment of String(header ?? "").split(";")) {
    const [rawName, ...rawValueParts] = segment.split("=");
    const name = rawName?.trim();

    if (!name) {
      continue;
    }

    cookies.set(name, decodeURIComponent(rawValueParts.join("=").trim()));
  }

  return cookies;
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  const candidateHeaders = [
    "x-real-ip",
    "cf-connecting-ip",
    "x-client-ip",
    "fastly-client-ip",
  ];

  for (const headerName of candidateHeaders) {
    const value = request.headers.get(headerName)?.trim();

    if (value) {
      return value;
    }
  }

  return "unknown";
}

function getOrCreatePublicClientId(request: Request, useClientCookie: boolean): {
  identityClientId: string | null;
  responseClientId: string | null;
  shouldSetClientCookie: boolean;
} {
  if (!useClientCookie) {
    return {
      identityClientId: null,
      responseClientId: null,
      shouldSetClientCookie: false,
    };
  }

  const cookies = parseCookies(request.headers.get("cookie"));
  const existing = cookies.get(PUBLIC_CLIENT_COOKIE_NAME)?.trim();

  if (existing) {
    return {
      identityClientId: existing,
      responseClientId: existing,
      shouldSetClientCookie: false,
    };
  }

  return {
    identityClientId: null,
    responseClientId: crypto.randomUUID(),
    shouldSetClientCookie: true,
  };
}

export function getExistingPublicClientId(request: Request): string | null {
  const cookies = parseCookies(request.headers.get("cookie"));
  const existing = cookies.get(PUBLIC_CLIENT_COOKIE_NAME)?.trim();

  return existing && existing.length > 0 ? existing : null;
}

function sweepStore(nowMs: number): void {
  const store = getStore();

  if (nowMs - store.lastSweepAt < STORE_SWEEP_INTERVAL_MS) {
    return;
  }

  store.lastSweepAt = nowMs;

  for (const [key, bucket] of store.buckets.entries()) {
    const bucketExpired =
      bucket.resetAt <= nowMs &&
      (bucket.blockedUntil === null || bucket.blockedUntil <= nowMs);

    if (bucketExpired) {
      store.buckets.delete(key);
    }
  }

  for (const [key, entry] of store.singleFlight.entries()) {
    if (entry.expiresAt <= nowMs) {
      store.singleFlight.delete(key);
    }
  }
}

function serializeScope(scope: string | null | undefined): string {
  return typeof scope === "string" && scope.trim().length > 0
    ? scope.trim().toLowerCase()
    : "global";
}

function buildIdentityKey(
  request: Request,
  {
    policy,
    scope,
    useClientCookie = true,
  }: ConsumeRateLimitOptions,
): {
  identityKey: string;
  identifierHash: string;
  responseClientId: string | null;
  shouldSetClientCookie: boolean;
} {
  const client = getOrCreatePublicClientId(request, useClientCookie);
  const ip = getClientIp(request);
  const normalizedScope = serializeScope(scope);

  const identitySeed = [
    policy.id,
    `scope:${normalizedScope}`,
    `ip:${ip}`,
    `client:${client.identityClientId ?? "none"}`,
  ].join("|");

  return {
    identityKey: identitySeed,
    identifierHash: hashValue(identitySeed),
    responseClientId: client.responseClientId,
    shouldSetClientCookie: client.shouldSetClientCookie,
  };
}

function computeResetInSeconds(resetAtMs: number, nowMs: number): number {
  return Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
}

export function consumeRateLimit(
  request: Request,
  options: ConsumeRateLimitOptions,
): RateLimitDecision {
  const nowMs = Date.now();
  sweepStore(nowMs);

  const identity = buildIdentityKey(request, options);
  const store = getStore();
  const existing = store.buckets.get(identity.identityKey);
  const resetAt = existing && existing.resetAt > nowMs
    ? existing.resetAt
    : nowMs + options.policy.windowMs;
  const bucket: RateLimitBucket = existing && existing.resetAt > nowMs
    ? existing
    : {
      count: 0,
      resetAt,
      blockedUntil: null,
    };

  if (bucket.blockedUntil !== null && bucket.blockedUntil > nowMs) {
    const retryAfterSeconds = computeResetInSeconds(bucket.blockedUntil, nowMs);

    return {
      allowed: false,
      policy: options.policy,
      identityKey: identity.identityKey,
      identifierHash: identity.identifierHash,
      responseClientId: identity.responseClientId,
      shouldSetClientCookie: identity.shouldSetClientCookie,
      remaining: 0,
      limit: options.policy.maxRequests,
      resetInSeconds: retryAfterSeconds,
      retryAfterSeconds,
    };
  }

  bucket.count += 1;

  if (bucket.count > options.policy.maxRequests) {
    const blockedUntil = Math.max(
      bucket.resetAt,
      nowMs + (options.policy.blockDurationMs ?? options.policy.windowMs),
    );
    bucket.blockedUntil = blockedUntil;
    store.buckets.set(identity.identityKey, bucket);

    const requestId = getOrCreateRequestId(request);
    const requestPath = new URL(request.url).pathname;
    const retryAfterSeconds = computeResetInSeconds(blockedUntil, nowMs);

    logStructuredEvent("warn", {
      type: "PUBLIC_ABUSE_RATE_LIMITED",
      requestId,
      path: requestPath,
      policyId: options.policy.id,
      scope: serializeScope(options.scope),
      identifierHash: identity.identifierHash,
      retryAfterSeconds,
      sessionHintPresent: Boolean(options.sessionHint),
      clientCookiePresent: !identity.shouldSetClientCookie,
    });

    return {
      allowed: false,
      policy: options.policy,
      identityKey: identity.identityKey,
      identifierHash: identity.identifierHash,
      responseClientId: identity.responseClientId,
      shouldSetClientCookie: identity.shouldSetClientCookie,
      remaining: 0,
      limit: options.policy.maxRequests,
      resetInSeconds: retryAfterSeconds,
      retryAfterSeconds,
    };
  }

  store.buckets.set(identity.identityKey, bucket);

  return {
    allowed: true,
    policy: options.policy,
    identityKey: identity.identityKey,
    identifierHash: identity.identifierHash,
    responseClientId: identity.responseClientId,
    shouldSetClientCookie: identity.shouldSetClientCookie,
    remaining: Math.max(0, options.policy.maxRequests - bucket.count),
    limit: options.policy.maxRequests,
    resetInSeconds: computeResetInSeconds(bucket.resetAt, nowMs),
    retryAfterSeconds: 0,
  };
}

export function applyRateLimitResponseHeaders(
  response: Response,
  decision: RateLimitDecision,
): Response {
  response.headers.set("RateLimit-Limit", String(decision.limit));
  response.headers.set("RateLimit-Remaining", String(decision.remaining));
  response.headers.set("RateLimit-Reset", String(decision.resetInSeconds));

  if (!decision.allowed) {
    response.headers.set("Retry-After", String(decision.retryAfterSeconds));
  }

  if (decision.shouldSetClientCookie && decision.responseClientId) {
    response.headers.append(
      "set-cookie",
      [
        `${PUBLIC_CLIENT_COOKIE_NAME}=${encodeURIComponent(decision.responseClientId)}`,
        "Path=/",
        `Max-Age=${PUBLIC_CLIENT_COOKIE_MAX_AGE_SECONDS}`,
        "HttpOnly",
        "SameSite=Lax",
        isProductionLikeRuntime() ? "Secure" : "",
      ].filter(Boolean).join("; "),
    );
  }

  return response;
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entryValue]) => `"${key}":${stableStringify(entryValue)}`);

    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

export type SingleFlightGuard<T> =
  | {
      status: "joined";
      promise: Promise<T>;
    }
  | {
      status: "fresh";
      resolve: (value: T) => void;
      reject: (reason?: unknown) => void;
    };

export function startSingleFlightGuard<T>(
  key: string,
  ttlMs: number,
): SingleFlightGuard<T> {
  const nowMs = Date.now();
  sweepStore(nowMs);

  const store = getStore();
  const existing = store.singleFlight.get(key);

  if (existing && existing.expiresAt > nowMs) {
    return {
      status: "joined",
      promise: existing.promise as Promise<T>,
    };
  }

  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  void promise.catch(() => {});

  const entry: StoredSingleFlightEntry = {
    expiresAt: nowMs + ttlMs,
    promise,
    resolve: resolvePromise as (value: unknown) => void,
    reject: rejectPromise,
  };

  store.singleFlight.set(key, entry);

  return {
    status: "fresh",
    resolve(value: T) {
      entry.expiresAt = Date.now() + ttlMs;
      entry.resolve(value);
    },
    reject(reason?: unknown) {
      const activeEntry = store.singleFlight.get(key);

      if (activeEntry === entry) {
        store.singleFlight.delete(key);
      }

      entry.reject(reason);
    },
  };
}

export function resetAbuseProtectionStateForTests(): void {
  const store = getStore();
  store.buckets.clear();
  store.singleFlight.clear();
  store.lastSweepAt = 0;
}

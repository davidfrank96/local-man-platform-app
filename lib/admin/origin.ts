import { apiError } from "../api/responses.ts";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

function toOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function firstHeaderToken(value: string | null): string | null {
  const token = value?.split(",")[0]?.trim();

  return token || null;
}

function normalizeForwardedHeaderValue(value: string | undefined): string | null {
  const normalized = value?.trim().replace(/^"|"$/g, "");

  return normalized || null;
}

function parseForwardedHeader(value: string | null): { host: string | null; proto: string | null } {
  const forwarded = firstHeaderToken(value);

  if (!forwarded) {
    return {
      host: null,
      proto: null,
    };
  }

  const pairs = Object.fromEntries(
    forwarded
      .split(";")
      .map((part) => part.trim().split("=", 2))
      .filter(([key, pairValue]) => key && pairValue)
      .map(([key, pairValue]) => [key.toLowerCase(), normalizeForwardedHeaderValue(pairValue)]),
  );

  return {
    host: pairs.host ?? null,
    proto: pairs.proto ?? null,
  };
}

function normalizeProtocol(value: string | null): "http" | "https" | null {
  const protocol = value?.replace(/:$/, "").toLowerCase();

  return protocol === "http" || protocol === "https" ? protocol : null;
}

function originFromHostAndProtocol(host: string | null, protocol: string | null): string | null {
  const normalizedHost = host?.trim();
  const normalizedProtocol = normalizeProtocol(protocol);

  if (!normalizedHost || !normalizedProtocol) {
    return null;
  }

  return toOrigin(`${normalizedProtocol}://${normalizedHost}`);
}

function addOrigin(origins: Set<string>, origin: string | null) {
  if (origin) {
    origins.add(origin);
  }
}

function getRequestOriginCandidates(request: Request): Set<string> {
  const origins = new Set<string>();
  const requestUrl = new URL(request.url);
  const requestProtocol = requestUrl.protocol.replace(/:$/, "");
  const forwarded = parseForwardedHeader(request.headers.get("forwarded"));
  const forwardedProto = normalizeProtocol(firstHeaderToken(request.headers.get("x-forwarded-proto")))
    ?? normalizeProtocol(forwarded.proto);
  const forwardedHost = firstHeaderToken(request.headers.get("x-forwarded-host")) ?? forwarded.host;
  const host = firstHeaderToken(request.headers.get("host"));

  addOrigin(origins, requestUrl.origin);
  addOrigin(origins, originFromHostAndProtocol(host, forwardedProto ?? requestProtocol));
  addOrigin(origins, originFromHostAndProtocol(forwardedHost, forwardedProto ?? requestProtocol));
  addOrigin(origins, toOrigin(process.env.NEXT_PUBLIC_APP_URL ?? null));

  return origins;
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);

    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isAllowedAdminOrigin(requestOrigins: Set<string>, candidateOrigin: string): boolean {
  if (requestOrigins.has(candidateOrigin)) {
    return true;
  }

  if (!isProductionRuntime() && isLocalhostOrigin(candidateOrigin)) {
    return [...requestOrigins].some((requestOrigin) =>
      isLocalhostOrigin(requestOrigin) &&
      new URL(requestOrigin).port === new URL(candidateOrigin).port
    );
  }

  return false;
}

export function validateAdminUnsafeRequestOrigin(request: Request): Response | null {
  if (!UNSAFE_METHODS.has(request.method.toUpperCase())) {
    return null;
  }

  const requestOrigins = getRequestOriginCandidates(request);
  const origin = toOrigin(request.headers.get("origin"));
  const referer = toOrigin(request.headers.get("referer"));

  if (origin && isAllowedAdminOrigin(requestOrigins, origin)) {
    return null;
  }

  if (!origin && referer && isAllowedAdminOrigin(requestOrigins, referer)) {
    return null;
  }

  if (!origin && !referer && !isProductionRuntime()) {
    return null;
  }

  return apiError(
    "FORBIDDEN",
    "Admin request origin is not allowed.",
    403,
    undefined,
    "Admin mutations must come from the Localman admin origin.",
  );
}

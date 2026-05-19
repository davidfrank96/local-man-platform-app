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

function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);

    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isAllowedAdminOrigin(requestOrigin: string, candidateOrigin: string): boolean {
  if (candidateOrigin === requestOrigin) {
    return true;
  }

  if (!isProductionRuntime() && isLocalhostOrigin(requestOrigin) && isLocalhostOrigin(candidateOrigin)) {
    return new URL(requestOrigin).port === new URL(candidateOrigin).port;
  }

  return false;
}

export function validateAdminUnsafeRequestOrigin(request: Request): Response | null {
  if (!UNSAFE_METHODS.has(request.method.toUpperCase())) {
    return null;
  }

  const requestOrigin = new URL(request.url).origin;
  const origin = toOrigin(request.headers.get("origin"));
  const referer = toOrigin(request.headers.get("referer"));

  if (origin && isAllowedAdminOrigin(requestOrigin, origin)) {
    return null;
  }

  if (!origin && referer && isAllowedAdminOrigin(requestOrigin, referer)) {
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

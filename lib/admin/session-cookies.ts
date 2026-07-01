import { AppError } from "../errors/app-error.ts";
import type { AdminAuthConfig, SupabaseAuthUser } from "./auth.ts";

export const ADMIN_ACCESS_COOKIE_NAME = "localman_admin_access";
export const ADMIN_REFRESH_COOKIE_NAME = "localman_admin_refresh";
export const ADMIN_SESSION_COOKIE_NAME = "localman_admin_session";

const ADMIN_ACCESS_COOKIE_FALLBACK_MAX_AGE_SECONDS = 60 * 60;
const ADMIN_REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SupabaseAuthPayload = {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number;
  expires_at?: number;
  user?: {
    id?: string;
    email?: string;
  };
  error_description?: string;
  msg?: string;
};

export type AdminCookieSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  user: SupabaseAuthUser;
};

function toExpiresAt(payload: SupabaseAuthPayload): number | null {
  if (typeof payload.expires_at === "number") {
    return payload.expires_at * 1000;
  }

  if (typeof payload.expires_in === "number") {
    return Date.now() + payload.expires_in * 1000;
  }

  return null;
}

function serializeCookie(
  name: string,
  value: string,
  {
    maxAge,
    httpOnly = true,
    sameSite = "Lax",
    secure = process.env.NODE_ENV === "production",
    path = "/",
  }: {
    maxAge?: number;
    httpOnly?: boolean;
    sameSite?: "Lax" | "Strict" | "None";
    secure?: boolean;
    path?: string;
  } = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];

  if (httpOnly) {
    parts.push("HttpOnly");
  }

  if (secure) {
    parts.push("Secure");
  }

  if (typeof maxAge === "number" && Number.isFinite(maxAge)) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  }

  return parts.join("; ");
}

function parseCookieHeader(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();

  if (!header) {
    return cookies;
  }

  for (const chunk of header.split(";")) {
    const [rawName, ...rest] = chunk.split("=");
    const name = rawName?.trim();

    if (!name) {
      continue;
    }

    const value = rest.join("=").trim();
    cookies.set(name, decodeURIComponent(value));
  }

  return cookies;
}

export function createAdminCookieSession(payload: SupabaseAuthPayload): AdminCookieSession {
  if (!payload.access_token || !payload.user?.id) {
    throw new AppError(
      "INVALID_RESPONSE",
      "Unable to restore the admin session.",
      502,
      payload,
      "Supabase authentication did not return a valid session.",
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: toExpiresAt(payload),
    user: {
      id: payload.user.id,
      email: payload.user.email,
    },
  };
}

export function readAdminSessionCookies(request: Request): {
  accessToken: string | null;
  refreshToken: string | null;
  adminSessionId: string | null;
} {
  const cookies = parseCookieHeader(request.headers.get("cookie"));

  return {
    accessToken: cookies.get(ADMIN_ACCESS_COOKIE_NAME) ?? null,
    refreshToken: cookies.get(ADMIN_REFRESH_COOKIE_NAME) ?? null,
    adminSessionId: cookies.get(ADMIN_SESSION_COOKIE_NAME) ?? null,
  };
}

export function appendAdminSessionCookies(
  headers: Headers,
  session: AdminCookieSession,
  options: {
    adminSessionId?: string | null;
    adminSessionMaxAgeSeconds?: number | null;
  } = {},
): void {
  const accessMaxAge = session.expiresAt
    ? Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))
    : ADMIN_ACCESS_COOKIE_FALLBACK_MAX_AGE_SECONDS;

  headers.append(
    "set-cookie",
    serializeCookie(ADMIN_ACCESS_COOKIE_NAME, session.accessToken, {
      maxAge: accessMaxAge,
    }),
  );

  if (session.refreshToken) {
    headers.append(
      "set-cookie",
      serializeCookie(ADMIN_REFRESH_COOKIE_NAME, session.refreshToken, {
        maxAge: ADMIN_REFRESH_COOKIE_MAX_AGE_SECONDS,
      }),
    );
  } else {
    headers.append(
      "set-cookie",
      serializeCookie(ADMIN_REFRESH_COOKIE_NAME, "", {
        maxAge: 0,
      }),
    );
  }

  if (options.adminSessionId) {
    headers.append(
      "set-cookie",
      serializeCookie(ADMIN_SESSION_COOKIE_NAME, options.adminSessionId, {
        maxAge: options.adminSessionMaxAgeSeconds ?? ADMIN_REFRESH_COOKIE_MAX_AGE_SECONDS,
      }),
    );
  }
}

export function appendAdminSessionIdCookie(
  headers: Headers,
  adminSessionId: string,
  maxAgeSeconds: number,
): void {
  headers.append(
    "set-cookie",
    serializeCookie(ADMIN_SESSION_COOKIE_NAME, adminSessionId, {
      maxAge: maxAgeSeconds,
    }),
  );
}

export function appendClearedAdminSessionCookies(headers: Headers): void {
  headers.append(
    "set-cookie",
    serializeCookie(ADMIN_ACCESS_COOKIE_NAME, "", {
      maxAge: 0,
    }),
  );
  headers.append(
    "set-cookie",
    serializeCookie(ADMIN_REFRESH_COOKIE_NAME, "", {
      maxAge: 0,
    }),
  );
  headers.append(
    "set-cookie",
    serializeCookie(ADMIN_SESSION_COOKIE_NAME, "", {
      maxAge: 0,
    }),
  );
}

async function requestSupabaseAuth(
  config: AdminAuthConfig,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<SupabaseAuthPayload> {
  const response = await fetchImpl(new URL(path, config.supabaseUrl), {
    ...init,
    headers: {
      apikey: config.supabaseAnonKey,
      "content-type": "application/json",
      ...init.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as SupabaseAuthPayload | null;

  if (!response.ok) {
    throw new AppError(
      "AUTH_ERROR",
      payload?.error_description ?? payload?.msg ?? "Admin authentication failed.",
      response.status,
      payload,
      "Supabase authentication rejected the session request.",
    );
  }

  if (!payload) {
    throw new AppError(
      "INVALID_RESPONSE",
      "Unable to restore the admin session.",
      502,
      undefined,
      "Supabase authentication returned an empty response.",
    );
  }

  return payload;
}

export async function signInAdminCookieSession(
  email: string,
  password: string,
  config: AdminAuthConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<AdminCookieSession> {
  const payload = await requestSupabaseAuth(
    config,
    "/auth/v1/token?grant_type=password",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    },
    fetchImpl,
  );

  return createAdminCookieSession(payload);
}

export async function refreshAdminCookieSession(
  refreshToken: string,
  config: AdminAuthConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<AdminCookieSession> {
  const payload = await requestSupabaseAuth(
    config,
    "/auth/v1/token?grant_type=refresh_token",
    {
      method: "POST",
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    },
    fetchImpl,
  );

  return createAdminCookieSession(payload);
}

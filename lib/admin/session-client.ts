import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AdminRole } from "../../types/index.ts";
import { AppError, mapExternalError } from "../errors/app-error.ts";
import { logStructuredEvent } from "../observability.ts";

const ADMIN_SESSION_STORAGE_KEY = "local-man-admin-session";

export type StoredAdminSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  user: {
    id: string;
    email?: string;
  };
};

export type AdminSessionIdentity = {
  user: {
    id: string;
    email?: string;
  };
  adminUser: {
    id: string;
    email: string;
    full_name: string | null;
    role: AdminRole;
  };
};

type SupabaseAuthPayload = {
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

type SessionClientConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export class AdminSessionError extends AppError {}
let browserAdminSupabaseClient: SupabaseClient | null = null;

function logAdminSessionEvent(
  level: "info" | "warn" | "error",
  message: string,
  details: Record<string, unknown>,
) {
  logStructuredEvent(level, {
    type: level === "error" ? "ERROR" : "ADMIN_SESSION_EVENT",
    message,
    context: "admin_session",
    ...details,
  });
}

function getClientConfig(): SessionClientConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new AdminSessionError(
      "CONFIG_ERROR",
      "System configuration error.",
      503,
      { missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] },
      "Supabase public environment variables are required for admin login.",
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

function getBrowserAdminSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (browserAdminSupabaseClient) {
    return browserAdminSupabaseClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getClientConfig();
  browserAdminSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return browserAdminSupabaseClient;
}

function toExpiresAt(payload: SupabaseAuthPayload): number | null {
  if (typeof payload.expires_at === "number") {
    return payload.expires_at * 1000;
  }

  if (typeof payload.expires_in === "number") {
    return Date.now() + payload.expires_in * 1000;
  }

  return null;
}

function createSessionFromPayload(payload: SupabaseAuthPayload): StoredAdminSession {
  if (!payload.access_token || !payload.user?.id) {
    throw new AdminSessionError(
      "INVALID_RESPONSE",
      "Unable to restore the admin session.",
      502,
      payload,
      "Supabase login did not return a valid session.",
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

export async function syncAdminBrowserSession(session: StoredAdminSession): Promise<void> {
  if (!session.refreshToken) {
    return;
  }

  const client = getBrowserAdminSupabaseClient();

  if (!client) {
    return;
  }

  await client.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  }).catch(() => undefined);
}

export async function clearAdminBrowserSession(): Promise<void> {
  let client: SupabaseClient | null = null;

  try {
    client = getBrowserAdminSupabaseClient();
  } catch {
    client = null;
  }

  if (!client) {
    return;
  }

  await client.auth.signOut().catch(() => undefined);
}

export async function getCurrentAdminAccessToken(): Promise<string | null> {
  const storedToken = readStoredAdminSession()?.accessToken ?? null;
  let client: SupabaseClient | null = null;

  try {
    client = getBrowserAdminSupabaseClient();
  } catch {
    client = null;
  }

  if (client) {
    const { data } = await client.auth.getSession().catch(() => ({ data: { session: null } }));
    const liveToken = data.session?.access_token ?? null;

    if (liveToken) {
      return liveToken;
    }
  }

  return storedToken;
}

async function requestSupabaseAuth(
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<SupabaseAuthPayload> {
  const config = getClientConfig();
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
    throw new AdminSessionError(
      "AUTH_ERROR",
      payload?.error_description ?? payload?.msg ?? "Admin authentication failed.",
      response.status,
      payload,
      "Supabase authentication rejected the login request.",
    );
  }

  if (!payload) {
    throw new AdminSessionError(
      "INVALID_RESPONSE",
      "Unable to restore the admin session.",
      502,
      undefined,
      "Supabase authentication returned an empty response.",
    );
  }

  return payload;
}

export async function signInAdminSession(
  email: string,
  password: string,
  fetchImpl?: typeof fetch,
): Promise<StoredAdminSession> {
  try {
    const payload = await requestSupabaseAuth(
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

    const session = createSessionFromPayload(payload);
    await syncAdminBrowserSession(session);

    logAdminSessionEvent("info", "password sign-in succeeded", {
      email,
      userId: session.user.id,
    });

    return session;
  } catch (error) {
    const mapped = error instanceof AdminSessionError
      ? error
      : mapExternalError(error, {
        code: "UNKNOWN_ERROR",
        message: "Admin authentication failed.",
        status: 502,
        detail: "The login flow failed unexpectedly.",
      });
    logAdminSessionEvent("warn", "password sign-in failed", {
      email,
      code: mapped.code,
      status: mapped.status ?? null,
      detail: mapped.detail ?? null,
      message: mapped.message,
    });
    throw mapped;
  }
}

export async function refreshAdminSession(
  refreshToken: string,
  fetchImpl?: typeof fetch,
): Promise<StoredAdminSession> {
  const payload = await requestSupabaseAuth(
    "/auth/v1/token?grant_type=refresh_token",
    {
      method: "POST",
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    },
    fetchImpl,
  );

  const session = createSessionFromPayload(payload);
  await syncAdminBrowserSession(session);
  return session;
}

export async function signOutAdminSession(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const config = getClientConfig();

  await fetchImpl(new URL("/auth/v1/logout", config.supabaseUrl), {
    method: "POST",
    headers: {
      apikey: config.supabaseAnonKey,
      authorization: `Bearer ${accessToken}`,
    },
  }).catch(() => undefined);
  await clearAdminBrowserSession();
}

export function persistAdminSession(session: StoredAdminSession): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function readStoredAdminSession(): StoredAdminSession | null {
  if (typeof window === "undefined") return null;

  const rawValue = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);

  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as StoredAdminSession;

    if (!parsed.accessToken || !parsed.user?.id) {
      clearStoredAdminSession();
      return null;
    }

    return parsed;
  } catch {
    clearStoredAdminSession();
    return null;
  }
}

export function clearStoredAdminSession(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  void clearAdminBrowserSession();
}

export async function fetchAdminSessionIdentity(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AdminSessionIdentity> {
  const resolvedAccessToken = await getCurrentAdminAccessToken().catch(() => null) ?? accessToken;
  const response = await fetchImpl("/api/admin/session", {
    headers: {
      authorization: `Bearer ${resolvedAccessToken}`,
      "x-request-id": crypto.randomUUID(),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        success: boolean;
        data: AdminSessionIdentity | null;
        error?: {
          code?: string;
          message?: string;
          detail?: string;
          details?: unknown;
        } | null;
      }
    | null;

  if (!response.ok || !payload?.success || !payload.data) {
    logAdminSessionEvent("warn", "admin identity validation failed", {
      status: response.status,
      code: payload?.error?.code ?? "SESSION_ERROR",
      message: payload?.error?.message ?? "Unable to validate admin session.",
    });
    throw new AdminSessionError(
      (payload?.error?.code as import("../api/contracts.ts").AppErrorCode | undefined) ?? "SESSION_ERROR",
      payload?.error?.message ?? "Unable to validate admin session.",
      response.status,
      payload?.error?.details,
      payload?.error?.detail,
    );
  }

  logAdminSessionEvent("info", "admin identity validated", {
    userId: payload.data.user.id,
    role: payload.data.adminUser.role,
  });

  return payload.data;
}

export function shouldRefreshAdminSession(session: StoredAdminSession): boolean {
  if (!session.refreshToken || !session.expiresAt) {
    return false;
  }

  return session.expiresAt - Date.now() <= 60_000;
}

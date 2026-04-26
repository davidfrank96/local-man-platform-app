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
    role: string;
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

export class AdminSessionError extends Error {
  code: string;

  status: number;

  details: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "AdminSessionError";
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function logAdminSessionEvent(
  level: "info" | "warn" | "error",
  message: string,
  details: Record<string, unknown>,
) {
  const logger = console[level] ?? console.info;
  logger(`[admin][session] ${message}`, details);
}

function getClientConfig(): SessionClientConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new AdminSessionError(
      "CONFIGURATION_ERROR",
      "Supabase public environment variables are required for admin login.",
      503,
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
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
      "Supabase login did not return a valid session.",
      502,
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
    );
  }

  if (!payload) {
    throw new AdminSessionError(
      "INVALID_RESPONSE",
      "Supabase authentication returned an empty response.",
      502,
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

    logAdminSessionEvent("info", "password sign-in succeeded", {
      email,
      userId: session.user.id,
    });

    return session;
  } catch (error) {
    logAdminSessionEvent("warn", "password sign-in failed", {
      email,
      code: error instanceof AdminSessionError ? error.code : "UNKNOWN_ERROR",
      status: error instanceof AdminSessionError ? error.status : null,
      message: error instanceof Error ? error.message : "Admin authentication failed.",
    });
    throw error;
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

  return createSessionFromPayload(payload);
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
}

export async function fetchAdminSessionIdentity(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AdminSessionIdentity> {
  const response = await fetchImpl("/api/admin/session", {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        success: boolean;
        data: AdminSessionIdentity | null;
        error?: {
          code?: string;
          message?: string;
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
      payload?.error?.code ?? "SESSION_ERROR",
      payload?.error?.message ?? "Unable to validate admin session.",
      response.status,
      payload?.error?.details,
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

import { apiError } from "../api/responses.ts";
import { AppError } from "../errors/app-error.ts";
import { getOrCreateRequestId, logStructuredEvent } from "../observability.ts";
import {
  appendAdminSessionCookies,
  appendClearedAdminSessionCookies,
  readAdminSessionCookies,
  refreshAdminCookieSession,
} from "./session-cookies.ts";
import {
  hasAdminPermission,
  isAdminRole,
  type AdminPermission,
  type AdminRole,
} from "./rbac.ts";

export type AdminAuthConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string | null;
};

export type SupabaseAuthUser = {
  id: string;
  email?: string;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
};

export type AdminSession = {
  requestId: string;
  accessToken: string;
  user: SupabaseAuthUser;
  adminUser: AdminUserRecord;
};

type AdminAuthSuccess = {
  success: true;
  session: AdminSession;
  responseHeaders?: Headers | null;
};

type AdminAuthFailure = {
  success: false;
  response: Response;
};

type RequireAdminOptions = {
  config?: AdminAuthConfig | null;
  fetchImpl?: typeof fetch;
  allowCookieRefresh?: boolean;
};

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

function logAdminAuthEvent(
  level: "info" | "warn" | "error",
  message: string,
  details: Record<string, unknown>,
) {
  logStructuredEvent(level, {
    type: "ADMIN_AUTH_EVENT",
    message,
    ...details,
  });
}

export function getAdminAuthConfig(): AdminAuthConfig | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? null;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey: supabaseServiceRoleKey || null,
  };
}

export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

function mergeResponseHeaders(response: Response, headers?: Headers | null): Response {
  if (!headers) {
    return response;
  }

  const setCookies = typeof (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function"
    ? (headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
    : [];

  for (const value of setCookies) {
    response.headers.append("set-cookie", value);
  }

  headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie" && setCookies.length > 0) {
      return;
    }

    response.headers.append(key, value);
  });

  return response;
}

function createAuthFailureResponse(
  {
    code,
    message,
    status,
    details,
    detail,
    clearCookies = false,
  }: {
    code: import("../api/contracts.ts").AppErrorCode;
    message: string;
    status: number;
    details?: unknown;
    detail?: string;
    clearCookies?: boolean;
  },
): AdminAuthFailure {
  const response = apiError(code, message, status, details, detail);

  if (clearCookies) {
    appendClearedAdminSessionCookies(response.headers);
  }

  return {
    success: false,
    response,
  };
}

export function applyAdminSessionResponseHeaders(
  response: Response,
  headers?: Headers | null,
): Response {
  return mergeResponseHeaders(response, headers);
}

async function fetchAuthUser(
  accessToken: string,
  config: AdminAuthConfig,
  fetchImpl: typeof fetch,
): Promise<SupabaseAuthUser | null> {
  const response = await fetchImpl(new URL("/auth/v1/user", config.supabaseUrl), {
    headers: {
      apikey: config.supabaseAnonKey,
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;

  const user = (await response.json()) as Partial<SupabaseAuthUser>;

  if (!user.id) return null;

  return {
    id: user.id,
    email: user.email,
  };
}

async function fetchAdminUser(
  userId: string,
  accessToken: string,
  config: AdminAuthConfig,
  fetchImpl: typeof fetch,
): Promise<AdminUserRecord | null> {
  const url = new URL("/rest/v1/admin_users", config.supabaseUrl);
  url.searchParams.set("id", `eq.${userId}`);
  url.searchParams.set("select", "id,email,full_name,role");
  url.searchParams.set("limit", "1");

  const adminLookupToken = config.supabaseServiceRoleKey?.trim() || accessToken;
  const adminLookupKey = config.supabaseServiceRoleKey?.trim() || config.supabaseAnonKey;

  const response = await fetchImpl(url, {
    headers: {
      apikey: adminLookupKey,
      authorization: `Bearer ${adminLookupToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Admin user lookup failed: ${response.status}`);
  }

  const rows = (await response.json()) as Array<{
    id: string;
    email: string;
    full_name: string | null;
    role: string;
  }>;
  const adminUser = rows[0] ?? null;

  if (!adminUser) {
    return null;
  }

  if (!isAdminRole(adminUser.role)) {
    throw new Error(`Unsupported admin role: ${adminUser.role}`);
  }

  return {
    ...adminUser,
    role: adminUser.role,
  };
}

export async function requireAdmin(
  request: Request,
  {
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
    allowCookieRefresh = false,
  }: RequireAdminOptions = {},
): Promise<AdminAuthResult> {
  const bearerToken = getBearerToken(request);
  const requestId = getOrCreateRequestId(request);

  if (!config) {
    return {
      success: false,
      response: apiError(
        "CONFIGURATION_ERROR",
        "Supabase environment variables are required for admin authentication.",
        503,
      ),
    };
  }

  const cookieSession = readAdminSessionCookies(request);
  const usingCookieSession = !bearerToken && !!(cookieSession.accessToken || cookieSession.refreshToken);
  let accessToken = bearerToken ?? cookieSession.accessToken;
  const responseHeaders = new Headers();
  let hasRefreshedCookieSession = false;

  const refreshCookieSession = async () => {
    if (bearerToken || !allowCookieRefresh || !cookieSession.refreshToken) {
      return false;
    }

    const refreshedSession = await refreshAdminCookieSession(
      cookieSession.refreshToken,
      config,
      fetchImpl,
    );
    accessToken = refreshedSession.accessToken;
    appendAdminSessionCookies(responseHeaders, refreshedSession);
    hasRefreshedCookieSession = true;
    return true;
  };

  try {
    if (!accessToken) {
      if (!(await refreshCookieSession())) {
        return createAuthFailureResponse({
          code: "UNAUTHORIZED",
          message: "Admin session is missing. Sign in again.",
          status: 401,
          clearCookies: usingCookieSession,
        });
      }
    }

    let user = accessToken ? await fetchAuthUser(accessToken, config, fetchImpl) : null;

    if (!user && !hasRefreshedCookieSession && await refreshCookieSession()) {
      user = accessToken ? await fetchAuthUser(accessToken, config, fetchImpl) : null;
    }

    if (!user || !accessToken) {
      logAdminAuthEvent("warn", "session rejected because auth user lookup returned no user", {
        requestId,
        hasAccessToken: !!accessToken,
        usedCookieSession: usingCookieSession,
      });
      return createAuthFailureResponse({
        code: "UNAUTHORIZED",
        message: "Invalid admin session.",
        status: 401,
        clearCookies: usingCookieSession,
      });
    }

    logAdminAuthEvent("info", "auth user verified", {
      requestId,
      userId: user.id,
    });

    const adminUser = await fetchAdminUser(user.id, accessToken, config, fetchImpl);

    if (!adminUser) {
      logStructuredEvent("warn", {
        type: "ADMIN_USER_MISSING",
        requestId,
        userId: user.id,
        email: user.email ?? null,
      });
      logAdminAuthEvent("warn", "authenticated user is not present in admin_users", {
        requestId,
        userId: user.id,
        role: null,
        adminUserExists: false,
      });
      return createAuthFailureResponse({
        code: "FORBIDDEN",
        message: "Your account does not have access.",
        status: 403,
        details: {
          userId: user.id,
          email: user.email ?? null,
          table: "admin_users",
        },
        clearCookies: usingCookieSession,
      });
    }

    logAdminAuthEvent("info", "admin membership verified", {
      requestId,
      userId: user.id,
      role: adminUser.role,
      lookupMode: config.supabaseServiceRoleKey ? "service_role" : "user_token",
      authTransport: bearerToken ? "bearer" : "cookie",
    });

    return {
      success: true,
      session: {
        requestId,
        accessToken,
        user,
        adminUser,
      },
      responseHeaders: [...responseHeaders.keys()].length > 0 ? responseHeaders : null,
    };
  } catch (error) {
    if (error instanceof AppError && usingCookieSession) {
      return createAuthFailureResponse({
        code: error.code === "AUTH_ERROR" ? "UNAUTHORIZED" : error.code,
        message: error.code === "AUTH_ERROR"
          ? "Admin session expired. Sign in again."
          : error.message,
        status: error.code === "AUTH_ERROR" ? 401 : error.status ?? 401,
        details: error.details,
        detail: error.detail,
        clearCookies: true,
      });
    }

    logAdminAuthEvent("error", "admin session verification failed", {
      requestId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      success: false,
      response: apiError(
        "UPSTREAM_ERROR",
        "Unable to verify admin session.",
        502,
        error instanceof Error ? { message: error.message } : undefined,
      ),
    };
  }
}

export function requireAdminPermissionResult(
  session: AdminSession,
  permission: AdminPermission,
): AdminAuthFailure | null {
  if (hasAdminPermission(session.adminUser.role, permission)) {
    return null;
  }

  return {
    success: false,
    response: apiError(
      "FORBIDDEN",
      `This account does not have permission to ${permission}.`,
      403,
      {
        role: session.adminUser.role,
        permission,
      },
    ),
  };
}

export async function requireAdminPermission(
  request: Request,
  permission: AdminPermission,
  options?: RequireAdminOptions,
): Promise<AdminAuthResult> {
  const admin = await requireAdmin(request, options);

  if (!admin.success) {
    return admin;
  }

  return requireAdminPermissionResult(admin.session, permission) ?? admin;
}

import { apiError } from "../api/responses.ts";
import { getOrCreateRequestId, logStructuredEvent } from "../observability.ts";
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
};

type AdminAuthFailure = {
  success: false;
  response: Response;
};

type RequireAdminOptions = {
  config?: AdminAuthConfig | null;
  fetchImpl?: typeof fetch;
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

async function createDefaultAdminUserRecord(
  user: SupabaseAuthUser,
  requestId: string,
  config: AdminAuthConfig,
  fetchImpl: typeof fetch,
): Promise<AdminUserRecord | null> {
  const serviceRoleKey = config.supabaseServiceRoleKey?.trim() ?? "";

  if (!serviceRoleKey || !user.email?.trim()) {
    return null;
  }

  const url = new URL("/rest/v1/admin_users", config.supabaseUrl);
  const payload = {
    id: user.id,
    email: user.email,
    full_name: null,
    role: "agent" as const,
  };

  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    const rows = (await response.json()) as Array<{
      id: string;
      email: string;
      full_name: string | null;
      role: string;
    }>;
    const created = rows[0] ?? null;

    if (!created || !isAdminRole(created.role)) {
      logStructuredEvent("warn", {
        type: "ADMIN_USER_AUTO_CREATE_FAILED",
        requestId,
        userId: user.id,
        email: user.email,
        status: response.status,
        details: rows,
        reason: "invalid_payload",
      });

      return await fetchAdminUser(user.id, serviceRoleKey, config, fetchImpl);
    }

    logStructuredEvent("info", {
      type: "ADMIN_USER_AUTO_CREATED",
      requestId,
      userId: created.id,
      email: created.email,
      role: created.role,
    });

    return {
      ...created,
      role: created.role,
    };
  }

  const details = await response.json().catch(() => null);

  logStructuredEvent("warn", {
    type: "ADMIN_USER_AUTO_CREATE_FAILED",
    requestId,
    userId: user.id,
    email: user.email,
    status: response.status,
    details,
  });

  return await fetchAdminUser(user.id, serviceRoleKey, config, fetchImpl);
}

export async function requireAdmin(
  request: Request,
  {
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: RequireAdminOptions = {},
): Promise<AdminAuthResult> {
  const accessToken = getBearerToken(request);
  const requestId = getOrCreateRequestId(request);

  if (!accessToken) {
    return {
      success: false,
      response: apiError(
        "UNAUTHORIZED",
        "Admin authentication requires an Authorization bearer token.",
        401,
      ),
    };
  }

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

  try {
    const user = await fetchAuthUser(accessToken, config, fetchImpl);

    if (!user) {
      logAdminAuthEvent("warn", "session rejected because auth user lookup returned no user", {
        requestId,
        hasAccessToken: true,
      });
      return {
        success: false,
        response: apiError("UNAUTHORIZED", "Invalid admin session.", 401),
      };
    }

    logAdminAuthEvent("info", "auth user verified", {
      requestId,
      userId: user.id,
      email: user.email ?? null,
    });

    const adminUser = await fetchAdminUser(user.id, accessToken, config, fetchImpl);

    const resolvedAdminUser = adminUser ?? await (async () => {
      logStructuredEvent("warn", {
        type: "ADMIN_USER_MISSING",
        requestId,
        userId: user.id,
        email: user.email ?? null,
      });

      return await createDefaultAdminUserRecord(user, requestId, config, fetchImpl);
    })();

    if (!resolvedAdminUser) {
      logAdminAuthEvent("warn", "authenticated user is not present in admin_users", {
        requestId,
        userId: user.id,
        email: user.email ?? null,
      });
      return {
        success: false,
        response: apiError("FORBIDDEN", "Authenticated user is not an admin.", 403, {
          userId: user.id,
          email: user.email ?? null,
          table: "admin_users",
        }),
      };
    }

    logAdminAuthEvent("info", "admin membership verified", {
      requestId,
      userId: user.id,
      email: user.email ?? null,
      role: resolvedAdminUser.role,
      lookupMode: config.supabaseServiceRoleKey ? "service_role" : "user_token",
    });

    return {
      success: true,
      session: {
        requestId,
        accessToken,
        user,
        adminUser: resolvedAdminUser,
      },
    };
  } catch (error) {
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

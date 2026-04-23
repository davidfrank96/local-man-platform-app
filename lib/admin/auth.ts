import { apiError } from "../api/responses.ts";

export type AdminAuthConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export type SupabaseAuthUser = {
  id: string;
  email?: string;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

export type AdminSession = {
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

export function getAdminAuthConfig(): AdminAuthConfig | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  return {
    supabaseUrl,
    supabaseAnonKey,
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

  const response = await fetchImpl(url, {
    headers: {
      apikey: config.supabaseAnonKey,
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Admin user lookup failed: ${response.status}`);
  }

  const rows = (await response.json()) as AdminUserRecord[];

  return rows[0] ?? null;
}

export async function requireAdmin(
  request: Request,
  {
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: RequireAdminOptions = {},
): Promise<AdminAuthResult> {
  const accessToken = getBearerToken(request);

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
      return {
        success: false,
        response: apiError("UNAUTHORIZED", "Invalid admin session.", 401),
      };
    }

    const adminUser = await fetchAdminUser(user.id, accessToken, config, fetchImpl);

    if (!adminUser) {
      return {
        success: false,
        response: apiError("FORBIDDEN", "Authenticated user is not an admin.", 403),
      };
    }

    return {
      success: true,
      session: {
        accessToken,
        user,
        adminUser,
      },
    };
  } catch (error) {
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

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { adminUserSchema } from "../validation/schemas.ts";
import {
  getAdminAuthConfig,
  type AdminAuthConfig,
  type AdminSession,
} from "./auth.ts";
import { AdminServiceError } from "./errors.ts";
import { writeAuditLogSafely } from "./audit-log-service.ts";
import { logStructuredEvent } from "../observability.ts";
import type { AdminRole, AdminUser } from "../../types/index.ts";

type AdminUserServiceContext = {
  session?: AdminSession;
  config?: AdminAuthConfig | null;
  fetchImpl?: typeof fetch;
};

type CreateAdminUserResult = {
  adminUser: AdminUser;
  outcome: "created" | "existing";
};

const defaultAuthCreateTimeoutMs = 4_000;
const defaultAdminUsersListTimeoutMs = 4_000;
const authLookupPerPage = 1000;
const maxAuthLookupPages = 10;
const adminUsersListLimit = 1000;

function requireServiceConfig(
  config: AdminAuthConfig | null | undefined,
): AdminAuthConfig {
  if (!config) {
    throw new AdminServiceError(
      "CONFIG_ERROR",
      "System configuration error.",
      503,
      { missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] },
      "Supabase environment variables are required for admin user management.",
    );
  }

  if (!config.supabaseServiceRoleKey?.trim()) {
    throw new AdminServiceError(
      "CONFIG_ERROR",
      "System configuration error.",
      503,
      { missing: ["SUPABASE_SERVICE_ROLE_KEY"] },
      "SUPABASE_SERVICE_ROLE_KEY is required for admin user management.",
    );
  }

  return config;
}

function createAdminSupabaseClient(
  config: AdminAuthConfig,
  fetchImpl: typeof fetch,
) {
  const serviceRoleKey = config.supabaseServiceRoleKey?.trim() ?? "";

  return createClient(config.supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: fetchImpl,
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  });
}

function getAuthCreateTimeoutMs(): number {
  const rawValue = process.env.ADMIN_AUTH_CREATE_TIMEOUT_MS?.trim() ?? "";
  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultAuthCreateTimeoutMs;
  }

  return parsed;
}

function getAdminUsersListTimeoutMs(): number {
  const rawValue = process.env.ADMIN_USERS_LIST_TIMEOUT_MS?.trim() ?? "";
  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultAdminUsersListTimeoutMs;
  }

  return parsed;
}

function createTimeoutFetch(
  fetchImpl: typeof fetch,
  timeoutMs: number,
): typeof fetch {
  return (async (input: URL | RequestInfo, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      return await fetchImpl(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }) as typeof fetch;
}

function createRestUrl(
  config: AdminAuthConfig,
  table: string,
  filters: Record<string, string> = {},
): URL {
  const url = new URL(`/rest/v1/${table}`, config.supabaseUrl);

  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }

  return url;
}

function createServiceHeaders(
  config: AdminAuthConfig,
  prefer = "return=representation",
): HeadersInit {
  const serviceRoleKey = config.supabaseServiceRoleKey?.trim() ?? "";

  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
    ...(prefer ? { prefer } : {}),
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestJson(
  url: URL,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const response = await fetchImpl(url, init);
  const payload = await readJson(response);

  if (!response.ok) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      `Supabase admin user operation failed with HTTP ${response.status}.`,
      502,
      payload,
    );
  }

  return payload;
}

function parseAdminUsers(payload: unknown): AdminUser[] {
  const parsed = z.array(adminUserSchema).safeParse(payload);

  if (!parsed.success) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Supabase returned an unexpected admin user payload.",
      502,
      { issues: parsed.error.issues },
    );
  }

  return parsed.data;
}

function parseAdminUser(payload: unknown): AdminUser {
  return parseAdminUsers(payload)[0] ?? (() => {
    throw new AdminServiceError("NOT_FOUND", "Admin user was not found.", 404);
  })();
}

async function getAdminUserById(
  adminUserId: string,
  config: AdminAuthConfig,
  fetchImpl: typeof fetch,
): Promise<AdminUser> {
  const payload = await requestJson(
    createRestUrl(config, "admin_users", {
      id: `eq.${adminUserId}`,
      select: "id,email,full_name,role,created_at",
      limit: "1",
    }),
    {
      method: "GET",
      headers: createServiceHeaders(config, ""),
    },
    fetchImpl,
  );

  return parseAdminUser(payload);
}

async function createAuthUser(
  config: AdminAuthConfig,
  fetchImpl: typeof fetch,
  input: {
    email: string;
    password: string;
    fullName?: string | null;
  },
): Promise<{ id: string; email: string; outcome: "created" | "existing" }> {
  const normalizedEmail = input.email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new AdminServiceError(
      "VALIDATION_ERROR",
      "Email is required.",
      400,
      { field: "email" },
      "Provide an email address for the new account.",
    );
  }

  if (input.password.trim().length < 8) {
    throw new AdminServiceError(
      "INVALID_PASSWORD",
      "Password must be stronger.",
      400,
      { field: "password", minimum_length: 8 },
      "Use at least 8 characters for the temporary password.",
    );
  }

  const timeoutMs = getAuthCreateTimeoutMs();
  const timedFetch = createTimeoutFetch(fetchImpl, timeoutMs);
  const url = new URL("/auth/v1/admin/users", config.supabaseUrl);
  const requestBody = {
    email: normalizedEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: input.fullName ? { full_name: input.fullName } : {},
  };

  let response: Response;
  let payload: unknown = null;

  async function recoverExistingAuthUserFromEmail(): Promise<{
    id: string;
    email: string;
    outcome: "existing";
  } | null> {
    const supabase = createAdminSupabaseClient(config, timedFetch);

    for (let page = 1; page <= maxAuthLookupPages; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: authLookupPerPage,
      }).catch((caughtError) => ({
        data: { users: [] as Array<{ id?: string; email?: string | null }>, aud: "" },
        error: caughtError instanceof Error ? caughtError : new Error("Unknown auth user lookup failure"),
      }));

      if (error) {
        console.error("AUTH LOOKUP ERROR:", error);
        return null;
      }

      const matchedUser = data.users.find((candidate) =>
        typeof candidate.email === "string" &&
        candidate.email.trim().toLowerCase() === normalizedEmail
      );

      if (matchedUser?.id && matchedUser.email) {
        logStructuredEvent("warn", {
          type: "ADMIN_USER_CREATE_RECOVERED",
          email: normalizedEmail,
          userId: matchedUser.id,
          context: "admin_user_create",
          details: {
            provider: "supabase_auth",
            reason: "user_found_after_create_error",
          },
        });

        return {
          id: matchedUser.id,
          email: matchedUser.email,
          outcome: "existing",
        };
      }

      const lastPage = typeof data.lastPage === "number" && data.lastPage > 0
        ? data.lastPage
        : null;
      if ((lastPage !== null && page >= lastPage) || data.users.length < authLookupPerPage) {
        break;
      }
    }

    return null;
  }

  try {
    response = await timedFetch(url, {
      method: "POST",
      headers: createServiceHeaders(config, ""),
      body: JSON.stringify(requestBody),
    });
    payload = await readJson(response);
  } catch (caughtError) {
    const error = caughtError instanceof Error
      ? caughtError
      : new Error("Unknown auth create failure");
    const details = {
      request: {
        email: normalizedEmail,
        email_confirm: true,
      },
      provider: "supabase_auth",
      name: error.name,
      message: error.message,
      cause: "cause" in error ? error.cause : null,
      stack: error.stack,
    };

    console.error("AUTH CREATE ERROR:", error);

    logStructuredEvent("error", {
      type: "ERROR",
      code: isTimeoutError(error) ? "NETWORK_ERROR" : "AUTH_PROVIDER_ERROR",
      email: normalizedEmail,
      message: error.message || "Supabase auth createUser failed.",
      context: "admin_user_create",
      details,
    });

    const recoveredUser = await recoverExistingAuthUserFromEmail();
    if (recoveredUser) {
      return recoveredUser;
    }

    const normalized = normalizeCreateAuthUserFailure(error, details);

    throw new AdminServiceError(
      normalized.code,
      normalized.message,
      normalized.status,
      normalized.details,
      normalized.detail,
    );
  }

  const createdUser = (
    payload &&
    typeof payload === "object" &&
    "user" in payload &&
    payload.user &&
    typeof payload.user === "object"
  )
    ? payload.user as { id?: unknown; email?: unknown }
    : null;

  if (!response.ok || !createdUser?.id || !createdUser?.email) {
    const providerMessage = payload && typeof payload === "object"
      ? typeof (payload as { msg?: unknown }).msg === "string"
        ? (payload as { msg: string }).msg
        : typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `Supabase auth createUser failed with HTTP ${response.status}.`
      : `Supabase auth createUser failed with HTTP ${response.status}.`;
    const error = new Error(providerMessage);
    error.name = "SupabaseAuthCreateError";
    const details = {
      request: {
        email: normalizedEmail,
        email_confirm: true,
      },
      provider: "supabase_auth",
      response_status: response.status,
      response_body: payload,
      code: payload && typeof payload === "object" && "code" in payload
        ? (payload as { code?: unknown }).code ?? null
        : null,
    };

    console.error("AUTH CREATE ERROR:", error);

    logStructuredEvent("error", {
      type: "ERROR",
      code: isDuplicateEmailError(providerMessage) ||
          (details.code === "email_exists")
        ? "USER_ALREADY_EXISTS"
        : isWeakPasswordError(providerMessage)
        ? "INVALID_PASSWORD"
        : "AUTH_PROVIDER_ERROR",
      email: normalizedEmail,
      message: providerMessage,
      context: "admin_user_create",
      details,
    });

    const recoveredUser = await recoverExistingAuthUserFromEmail();
    if (recoveredUser) {
      return recoveredUser;
    }

    const normalized = normalizeCreateAuthUserFailure(error, details);

    throw new AdminServiceError(
      normalized.code,
      normalized.message,
      normalized.status,
      normalized.details,
      normalized.detail,
    );
  }

  return {
    id: String(createdUser.id),
    email: String(createdUser.email),
    outcome: "created",
  };
}

function isDuplicateEmailError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    (normalized.includes("already") && normalized.includes("email")) ||
    normalized.includes("user already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("email_exists")
  );
}

function isTimeoutError(error: Error): boolean {
  const normalized = error.message.toLowerCase();
  return (
    error.name === "AbortError" ||
    normalized.includes("aborted") ||
    normalized.includes("timeout")
  );
}

function isWeakPasswordError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("password") &&
    (normalized.includes("weak") ||
      normalized.includes("strength") ||
      normalized.includes("at least"))
  );
}

function normalizeCreateAuthUserFailure(
  error: Error | null,
  details: unknown,
): {
  code: AdminServiceError["code"];
  message: string;
  status: number;
  detail: string;
  details: unknown;
} {
  const message = error?.message ?? "";
  const detailsRecord = details && typeof details === "object"
    ? details as Record<string, unknown>
    : null;
  const upstreamCode = typeof detailsRecord?.code === "string"
    ? detailsRecord.code
    : typeof detailsRecord?.upstream_code === "string"
    ? detailsRecord.upstream_code
    : null;

  if (upstreamCode === "email_exists" || isDuplicateEmailError(message)) {
    return {
      code: "USER_ALREADY_EXISTS",
      message: "This user already exists.",
      status: 409,
      detail: "Supabase auth rejected a duplicate email.",
      details: {
        provider: "supabase_auth",
        reason: "duplicate_email",
      },
    };
  }

  if (isWeakPasswordError(message)) {
    return {
      code: "INVALID_PASSWORD",
      message: "Password must be stronger.",
      status: 400,
      detail: "Supabase auth rejected the password requirements.",
      details: {
        provider: "supabase_auth",
        reason: "invalid_password",
      },
    };
  }

  if (error && isTimeoutError(error)) {
    return {
      code: "NETWORK_ERROR",
      message: "User creation failed. Try again.",
      status: 504,
      detail: "Supabase auth timed out while creating the user.",
      details: {
        provider: "supabase_auth",
        reason: "create_user_timeout",
      },
    };
  }

  return {
    code: "AUTH_PROVIDER_ERROR",
    message: "User creation failed. Try again.",
    status: 502,
    detail: "Supabase auth could not create the user.",
    details: {
      provider: "supabase_auth",
      reason: "create_user_failed",
      upstream_status:
        error && "status" in error && typeof error.status === "number" ? error.status : null,
      upstream_message: message || null,
      ...(details && typeof details === "object" && "code" in details
        ? { upstream_code: (details as { code?: unknown }).code ?? null }
        : {}),
    },
  };
}

async function deleteAuthUser(
  config: AdminAuthConfig,
  fetchImpl: typeof fetch,
  userId: string,
): Promise<void> {
  const supabase = createAdminSupabaseClient(config, fetchImpl);
  const { error } = await supabase.auth.admin.deleteUser(userId).catch((caughtError) => ({
    data: null,
    error: caughtError instanceof Error ? caughtError : new Error("Unknown auth delete failure"),
  }));

  if (error) {
    logStructuredEvent("error", {
      type: "ERROR",
      code: "AUTH_PROVIDER_ERROR",
      context: "admin_user_delete_rollback",
      userId,
      message: error.message,
      details: {
        name: error.name,
        message: error.message,
        status: "status" in error ? error.status : null,
        code: "code" in error ? error.code : null,
      },
    });
  }
}

export async function listAdminUsers(
  {
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminUserServiceContext = {},
): Promise<AdminUser[]> {
  const resolvedConfig = requireServiceConfig(config);
  const timeoutMs = getAdminUsersListTimeoutMs();
  const timedFetch = createTimeoutFetch(fetchImpl, timeoutMs);
  const start = Date.now();

  try {
    const payload = await requestJson(
      createRestUrl(resolvedConfig, "admin_users", {
        select: "id,email,full_name,role,created_at",
        order: "created_at.desc",
        limit: String(adminUsersListLimit),
      }),
      {
        method: "GET",
        headers: createServiceHeaders(resolvedConfig, ""),
      },
      timedFetch,
    );
    const adminUsers = parseAdminUsers(payload);

    console.warn("ADMIN_USERS_FETCH_TIME", Date.now() - start);

    return adminUsers;
  } catch (error) {
    console.warn("ADMIN_USERS_FETCH_TIME", Date.now() - start);
    throw error;
  }
}

export async function createAdminUser(
  input: {
    email: string;
    password: string;
    full_name?: string | null;
    role: AdminRole;
  },
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminUserServiceContext = {},
): Promise<CreateAdminUserResult> {
  const resolvedConfig = requireServiceConfig(config);
  const normalizedEmail = input.email.trim().toLowerCase();

  if (input.role !== "admin" && input.role !== "agent") {
    throw new AdminServiceError(
      "VALIDATION_ERROR",
      "Role is invalid.",
      400,
      { field: "role" },
      "Use either admin or agent for the new account role.",
    );
  }

  const authUser = await createAuthUser(resolvedConfig, fetchImpl, {
    email: normalizedEmail,
    password: input.password,
    fullName: input.full_name ?? null,
  });

  try {
    const payload = await requestJson(
      createRestUrl(resolvedConfig, "admin_users", {
        on_conflict: "id",
      }),
      {
        method: "POST",
        headers: createServiceHeaders(
          resolvedConfig,
          "resolution=merge-duplicates,return=representation",
        ),
        body: JSON.stringify({
          id: authUser.id,
          email: authUser.email,
          full_name: input.full_name ?? null,
          role: input.role,
        }),
      },
      fetchImpl,
    );
    const adminUser = parseAdminUser(payload);
    if (session) {
      void writeAuditLogSafely(
        {
          entityId: adminUser.id,
          entityType: "admin_user",
          action: "CREATE_ADMIN_USER",
          metadata: {
            target_name: adminUser.full_name ?? adminUser.email,
            target_email: adminUser.email,
            target_role: adminUser.role,
          },
        },
        { session, config: resolvedConfig, fetchImpl },
      );
    }

    return {
      adminUser,
      outcome: authUser.outcome,
    };
  } catch (error) {
    if (authUser.outcome === "created") {
      await deleteAuthUser(resolvedConfig, fetchImpl, authUser.id);
    }
    throw error;
  }
}

export async function updateAdminUserRole(
  input: {
    adminUserId: string;
    role?: AdminRole;
    full_name?: string | null;
  },
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminUserServiceContext,
): Promise<AdminUser> {
  const resolvedConfig = requireServiceConfig(config);

  if (!session) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Admin session is required to update admin roles.",
      401,
    );
  }

  const existingAdminUser = await getAdminUserById(
    input.adminUserId,
    resolvedConfig,
    fetchImpl,
  );

  if (session.adminUser.id === input.adminUserId && input.role !== undefined && input.role !== "admin") {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "You cannot change your own role away from admin.",
      400,
    );
  }

  const nextPayload: { role?: AdminRole; full_name?: string | null } = {};

  if (input.role !== undefined) {
    nextPayload.role = input.role;
  }

  if (input.full_name !== undefined) {
    nextPayload.full_name = input.full_name;
  }

  const payload = await requestJson(
    createRestUrl(resolvedConfig, "admin_users", {
      id: `eq.${input.adminUserId}`,
    }),
    {
      method: "PATCH",
      headers: createServiceHeaders(resolvedConfig),
      body: JSON.stringify(nextPayload),
    },
    fetchImpl,
  );
  const adminUser = parseAdminUser(payload);
  void writeAuditLogSafely(
    {
      entityId: adminUser.id,
      entityType: "admin_user",
      action: input.role !== undefined ? "CHANGE_ADMIN_USER_ROLE" : "UPDATE_ADMIN_USER",
      metadata: {
        target_name: adminUser.full_name ?? adminUser.email,
        target_email: adminUser.email,
        previous_role: existingAdminUser.role,
        target_role: adminUser.role,
        changed_fields: Object.keys(nextPayload),
      },
    },
    { session, config: resolvedConfig, fetchImpl },
  );

  return adminUser;
}

export async function deleteAdminUser(
  input: {
    adminUserId: string;
  },
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminUserServiceContext,
): Promise<{ adminUserId: string }> {
  const resolvedConfig = requireServiceConfig(config);

  if (!session) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Admin session is required to delete admin users.",
      401,
    );
  }

  if (session.adminUser.id === input.adminUserId) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "You cannot delete your own admin account.",
      400,
    );
  }

  const targetAdminUser = await getAdminUserById(
    input.adminUserId,
    resolvedConfig,
    fetchImpl,
  );

  const response = await fetchImpl(
    new URL(`/auth/v1/admin/users/${input.adminUserId}`, resolvedConfig.supabaseUrl),
    {
      method: "DELETE",
      headers: createServiceHeaders(resolvedConfig, ""),
    },
  );

  if (!response.ok) {
    const payload = await readJson(response);
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      `Unable to delete the auth user for this admin account.`,
      502,
      payload,
    );
  }

  void writeAuditLogSafely(
    {
      entityId: input.adminUserId,
      entityType: "admin_user",
      action: "DELETE_ADMIN_USER",
      metadata: {
        target_name: targetAdminUser.full_name ?? targetAdminUser.email,
        target_email: targetAdminUser.email,
        target_role: targetAdminUser.role,
      },
    },
    { session, config: resolvedConfig, fetchImpl },
  );

  return { adminUserId: input.adminUserId };
}

import { createHash } from "node:crypto";
import { AppError, mapExternalError } from "../errors/app-error.ts";
import {
  getOrCreateRequestId,
  logStructuredEvent,
  redactEmailForLog,
} from "../observability.ts";
import {
  getAdminAuthConfig,
  type AdminAuthConfig,
  type AdminSession,
  type SupabaseAuthUser,
} from "./auth.ts";
import { AdminServiceError } from "./errors.ts";
import { getAdminSessionClientIp, revokeAllAdminSessionsForUser, revokeOtherAdminSessionsForUser } from "./session-governance.ts";
import { signInAdminCookieSession } from "./session-cookies.ts";
import { validateAdminPassword } from "./password-policy.ts";

export type AdminPasswordAuditEvent =
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "PASSWORD_CHANGED"
  | "PASSWORD_CHANGE_FAILED"
  | "INVALID_RESET_TOKEN"
  | "EXPIRED_RESET_TOKEN"
  | "SESSIONS_REVOKED_AFTER_PASSWORD_CHANGE";

type PasswordManagementContext = {
  config?: AdminAuthConfig | null;
  fetchImpl?: typeof fetch;
};

type PasswordAuditContext = {
  request: Request;
  event: AdminPasswordAuditEvent;
  status?: number;
  email?: string | null;
  authUserId?: string | null;
  adminUserId?: string | null;
  userRole?: string | null;
  outcome?: string | null;
  metadata?: Record<string, unknown>;
  error?: unknown;
};

type SupabaseAuthUserPayload = {
  id?: string;
  email?: string;
};

type SupabaseErrorPayload = {
  error?: string;
  error_description?: string;
  msg?: string;
  message?: string;
  code?: string;
};

function hashValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return createHash("sha256").update(value).digest("hex");
}

function requireAdminPasswordConfig(
  config: AdminAuthConfig | null | undefined,
): AdminAuthConfig {
  if (!config) {
    throw new AdminServiceError(
      "CONFIGURATION_ERROR",
      "Admin authentication is unavailable.",
      503,
    );
  }

  if (!config.supabaseServiceRoleKey?.trim()) {
    throw new AdminServiceError(
      "CONFIGURATION_ERROR",
      "Password management is unavailable.",
      503,
      { missing: "SUPABASE_SERVICE_ROLE_KEY" },
      "SUPABASE_SERVICE_ROLE_KEY is required to revoke governed admin sessions.",
    );
  }

  return config;
}

function createAuthHeaders(
  config: AdminAuthConfig,
  token?: string | null,
): HeadersInit {
  return {
    apikey: config.supabaseAnonKey,
    authorization: token ? `Bearer ${token}` : `Bearer ${config.supabaseAnonKey}`,
    "content-type": "application/json",
  };
}

function getRequestOrigin(request: Request): string {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredAppUrl) {
    return configuredAppUrl.replace(/\/+$/, "");
  }

  return new URL(request.url).origin;
}

function createResetRedirectUrl(request: Request): string {
  return `${getRequestOrigin(request)}/admin/reset-password`;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getSupabaseMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const errorPayload = payload as SupabaseErrorPayload;

  return [
    errorPayload.error_description,
    errorPayload.message,
    errorPayload.msg,
    errorPayload.error,
    errorPayload.code,
  ].filter((value): value is string => typeof value === "string").join(" ");
}

function isExpiredTokenPayload(payload: unknown): boolean {
  const normalized = getSupabaseMessage(payload).toLowerCase();

  return normalized.includes("expired") ||
    normalized.includes("otp_expired") ||
    normalized.includes("token has expired");
}

function parseAuthUser(payload: unknown): SupabaseAuthUser {
  const user = payload && typeof payload === "object"
    ? payload as SupabaseAuthUserPayload
    : {};

  if (!user.id) {
    throw new AdminServiceError(
      "INVALID_RESPONSE",
      "Unable to verify password reset session.",
      502,
      payload,
    );
  }

  return {
    id: user.id,
    email: user.email,
  };
}

function createPasswordValidationError(issues: string[]): AdminServiceError {
  return new AdminServiceError(
    "INVALID_PASSWORD",
    "Password must be stronger.",
    400,
    { issues },
    issues.join(" "),
  );
}

export function logAdminPasswordAuditEvent({
  request,
  event,
  status,
  email,
  authUserId,
  adminUserId,
  userRole,
  outcome,
  metadata,
  error,
}: PasswordAuditContext): void {
  const ipAddress = getAdminSessionClientIp(request);

  logStructuredEvent(
    event.includes("FAILED") || event.includes("INVALID") || event.includes("EXPIRED")
      ? "warn"
      : "info",
    {
      event,
      area: "auth",
      route: new URL(request.url).pathname,
      method: request.method,
      status: status ?? null,
      requestId: getOrCreateRequestId(request),
      userId: authUserId ?? null,
      adminUserId: adminUserId ?? null,
      userRole: userRole ?? null,
      error,
      metadata: {
        emailHint: email ? redactEmailForLog(email) : null,
        emailHash: hashValue(email?.trim().toLowerCase() ?? null),
        ipAddressHash: hashValue(ipAddress)?.slice(0, 16),
        userAgentHash: hashValue(request.headers.get("user-agent"))?.slice(0, 16),
        outcome: outcome ?? null,
        ...metadata,
      },
    },
  );
}

export async function requestAdminPasswordReset(
  input: {
    email: string;
    request: Request;
  },
  {
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: PasswordManagementContext = {},
): Promise<void> {
  const resolvedConfig = requireAdminPasswordConfig(config);
  const normalizedEmail = input.email.trim().toLowerCase();
  const url = new URL("/auth/v1/recover", resolvedConfig.supabaseUrl);
  url.searchParams.set("redirect_to", createResetRedirectUrl(input.request));

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: createAuthHeaders(resolvedConfig),
      body: JSON.stringify({
        email: normalizedEmail,
      }),
    });
    const payload = await readJson(response);

    logAdminPasswordAuditEvent({
      request: input.request,
      event: "PASSWORD_RESET_REQUESTED",
      status: 200,
      email: normalizedEmail,
      outcome: response.ok ? "accepted" : "provider_rejected",
      metadata: {
        provider: "supabase_auth",
        upstreamStatus: response.status,
        resetRedirectPath: "/admin/reset-password",
        upstreamCode: payload && typeof payload === "object" && "code" in payload
          ? (payload as { code?: unknown }).code ?? null
          : null,
      },
    });
  } catch (error) {
    logAdminPasswordAuditEvent({
      request: input.request,
      event: "PASSWORD_RESET_REQUESTED",
      status: 200,
      email: normalizedEmail,
      outcome: "provider_unavailable",
      metadata: {
        provider: "supabase_auth",
      },
      error,
    });
  }
}

export async function completeAdminPasswordReset(
  input: {
    accessToken: string;
    newPassword: string;
    confirmPassword: string;
    request: Request;
  },
  {
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: PasswordManagementContext = {},
): Promise<{ user: SupabaseAuthUser }> {
  const resolvedConfig = requireAdminPasswordConfig(config);

  if (!input.accessToken.trim()) {
    logAdminPasswordAuditEvent({
      request: input.request,
      event: "INVALID_RESET_TOKEN",
      status: 401,
      outcome: "missing_token",
    });
    throw new AdminServiceError(
      "AUTH_ERROR",
      "This password reset link is invalid or expired.",
      401,
      { reason: "INVALID_RESET_TOKEN" },
    );
  }

  if (input.newPassword !== input.confirmPassword) {
    throw new AdminServiceError(
      "VALIDATION_ERROR",
      "Passwords do not match.",
      400,
      { field: "confirmPassword" },
    );
  }

  const passwordValidation = validateAdminPassword(input.newPassword);

  if (!passwordValidation.success) {
    throw createPasswordValidationError(passwordValidation.issues);
  }

  const userResponse = await fetchImpl(new URL("/auth/v1/user", resolvedConfig.supabaseUrl), {
    method: "GET",
    headers: createAuthHeaders(resolvedConfig, input.accessToken),
  });
  const userPayload = await readJson(userResponse);

  if (!userResponse.ok) {
    const event = isExpiredTokenPayload(userPayload)
      ? "EXPIRED_RESET_TOKEN"
      : "INVALID_RESET_TOKEN";
    logAdminPasswordAuditEvent({
      request: input.request,
      event,
      status: 401,
      outcome: event === "EXPIRED_RESET_TOKEN" ? "expired" : "invalid",
      metadata: {
        provider: "supabase_auth",
        upstreamStatus: userResponse.status,
      },
    });
    throw new AdminServiceError(
      "AUTH_ERROR",
      "This password reset link is invalid or expired.",
      401,
      { reason: event },
    );
  }

  const user = parseAuthUser(userPayload);
  const updateResponse = await fetchImpl(new URL("/auth/v1/user", resolvedConfig.supabaseUrl), {
    method: "PUT",
    headers: createAuthHeaders(resolvedConfig, input.accessToken),
    body: JSON.stringify({
      password: input.newPassword,
    }),
  });
  const updatePayload = await readJson(updateResponse);

  if (!updateResponse.ok) {
    throw new AdminServiceError(
      "AUTH_PROVIDER_ERROR",
      "Password reset failed. Try again.",
      updateResponse.status >= 500 ? 502 : 400,
      updatePayload,
      "Supabase Auth rejected the password reset update.",
    );
  }

  await revokeAllAdminSessionsForUser(
    resolvedConfig,
    user.id,
    "password_reset_completed",
    { fetchImpl },
  );
  logAdminPasswordAuditEvent({
    request: input.request,
    event: "SESSIONS_REVOKED_AFTER_PASSWORD_CHANGE",
    status: 200,
    authUserId: user.id,
    email: user.email ?? null,
    outcome: "all_sessions_revoked",
    metadata: {
      reason: "password_reset_completed",
    },
  });
  logAdminPasswordAuditEvent({
    request: input.request,
    event: "PASSWORD_RESET_COMPLETED",
    status: 200,
    authUserId: user.id,
    email: user.email ?? null,
    outcome: "completed",
  });

  return { user };
}

export async function changeAdminPassword(
  input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    request: Request;
    session: AdminSession;
    currentGovernedSessionId: string | null;
  },
  {
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: PasswordManagementContext = {},
): Promise<void> {
  const resolvedConfig = requireAdminPasswordConfig(config);

  if (input.newPassword !== input.confirmPassword) {
    logAdminPasswordAuditEvent({
      request: input.request,
      event: "PASSWORD_CHANGE_FAILED",
      status: 400,
      authUserId: input.session.user.id,
      adminUserId: input.session.adminUser.id,
      userRole: input.session.adminUser.role,
      outcome: "password_mismatch",
    });
    throw new AdminServiceError(
      "VALIDATION_ERROR",
      "Passwords do not match.",
      400,
      { field: "confirmPassword" },
    );
  }

  const passwordValidation = validateAdminPassword(input.newPassword);

  if (!passwordValidation.success) {
    logAdminPasswordAuditEvent({
      request: input.request,
      event: "PASSWORD_CHANGE_FAILED",
      status: 400,
      authUserId: input.session.user.id,
      adminUserId: input.session.adminUser.id,
      userRole: input.session.adminUser.role,
      outcome: "weak_password",
      metadata: {
        issueCount: passwordValidation.issues.length,
      },
    });
    throw createPasswordValidationError(passwordValidation.issues);
  }

  try {
    await signInAdminCookieSession(
      input.session.adminUser.email,
      input.currentPassword,
      resolvedConfig,
      fetchImpl,
    );
  } catch (error) {
    const mapped = error instanceof AppError
      ? error
      : mapExternalError(error, {
        code: "AUTH_ERROR",
        message: "Current password could not be verified.",
        status: 401,
      });

    logAdminPasswordAuditEvent({
      request: input.request,
      event: "PASSWORD_CHANGE_FAILED",
      status: mapped.status ?? 401,
      authUserId: input.session.user.id,
      adminUserId: input.session.adminUser.id,
      userRole: input.session.adminUser.role,
      outcome: "current_password_rejected",
      error,
    });
    throw new AdminServiceError(
      "AUTH_ERROR",
      "Current password is incorrect.",
      401,
      { reason: "CURRENT_PASSWORD_REJECTED" },
    );
  }

  const updateResponse = await fetchImpl(new URL("/auth/v1/user", resolvedConfig.supabaseUrl), {
    method: "PUT",
    headers: createAuthHeaders(resolvedConfig, input.session.accessToken),
    body: JSON.stringify({
      password: input.newPassword,
    }),
  });
  const updatePayload = await readJson(updateResponse);

  if (!updateResponse.ok) {
    logAdminPasswordAuditEvent({
      request: input.request,
      event: "PASSWORD_CHANGE_FAILED",
      status: updateResponse.status,
      authUserId: input.session.user.id,
      adminUserId: input.session.adminUser.id,
      userRole: input.session.adminUser.role,
      outcome: "provider_rejected_update",
      metadata: {
        provider: "supabase_auth",
        upstreamStatus: updateResponse.status,
      },
    });
    throw new AdminServiceError(
      "AUTH_PROVIDER_ERROR",
      "Password change failed. Try again.",
      updateResponse.status >= 500 ? 502 : 400,
      updatePayload,
    );
  }

  await revokeOtherAdminSessionsForUser(
    resolvedConfig,
    input.session.user.id,
    input.currentGovernedSessionId,
    "password_changed",
    { fetchImpl },
  );
  logAdminPasswordAuditEvent({
    request: input.request,
    event: "SESSIONS_REVOKED_AFTER_PASSWORD_CHANGE",
    status: 200,
    authUserId: input.session.user.id,
    adminUserId: input.session.adminUser.id,
    userRole: input.session.adminUser.role,
    outcome: input.currentGovernedSessionId ? "other_sessions_revoked" : "all_sessions_revoked",
    metadata: {
      reason: "password_changed",
    },
  });
  logAdminPasswordAuditEvent({
    request: input.request,
    event: "PASSWORD_CHANGED",
    status: 200,
    authUserId: input.session.user.id,
    adminUserId: input.session.adminUser.id,
    userRole: input.session.adminUser.role,
    outcome: "completed",
  });
}

import { z } from "zod";
import { apiError, apiSuccess } from "../../../../lib/api/responses.ts";
import { validateJsonBody } from "../../../../lib/api/validation.ts";
import {
  applyAdminSessionResponseHeaders,
  getAdminAuthConfig,
  requireAdmin,
} from "../../../../lib/admin/auth.ts";
import {
  adminLoginProtectionRateLimitedResponse,
  applyAdminLoginProtectionHeaders,
  evaluateAdminLoginProtection,
  getAdminLoginClientIp,
  recordAdminLoginDelayApplied,
  recordAdminLoginProtectionOutcome,
  waitForAdminLoginProtectionDelay,
  type AdminLoginProtectionDecision,
  type AdminLoginProtectionIdentity,
} from "../../../../lib/admin/login-protection.ts";
import {
  createAdminGovernedSession,
  getAdminSessionClientIp,
  getAdminSessionGovernanceConfig,
} from "../../../../lib/admin/session-governance.ts";
import { validateAdminUnsafeRequestOrigin } from "../../../../lib/admin/origin.ts";
import {
  appendAdminSessionCookies,
  signInAdminCookieSession,
} from "../../../../lib/admin/session-cookies.ts";
import { AppError, mapExternalError } from "../../../../lib/errors/app-error.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
  redactEmailForLog,
} from "../../../../lib/observability.ts";

const adminLoginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

async function recordLoginProtectionOutcomeSafely(
  config: NonNullable<ReturnType<typeof getAdminAuthConfig>>,
  identity: AdminLoginProtectionIdentity,
  action: "LOGIN_SUCCESS" | "LOGIN_FAILED",
  routeLog: ReturnType<typeof createRouteLogContext>,
  emailHint: string,
): Promise<void> {
  try {
    await recordAdminLoginProtectionOutcome(config, identity, action);
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_LOGIN_PROTECTION_WRITE_FAILED",
      status: 500,
      message: "Admin login protection outcome could not be persisted.",
      error,
      metadata: {
        emailHint,
        outcomeAction: action,
      },
    });
  }
}

function attachLoginProtectionHeaders(
  response: Response,
  decision: AdminLoginProtectionDecision,
  requestId: string,
): Response {
  return attachRequestIdHeader(
    applyAdminLoginProtectionHeaders(response, decision),
    requestId,
  );
}

export async function POST(request: Request) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/login",
    area: "auth",
  });
  const originFailure = validateAdminUnsafeRequestOrigin(request);

  if (originFailure) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_LOGIN_ORIGIN_REJECTED",
      status: originFailure.status,
      message: "Admin login request origin was rejected.",
    });
    return attachRequestIdHeader(originFailure, routeLog.requestId);
  }

  const body = await validateJsonBody(request, adminLoginRequestSchema);

  if (!body.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_LOGIN_REJECTED",
      status: body.response.status,
      message: "Admin login request validation failed.",
    });
    return attachRequestIdHeader(body.response, routeLog.requestId);
  }
  const emailHint = redactEmailForLog(body.data.email) ?? "unknown";

  const config = getAdminAuthConfig();

  if (!config) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_LOGIN_CONFIGURATION_ERROR",
      status: 503,
      message: "Admin login is unavailable because auth config is missing.",
      metadata: {
        emailHint,
      },
    });
    return attachRequestIdHeader(
      apiError(
        "CONFIGURATION_ERROR",
        "Admin authentication is unavailable.",
        503,
      ),
      routeLog.requestId,
    );
  }

  const loginProtectionIdentity: AdminLoginProtectionIdentity = {
    email: body.data.email,
    ipAddress: getAdminLoginClientIp(request),
    userAgent: request.headers.get("user-agent"),
    requestId: routeLog.requestId,
  };
  let protectionDecision: AdminLoginProtectionDecision;

  try {
    protectionDecision = await evaluateAdminLoginProtection(config, loginProtectionIdentity);
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_LOGIN_PROTECTION_UNAVAILABLE",
      status: 503,
      message: "Admin login protection could not evaluate this request.",
      error,
      metadata: {
        emailHint,
      },
    });
    return attachRequestIdHeader(
      apiError(
        "UPSTREAM_ERROR",
        "Admin authentication is temporarily unavailable.",
        503,
      ),
      routeLog.requestId,
    );
  }

  if (!protectionDecision.allowed) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_LOGIN_RATE_LIMITED",
      status: 429,
      message: "Admin login request was rate limited by persistent protection.",
      metadata: {
        emailHint,
        activeScope: protectionDecision.activeScope,
        retryAfterSeconds: protectionDecision.retryAfterSeconds,
      },
    });
    return attachRequestIdHeader(
      adminLoginProtectionRateLimitedResponse(protectionDecision),
      routeLog.requestId,
    );
  }

  if (protectionDecision.delayMs > 0) {
    try {
      await recordAdminLoginDelayApplied(config, loginProtectionIdentity, protectionDecision);
    } catch (error) {
      logRouteEvent("error", routeLog, {
        event: "ADMIN_LOGIN_PROTECTION_DELAY_WRITE_FAILED",
        status: 500,
        message: "Admin login progressive delay event could not be persisted.",
        error,
        metadata: {
          emailHint,
          delayMs: protectionDecision.delayMs,
        },
      });
    }
    logRouteEvent("info", routeLog, {
      event: "ADMIN_LOGIN_DELAY_APPLIED",
      status: 202,
      message: "Admin login request received a progressive delay.",
      metadata: {
        emailHint,
        delayMs: protectionDecision.delayMs,
        activeScope: protectionDecision.activeScope,
      },
    });
    await waitForAdminLoginProtectionDelay(protectionDecision.delayMs);
  }

  try {
    const cookieSession = await signInAdminCookieSession(
      body.data.email,
      body.data.password,
      config,
    );
    const authRequest = new Request(request.url, {
      headers: {
        authorization: `Bearer ${cookieSession.accessToken}`,
        "x-request-id": routeLog.requestId,
      },
    });
    const admin = await requireAdmin(authRequest, {
      config,
      fetchImpl: fetch,
    });

    if (!admin.success) {
      await recordLoginProtectionOutcomeSafely(
        config,
        loginProtectionIdentity,
        "LOGIN_FAILED",
        routeLog,
        emailHint,
      );
      logRouteEvent("warn", routeLog, {
        event: "ADMIN_LOGIN_DENIED",
        status: admin.response.status,
        message: "Authenticated user failed admin workspace authorization.",
        metadata: {
          emailHint,
        },
      });
      return attachLoginProtectionHeaders(admin.response, protectionDecision, routeLog.requestId);
    }

    const response = apiSuccess({
      user: admin.session.user,
      adminUser: admin.session.adminUser,
    });
    let governedSessionId: string | null = null;

    try {
      governedSessionId = await createAdminGovernedSession(
        config,
        admin.session.user,
        admin.session.adminUser,
        cookieSession,
        {
          sessionId: null,
          ipAddress: getAdminSessionClientIp(request),
          userAgent: request.headers.get("user-agent"),
          requestId: routeLog.requestId,
        },
      );
    } catch (error) {
      logRouteEvent("error", routeLog, {
        event: "ADMIN_SESSION_GOVERNANCE_CREATE_FAILED",
        status: 503,
        message: "Admin governed session could not be created.",
        error,
        metadata: {
          emailHint,
        },
      });
      return attachRequestIdHeader(
        apiError(
          "UPSTREAM_ERROR",
          "Admin authentication is temporarily unavailable.",
          503,
        ),
        routeLog.requestId,
      );
    }

    await recordLoginProtectionOutcomeSafely(
      config,
      loginProtectionIdentity,
      "LOGIN_SUCCESS",
      routeLog,
      emailHint,
    );
    appendAdminSessionCookies(response.headers, cookieSession, {
      adminSessionId: governedSessionId,
      adminSessionMaxAgeSeconds: Math.ceil(getAdminSessionGovernanceConfig().absoluteTimeoutMs / 1000),
    });
    logRouteEvent("info", routeLog, {
      event: "ADMIN_LOGIN_SUCCEEDED",
      status: 200,
      message: "Admin login succeeded.",
      userId: admin.session.user.id,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      metadata: {
        emailHint,
      },
    });
    return attachLoginProtectionHeaders(
      applyAdminSessionResponseHeaders(response, admin.responseHeaders),
      protectionDecision,
      routeLog.requestId,
    );
  } catch (error) {
    const mapped = error instanceof AppError
      ? error
      : mapExternalError(error, {
        code: "UNKNOWN_ERROR",
        message: "Admin authentication failed.",
        status: 502,
        detail: "The login flow failed unexpectedly.",
      });

    logRouteEvent("warn", routeLog, {
      event: "ADMIN_LOGIN_FAILED",
      status: mapped.status ?? 500,
      message: mapped.message,
      error,
      errorCode: mapped.code,
      metadata: {
        emailHint,
      },
    });
    await recordLoginProtectionOutcomeSafely(
      config,
      loginProtectionIdentity,
      "LOGIN_FAILED",
      routeLog,
      emailHint,
    );

    return attachLoginProtectionHeaders(
      apiError(
        mapped.code,
        "Admin authentication failed.",
        mapped.status ?? 500,
      ),
      protectionDecision,
      routeLog.requestId,
    );
  }
}

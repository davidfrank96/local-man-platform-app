import { z } from "zod";
import { apiError, apiSuccess } from "../../../../lib/api/responses.ts";
import {
  ADMIN_LOGIN_RATE_LIMIT,
  applyRateLimitResponseHeaders,
  consumeRateLimit,
} from "../../../../lib/api/abuse-protection.ts";
import { validateJsonBody } from "../../../../lib/api/validation.ts";
import {
  applyAdminSessionResponseHeaders,
  getAdminAuthConfig,
  requireAdmin,
} from "../../../../lib/admin/auth.ts";
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
  const emailHint = redactEmailForLog(body.data.email);

  const rateLimit = consumeRateLimit(request, {
    policy: ADMIN_LOGIN_RATE_LIMIT,
    scope: body.data.email,
    useClientCookie: false,
  });

  if (!rateLimit.allowed) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_LOGIN_RATE_LIMITED",
      status: 429,
      message: "Admin login request was rate limited.",
      metadata: {
        emailHint,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(
          "TOO_MANY_REQUESTS",
          "Too many login attempts. Please wait before trying again.",
          429,
          {
            retry_after_seconds: rateLimit.retryAfterSeconds,
          },
          "Authentication is temporarily rate limited to protect Local Man.",
        ),
        rateLimit,
      ),
      routeLog.requestId,
    );
  }

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
      applyRateLimitResponseHeaders(
        apiError(
          "CONFIGURATION_ERROR",
          "Admin authentication is unavailable.",
          503,
        ),
        rateLimit,
      ),
      routeLog.requestId,
    );
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
      logRouteEvent("warn", routeLog, {
        event: "ADMIN_LOGIN_DENIED",
        status: admin.response.status,
        message: "Authenticated user failed admin workspace authorization.",
        metadata: {
          emailHint,
        },
      });
      return attachRequestIdHeader(
        applyRateLimitResponseHeaders(admin.response, rateLimit),
        routeLog.requestId,
      );
    }

    const response = apiSuccess({
      user: admin.session.user,
      adminUser: admin.session.adminUser,
    });

    appendAdminSessionCookies(response.headers, cookieSession);
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
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        applyAdminSessionResponseHeaders(response, admin.responseHeaders),
        rateLimit,
      ),
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

    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(
          mapped.code,
          "Admin authentication failed.",
          mapped.status ?? 500,
        ),
        rateLimit,
      ),
      routeLog.requestId,
    );
  }
}

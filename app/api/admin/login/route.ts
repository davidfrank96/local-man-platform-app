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
import {
  appendAdminSessionCookies,
  signInAdminCookieSession,
} from "../../../../lib/admin/session-cookies.ts";
import { AppError, mapExternalError } from "../../../../lib/errors/app-error.ts";

const adminLoginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await validateJsonBody(request, adminLoginRequestSchema);

  if (!body.success) {
    return body.response;
  }

  const rateLimit = consumeRateLimit(request, {
    policy: ADMIN_LOGIN_RATE_LIMIT,
    scope: body.data.email,
    useClientCookie: false,
  });

  if (!rateLimit.allowed) {
    return applyRateLimitResponseHeaders(
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
    );
  }

  const config = getAdminAuthConfig();

  if (!config) {
    return applyRateLimitResponseHeaders(
      apiError(
        "CONFIGURATION_ERROR",
        "Supabase environment variables are required for admin authentication.",
        503,
      ),
      rateLimit,
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
        "x-request-id": request.headers.get("x-request-id") ?? crypto.randomUUID(),
      },
    });
    const admin = await requireAdmin(authRequest, {
      config,
      fetchImpl: fetch,
    });

    if (!admin.success) {
      return applyRateLimitResponseHeaders(admin.response, rateLimit);
    }

    const response = apiSuccess({
      user: admin.session.user,
      adminUser: admin.session.adminUser,
    });

    appendAdminSessionCookies(response.headers, cookieSession);
    return applyRateLimitResponseHeaders(
      applyAdminSessionResponseHeaders(response, admin.responseHeaders),
      rateLimit,
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

    return applyRateLimitResponseHeaders(
      apiError(
        mapped.code,
        mapped.message,
        mapped.status ?? 500,
        mapped.details,
        mapped.detail,
      ),
      rateLimit,
    );
  }
}

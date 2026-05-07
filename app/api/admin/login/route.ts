import { z } from "zod";
import { apiError, apiSuccess } from "../../../../lib/api/responses.ts";
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

  const config = getAdminAuthConfig();

  if (!config) {
    return apiError(
      "CONFIGURATION_ERROR",
      "Supabase environment variables are required for admin authentication.",
      503,
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
      return admin.response;
    }

    const response = apiSuccess({
      user: admin.session.user,
      adminUser: admin.session.adminUser,
    });

    appendAdminSessionCookies(response.headers, cookieSession);
    return applyAdminSessionResponseHeaders(response, admin.responseHeaders);
  } catch (error) {
    const mapped = error instanceof AppError
      ? error
      : mapExternalError(error, {
        code: "UNKNOWN_ERROR",
        message: "Admin authentication failed.",
        status: 502,
        detail: "The login flow failed unexpectedly.",
      });

    return apiError(
      mapped.code,
      mapped.message,
      mapped.status ?? 500,
      mapped.details,
      mapped.detail,
    );
  }
}

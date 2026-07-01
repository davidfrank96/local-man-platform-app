import { z } from "zod";
import { apiError, apiSuccess } from "../../../../../lib/api/responses.ts";
import { validateJsonBody } from "../../../../../lib/api/validation.ts";
import { requestAdminPasswordReset } from "../../../../../lib/admin/password-management.ts";
import { validateAdminUnsafeRequestOrigin } from "../../../../../lib/admin/origin.ts";
import { handleAdminServiceError } from "../../../../../lib/admin/errors.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../../lib/observability.ts";

const forgotPasswordRequestSchema = z.object({
  email: z.email(),
});

export async function POST(request: Request) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/password/forgot",
    area: "auth",
  });
  const originFailure = validateAdminUnsafeRequestOrigin(request);

  if (originFailure) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_PASSWORD_RESET_ORIGIN_REJECTED",
      status: originFailure.status,
      message: "Admin password reset request origin was rejected.",
    });
    return attachRequestIdHeader(originFailure, routeLog.requestId);
  }

  const body = await validateJsonBody(request, forgotPasswordRequestSchema);

  if (!body.success) {
    return attachRequestIdHeader(body.response, routeLog.requestId);
  }

  try {
    await requestAdminPasswordReset({
      email: body.data.email,
      request,
    });
    return attachRequestIdHeader(
      apiSuccess({
        message: "If an admin account exists for that email, a password reset link will be sent.",
      }),
      routeLog.requestId,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Admin authentication is unavailable")) {
      return attachRequestIdHeader(
        apiError("CONFIGURATION_ERROR", "Password reset is unavailable.", 503),
        routeLog.requestId,
      );
    }

    return attachRequestIdHeader(
      handleAdminServiceError(error, "Password reset is unavailable."),
      routeLog.requestId,
    );
  }
}

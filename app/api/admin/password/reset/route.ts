import { z } from "zod";
import { apiSuccess } from "../../../../../lib/api/responses.ts";
import { validateJsonBody } from "../../../../../lib/api/validation.ts";
import { validateAdminUnsafeRequestOrigin } from "../../../../../lib/admin/origin.ts";
import { handleAdminServiceError } from "../../../../../lib/admin/errors.ts";
import { completeAdminPasswordReset } from "../../../../../lib/admin/password-management.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../../lib/observability.ts";

const resetPasswordRequestSchema = z.object({
  access_token: z.string().trim().min(1),
  password: z.string().min(1),
  confirm_password: z.string().min(1),
});

export async function POST(request: Request) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/password/reset",
    area: "auth",
  });
  const originFailure = validateAdminUnsafeRequestOrigin(request);

  if (originFailure) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_PASSWORD_RESET_ORIGIN_REJECTED",
      status: originFailure.status,
      message: "Admin password reset completion origin was rejected.",
    });
    return attachRequestIdHeader(originFailure, routeLog.requestId);
  }

  const body = await validateJsonBody(request, resetPasswordRequestSchema);

  if (!body.success) {
    return attachRequestIdHeader(body.response, routeLog.requestId);
  }

  try {
    await completeAdminPasswordReset({
      accessToken: body.data.access_token,
      newPassword: body.data.password,
      confirmPassword: body.data.confirm_password,
      request,
    });
    return attachRequestIdHeader(
      apiSuccess({
        message: "Password reset complete. Sign in with your new password.",
      }),
      routeLog.requestId,
    );
  } catch (error) {
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Password reset failed."),
      routeLog.requestId,
    );
  }
}

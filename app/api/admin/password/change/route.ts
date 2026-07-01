import { z } from "zod";
import { apiSuccess } from "../../../../../lib/api/responses.ts";
import { validateJsonBody } from "../../../../../lib/api/validation.ts";
import {
  applyAdminSessionResponseHeaders,
  requireAdmin,
} from "../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../lib/admin/errors.ts";
import { changeAdminPassword } from "../../../../../lib/admin/password-management.ts";
import { readAdminSessionCookies } from "../../../../../lib/admin/session-cookies.ts";

const changePasswordRequestSchema = z.object({
  current_password: z.string().min(1),
  password: z.string().min(1),
  confirm_password: z.string().min(1),
});

export async function POST(request: Request) {
  const admin = await requireAdmin(request, {
    allowCookieRefresh: true,
  });

  if (!admin.success) {
    return admin.response;
  }

  const body = await validateJsonBody(request, changePasswordRequestSchema);

  if (!body.success) {
    return applyAdminSessionResponseHeaders(body.response, admin.responseHeaders);
  }

  try {
    await changeAdminPassword({
      currentPassword: body.data.current_password,
      newPassword: body.data.password,
      confirmPassword: body.data.confirm_password,
      request,
      session: admin.session,
      currentGovernedSessionId: readAdminSessionCookies(request).adminSessionId,
    });
    return applyAdminSessionResponseHeaders(
      apiSuccess({
        message: "Password changed.",
      }),
      admin.responseHeaders,
    );
  } catch (error) {
    return applyAdminSessionResponseHeaders(
      handleAdminServiceError(error, "Password change failed."),
      admin.responseHeaders,
    );
  }
}

import { apiSuccess } from "../../../../lib/api/responses.ts";
import {
  applyAdminSessionResponseHeaders,
  requireAdmin,
} from "../../../../lib/admin/auth.ts";

export async function GET(request: Request) {
  const admin = await requireAdmin(request, {
    allowCookieRefresh: true,
  });

  if (!admin.success) {
    return admin.response;
  }

  return applyAdminSessionResponseHeaders(apiSuccess({
    user: admin.session.user,
    adminUser: admin.session.adminUser,
  }), admin.responseHeaders);
}

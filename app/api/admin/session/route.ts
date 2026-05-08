import { apiSuccess } from "../../../../lib/api/responses.ts";
import {
  applyAdminSessionResponseHeaders,
  requireAdmin,
} from "../../../../lib/admin/auth.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../lib/observability.ts";

export async function GET(request: Request) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/session",
    area: "auth",
  });
  const admin = await requireAdmin(request, {
    allowCookieRefresh: true,
  });

  if (!admin.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_SESSION_VALIDATION_FAILED",
      status: admin.response.status,
      message: "Admin session validation failed.",
    });
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const response = applyAdminSessionResponseHeaders(apiSuccess({
    user: admin.session.user,
    adminUser: admin.session.adminUser,
  }), admin.responseHeaders);

  logRouteEvent("info", {
    ...routeLog,
    requestId: admin.session.requestId,
  }, {
    event: "ADMIN_SESSION_VALIDATED",
    status: 200,
    message: "Admin session validated.",
    userId: admin.session.user.id,
    adminUserId: admin.session.adminUser.id,
    userRole: admin.session.adminUser.role,
    metadata: {
      refreshedSession: Boolean(admin.responseHeaders),
    },
  });

  return attachRequestIdHeader(response, admin.session.requestId);
}

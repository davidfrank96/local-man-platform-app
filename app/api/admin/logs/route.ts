import type { NextRequest } from "next/server";
import { apiSuccess } from "../../../../lib/api/responses.ts";
import { validateSearchParams } from "../../../../lib/api/validation.ts";
import { requireAdminPermission } from "../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../lib/admin/errors.ts";
import { listOperationalLogs } from "../../../../lib/admin/operational-log-service.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../lib/observability.ts";
import { adminOperationalLogsQuerySchema } from "../../../../lib/validation/index.ts";

export async function GET(request: NextRequest) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/logs",
    area: "db",
  });
  const admin = await requireAdminPermission(request, "platform_logs:read");

  if (!admin.success) {
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const query = validateSearchParams(
    adminOperationalLogsQuerySchema,
    request.nextUrl.searchParams,
  );

  if (!query.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_OPERATIONAL_LOGS_REQUEST_INVALID",
      message: "Admin operational log request query validation failed.",
      status: query.response.status,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      metadata: {
        query: Object.fromEntries(request.nextUrl.searchParams.entries()),
      },
    });
    return attachRequestIdHeader(query.response, admin.session.requestId);
  }

  try {
    const logs = await listOperationalLogs(query.data, {
      session: admin.session,
    });

    logRouteEvent("info", routeLog, {
      event: "ADMIN_OPERATIONAL_LOGS_COMPLETED",
      message: "Admin operational logs loaded successfully.",
      status: 200,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      metadata: {
        level: query.data.level ?? null,
        area: query.data.area ?? null,
        eventFilter: query.data.event ?? null,
        routeFilter: query.data.route ?? null,
        timeWindow: query.data.time_window ?? null,
        resultCount: logs.operationalEvents.length,
        hasMore: logs.pagination.has_more,
      },
    });

    return attachRequestIdHeader(apiSuccess(logs), admin.session.requestId);
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_OPERATIONAL_LOGS_FAILED",
      message: "Admin operational log request failed.",
      status: 502,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      error,
      metadata: {
        level: query.data.level ?? null,
        area: query.data.area ?? null,
        eventFilter: query.data.event ?? null,
        routeFilter: query.data.route ?? null,
        timeWindow: query.data.time_window ?? null,
      },
    });
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Unable to load logs."),
      admin.session.requestId,
    );
  }
}

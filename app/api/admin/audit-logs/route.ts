import type { NextRequest } from "next/server";
import { apiEndpoints } from "../../../../lib/api/contracts.ts";
import { apiSuccess } from "../../../../lib/api/responses.ts";
import { validateSearchParams } from "../../../../lib/api/validation.ts";
import { requireAdminPermission } from "../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../lib/admin/errors.ts";
import { listAuditLogs } from "../../../../lib/admin/audit-log-service.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../lib/observability.ts";
import { auditLogsQuerySchema } from "../../../../lib/validation/index.ts";

export async function GET(request: NextRequest) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/audit-logs",
    area: "analytics",
  });
  const admin = await requireAdminPermission(request, "audit_logs:read");

  if (!admin.success) {
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const query = validateSearchParams(
    auditLogsQuerySchema,
    request.nextUrl.searchParams,
  );

  if (!query.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_AUDIT_LOGS_REQUEST_INVALID",
      message: "Admin audit log request query validation failed.",
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
    const auditLogs = await listAuditLogs(query.data, {
      session: admin.session,
    });

    logRouteEvent("info", routeLog, {
      event: "ADMIN_AUDIT_LOGS_COMPLETED",
      message: "Admin audit logs loaded successfully.",
      status: 200,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      metadata: {
        role: query.data.user_role ?? null,
        action: query.data.action ?? null,
        limit: query.data.limit,
        offset: query.data.offset,
        resultCount: auditLogs.auditLogs.length,
        hasMore: auditLogs.pagination.has_more,
      },
    });

    return attachRequestIdHeader(apiSuccess(auditLogs), admin.session.requestId);
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_AUDIT_LOGS_FAILED",
      message: "Admin audit log request failed.",
      status: 502,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      error,
      metadata: {
        role: query.data.user_role ?? null,
        action: query.data.action ?? null,
        limit: query.data.limit,
        offset: query.data.offset,
      },
    });
    return attachRequestIdHeader(
      handleAdminServiceError(
        error,
        `Unable to load ${apiEndpoints.getAuditLogs.path}.`,
      ),
      admin.session.requestId,
    );
  }
}

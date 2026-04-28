import type { NextRequest } from "next/server";
import { apiEndpoints } from "../../../../lib/api/contracts.ts";
import { apiSuccess } from "../../../../lib/api/responses.ts";
import { validateSearchParams } from "../../../../lib/api/validation.ts";
import { requireAdminPermission } from "../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../lib/admin/errors.ts";
import { listAuditLogs } from "../../../../lib/admin/audit-log-service.ts";
import { logStructuredEvent } from "../../../../lib/observability.ts";
import { auditLogsQuerySchema } from "../../../../lib/validation/index.ts";

export async function GET(request: NextRequest) {
  const admin = await requireAdminPermission(request, "audit_logs:read");

  if (!admin.success) {
    return admin.response;
  }

  const query = validateSearchParams(
    auditLogsQuerySchema,
    request.nextUrl.searchParams,
  );

  if (!query.success) {
    logStructuredEvent("warn", {
      type: "AUDIT_LOGS_REQUEST_INVALID",
      requestId: admin.session.requestId,
      query: Object.fromEntries(request.nextUrl.searchParams.entries()),
    });
    return query.response;
  }

  try {
    logStructuredEvent("info", {
      type: "AUDIT_LOGS_REQUEST",
      requestId: admin.session.requestId,
      query: query.data,
    });

    const auditLogs = await listAuditLogs(query.data, {
      session: admin.session,
    });

    return apiSuccess(auditLogs);
  } catch (error) {
    return handleAdminServiceError(
      error,
      `Unable to load ${apiEndpoints.getAuditLogs.path}.`,
    );
  }
}

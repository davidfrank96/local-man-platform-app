import type { NextRequest } from "next/server";
import { apiEndpoints } from "@/lib/api/contracts";
import { apiNotImplemented } from "@/lib/api/responses";
import { validateSearchParams } from "@/lib/api/validation";
import { requireAdmin } from "@/lib/admin/auth";
import { auditLogsQuerySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin.success) {
    return admin.response;
  }

  const query = validateSearchParams(
    auditLogsQuerySchema,
    request.nextUrl.searchParams,
  );

  if (!query.success) {
    return query.response;
  }

  return apiNotImplemented(apiEndpoints.getAuditLogs);
}

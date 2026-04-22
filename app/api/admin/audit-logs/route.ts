import type { NextRequest } from "next/server";
import { apiEndpoints } from "@/lib/api/contracts";
import { apiNotImplemented } from "@/lib/api/responses";
import { validateSearchParams } from "@/lib/api/validation";
import { auditLogsQuerySchema } from "@/lib/validation";

export function GET(request: NextRequest) {
  const query = validateSearchParams(
    auditLogsQuerySchema,
    request.nextUrl.searchParams,
  );

  if (!query.success) {
    return query.response;
  }

  return apiNotImplemented(apiEndpoints.getAuditLogs);
}

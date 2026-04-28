import type { NextRequest } from "next/server";
import { apiSuccess } from "../../../../lib/api/responses.ts";
import { validateSearchParams } from "../../../../lib/api/validation.ts";
import { requireAdminPermission } from "../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../lib/admin/errors.ts";
import { getAdminAnalytics } from "../../../../lib/admin/analytics-service.ts";
import { adminAnalyticsQuerySchema } from "../../../../lib/validation/index.ts";

export async function GET(request: NextRequest) {
  const admin = await requireAdminPermission(request, "analytics:read");

  if (!admin.success) {
    return admin.response;
  }

  const query = validateSearchParams(
    adminAnalyticsQuerySchema,
    request.nextUrl.searchParams,
  );

  if (!query.success) {
    return query.response;
  }

  try {
    const analytics = await getAdminAnalytics(query.data.range, {
      session: admin.session,
    });

    return apiSuccess(analytics);
  } catch (error) {
    return handleAdminServiceError(error, "Unable to load analytics.");
  }
}

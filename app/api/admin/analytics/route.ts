import type { NextRequest } from "next/server";
import { apiSuccess } from "../../../../lib/api/responses.ts";
import { validateSearchParams } from "../../../../lib/api/validation.ts";
import { requireAdminPermission } from "../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../lib/admin/errors.ts";
import { getAdminAnalytics } from "../../../../lib/admin/analytics-service.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../lib/observability.ts";
import { adminAnalyticsQuerySchema } from "../../../../lib/validation/index.ts";

export async function GET(request: NextRequest) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/analytics",
    area: "analytics",
  });
  const admin = await requireAdminPermission(request, "analytics:read");

  if (!admin.success) {
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const query = validateSearchParams(
    adminAnalyticsQuerySchema,
    request.nextUrl.searchParams,
  );

  if (!query.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_ANALYTICS_REQUEST_INVALID",
      message: "Admin analytics request query validation failed.",
      status: query.response.status,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      metadata: {
        searchParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
      },
    });
    return attachRequestIdHeader(query.response, admin.session.requestId);
  }

  try {
    const analytics = await getAdminAnalytics(query.data.range, {
      session: admin.session,
    });

    logRouteEvent("info", routeLog, {
      event: "ADMIN_ANALYTICS_COMPLETED",
      message: "Admin analytics loaded successfully.",
      status: 200,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      metadata: {
        range: query.data.range,
        recentEventsCount: analytics.recent_events.length,
        mostSelectedVendorsCount: analytics.vendor_performance.most_selected_vendors.length,
        mostViewedVendorDetailsCount:
          analytics.vendor_performance.most_viewed_vendor_details.length,
      },
    });

    return attachRequestIdHeader(apiSuccess(analytics), admin.session.requestId);
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_ANALYTICS_FAILED",
      message: "Admin analytics request failed.",
      status: 502,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      error,
      metadata: {
        range: query.data.range,
      },
    });
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Unable to load analytics."),
      admin.session.requestId,
    );
  }
}

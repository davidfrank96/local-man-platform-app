import { apiSuccess } from "../../../../../../lib/api/responses.ts";
import { validateInput } from "../../../../../../lib/api/validation.ts";
import { requireAdminPermission } from "../../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../../lib/admin/errors.ts";
import { getAdminVendorRatingSignalSummary } from "../../../../../../lib/admin/vendor-service.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../../../lib/observability.ts";
import { vendorIdParamsSchema } from "../../../../../../lib/validation/index.ts";

type AdminVendorRatingSignalsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: AdminVendorRatingSignalsRouteContext,
) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/vendors/[id]/rating-signals",
    area: "admin",
  });
  const admin = await requireAdminPermission(request, "analytics:read");

  if (!admin.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_RATING_SIGNALS_DENIED",
      message: "Unauthorized vendor rating signal summary attempt was blocked.",
      status: admin.response.status,
    });
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_RATING_SIGNALS_REJECTED",
      message: "Vendor rating signal summary used invalid route parameters.",
      status: routeParams.response.status,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
    });
    return attachRequestIdHeader(routeParams.response, admin.session.requestId);
  }

  try {
    const signalSummary = await getAdminVendorRatingSignalSummary(
      routeParams.data,
      {
        session: admin.session,
      },
    );

    logRouteEvent("info", routeLog, {
      event: "ADMIN_VENDOR_RATING_SIGNALS_LOADED",
      message: "Vendor rating signal summary loaded successfully.",
      status: 200,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.data.id,
      metadata: {
        positiveSignalCount: signalSummary.positive_signal_count,
        neutralSignalCount: signalSummary.neutral_signal_count,
        negativeSignalCount: signalSummary.negative_signal_count,
      },
    });

    return attachRequestIdHeader(
      apiSuccess({ signal_summary: signalSummary }),
      admin.session.requestId,
    );
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_VENDOR_RATING_SIGNALS_FAILED",
      message: "Vendor rating signal summary request failed.",
      status: 502,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.data.id,
      error,
    });
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Unable to load rating signal summary."),
      admin.session.requestId,
    );
  }
}

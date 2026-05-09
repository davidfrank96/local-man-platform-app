import { apiSuccess } from "../../../../../../lib/api/responses.ts";
import {
  validateInput,
  validateJsonBody,
} from "../../../../../../lib/api/validation.ts";
import { requireAdmin } from "../../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../../lib/admin/errors.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../../../lib/observability.ts";
import {
  listVendorHours,
  replaceVendorHours,
} from "../../../../../../lib/admin/vendor-service.ts";
import {
  replaceVendorHoursRequestSchema,
  vendorIdParamsSchema,
} from "../../../../../../lib/validation/index.ts";

type VendorHoursRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: VendorHoursRouteContext) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/vendors/[id]/hours",
    area: "admin",
  });
  const admin = await requireAdmin(request);

  if (!admin.success) {
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return attachRequestIdHeader(routeParams.response, admin.session.requestId);
  }

  try {
    const hours = await listVendorHours(routeParams.data, {
      session: admin.session,
    });

    return attachRequestIdHeader(apiSuccess({ hours }), admin.session.requestId);
  } catch (error) {
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Unable to load vendor hours."),
      admin.session.requestId,
    );
  }
}

export async function POST(_request: Request, { params }: VendorHoursRouteContext) {
  const routeLog = createRouteLogContext(_request, {
    route: "/api/admin/vendors/[id]/hours",
    area: "admin",
  });
  const admin = await requireAdmin(_request);

  if (!admin.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_HOURS_REPLACE_DENIED",
      message: "Unauthorized vendor hours update attempt was blocked.",
      status: admin.response.status,
    });
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_HOURS_REPLACE_REJECTED",
      message: "Vendor hours update used invalid route parameters.",
      status: routeParams.response.status,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
    });
    return attachRequestIdHeader(routeParams.response, admin.session.requestId);
  }

  const body = await validateJsonBody(_request, replaceVendorHoursRequestSchema);

  if (!body.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_HOURS_REPLACE_REJECTED",
      message: "Vendor hours update request validation failed.",
      status: body.response.status,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.data.id,
    });
    return attachRequestIdHeader(body.response, admin.session.requestId);
  }

  try {
    const hours = await replaceVendorHours(routeParams.data, body.data, {
      session: admin.session,
    });

    logRouteEvent("info", routeLog, {
      event: "ADMIN_VENDOR_HOURS_REPLACED",
      message: "Vendor hours updated successfully.",
      status: 200,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.data.id,
      metadata: {
        hoursCount: hours.length,
      },
    });

    return attachRequestIdHeader(apiSuccess({ hours }), admin.session.requestId);
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_VENDOR_HOURS_REPLACE_FAILED",
      message: "Vendor hours update failed.",
      status: 502,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.data.id,
      error,
    });
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Unable to replace vendor hours."),
      admin.session.requestId,
    );
  }
}

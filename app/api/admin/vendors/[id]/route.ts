import { apiSuccess } from "../../../../../lib/api/responses.ts";
import {
  validateInput,
  validateJsonBody,
} from "../../../../../lib/api/validation.ts";
import {
  requireAdmin,
  requireAdminPermission,
} from "../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../lib/admin/errors.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../../lib/observability.ts";
import {
  softDeleteVendor,
  updateVendor,
} from "../../../../../lib/admin/vendor-service.ts";
import {
  updateVendorRequestSchema,
  vendorIdParamsSchema,
} from "../../../../../lib/validation/index.ts";

type AdminVendorRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(_request: Request, { params }: AdminVendorRouteContext) {
  const routeLog = createRouteLogContext(_request, {
    route: "/api/admin/vendors/[id]",
    area: "admin",
  });
  const admin = await requireAdmin(_request);

  if (!admin.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_UPDATE_DENIED",
      message: "Unauthorized vendor update attempt was blocked.",
      status: admin.response.status,
    });
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_UPDATE_REJECTED",
      message: "Vendor update used invalid route parameters.",
      status: routeParams.response.status,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
    });
    return attachRequestIdHeader(routeParams.response, admin.session.requestId);
  }

  const body = await validateJsonBody(_request, updateVendorRequestSchema);

  if (!body.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_UPDATE_REJECTED",
      message: "Vendor update request validation failed.",
      status: body.response.status,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.data.id,
    });
    return attachRequestIdHeader(body.response, admin.session.requestId);
  }

  try {
    const vendor = await updateVendor(routeParams.data, body.data, {
      session: admin.session,
    });

    logRouteEvent("info", routeLog, {
      event: "ADMIN_VENDOR_UPDATED",
      message: "Vendor updated successfully.",
      status: 200,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: vendor.id,
      vendorSlug: vendor.slug,
      metadata: {
        changedFields: Object.keys(body.data),
      },
    });

    return attachRequestIdHeader(apiSuccess({ vendor }), admin.session.requestId);
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_VENDOR_UPDATE_FAILED",
      message: "Vendor update failed.",
      status: 502,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.data.id,
      error,
    });
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Unable to update vendor."),
      admin.session.requestId,
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: AdminVendorRouteContext,
) {
  const routeLog = createRouteLogContext(_request, {
    route: "/api/admin/vendors/[id]",
    area: "admin",
  });
  const admin = await requireAdminPermission(_request, "vendor:delete");

  if (!admin.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_DELETE_DENIED",
      message: "Unauthorized vendor delete attempt was blocked.",
      status: admin.response.status,
    });
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_DELETE_REJECTED",
      message: "Vendor delete used invalid route parameters.",
      status: routeParams.response.status,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
    });
    return attachRequestIdHeader(routeParams.response, admin.session.requestId);
  }

  try {
    const vendor = await softDeleteVendor(routeParams.data, {
      session: admin.session,
    });

    logRouteEvent("info", routeLog, {
      event: "ADMIN_VENDOR_DELETED",
      message: "Vendor was deactivated successfully.",
      status: 200,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: vendor.vendor_id,
      metadata: {
        isActive: vendor.is_active,
      },
    });

    return attachRequestIdHeader(apiSuccess({ vendor }), admin.session.requestId);
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_VENDOR_DELETE_FAILED",
      message: "Vendor delete failed.",
      status: 502,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.data.id,
      error,
    });
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Unable to delete vendor."),
      admin.session.requestId,
    );
  }
}

import { apiSuccess } from "../../../../../../../lib/api/responses.ts";
import { validateInput } from "../../../../../../../lib/api/validation.ts";
import { requireAdmin } from "../../../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../../../lib/admin/errors.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../../../../lib/observability.ts";
import { deleteVendorImage } from "../../../../../../../lib/admin/vendor-service.ts";
import {
  vendorIdParamsSchema,
  uuidSchema,
} from "../../../../../../../lib/validation/index.ts";

type VendorImageRouteContext = {
  params: Promise<{
    id: string;
    imageId: string;
  }>;
};

export async function DELETE(request: Request, { params }: VendorImageRouteContext) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/vendors/[id]/images/[imageId]",
    area: "storage",
  });
  const admin = await requireAdmin(request);

  if (!admin.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_IMAGE_DELETE_DENIED",
      message: "Unauthorized vendor image delete attempt was blocked.",
      status: admin.response.status,
    });
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const routeParams = validateInput(
    vendorIdParamsSchema.extend({ imageId: uuidSchema }),
    await params,
  );

  if (!routeParams.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_IMAGE_DELETE_REJECTED",
      message: "Vendor image delete used invalid route parameters.",
      status: routeParams.response.status,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
    });
    return attachRequestIdHeader(routeParams.response, admin.session.requestId);
  }

  try {
    const image = await deleteVendorImage(routeParams.data, {
      session: admin.session,
    });

    logRouteEvent("info", routeLog, {
      event: "ADMIN_VENDOR_IMAGE_DELETED",
      message: "Vendor image deleted successfully.",
      status: 200,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.data.id,
      metadata: {
        imageId: image.id,
        storageObjectPath: image.storage_object_path ?? null,
      },
    });

    return attachRequestIdHeader(apiSuccess({ image }), admin.session.requestId);
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_VENDOR_IMAGE_DELETE_FAILED",
      message: "Vendor image delete failed.",
      status: 502,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.success ? routeParams.data.id : null,
      error,
    });
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Unable to delete vendor image."),
      admin.session.requestId,
    );
  }
}

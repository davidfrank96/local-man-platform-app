import { apiSuccess } from "../../../../../../../lib/api/responses.ts";
import { validateInput } from "../../../../../../../lib/api/validation.ts";
import { requireAdmin } from "../../../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../../../lib/admin/errors.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../../../../lib/observability.ts";
import { deleteVendorDish } from "../../../../../../../lib/admin/vendor-service.ts";
import {
  vendorIdParamsSchema,
  uuidSchema,
} from "../../../../../../../lib/validation/index.ts";

type VendorDishRouteContext = {
  params: Promise<{
    id: string;
    dishId: string;
  }>;
};

export async function DELETE(request: Request, { params }: VendorDishRouteContext) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/vendors/[id]/dishes/[dishId]",
    area: "admin",
  });
  const admin = await requireAdmin(request);

  if (!admin.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_DISH_DELETE_DENIED",
      message: "Unauthorized featured dish delete attempt was blocked.",
      status: admin.response.status,
    });
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const routeParams = validateInput(
    vendorIdParamsSchema.extend({ dishId: uuidSchema }),
    await params,
  );

  if (!routeParams.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_DISH_DELETE_REJECTED",
      message: "Featured dish delete used invalid route parameters.",
      status: routeParams.response.status,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
    });
    return attachRequestIdHeader(routeParams.response, admin.session.requestId);
  }

  try {
    const dish = await deleteVendorDish(routeParams.data, {
      session: admin.session,
    });

    logRouteEvent("info", routeLog, {
      event: "ADMIN_VENDOR_DISH_DELETED",
      message: "Featured dish deleted successfully.",
      status: 200,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.data.id,
      metadata: {
        dishId: dish.id,
        dishName: dish.dish_name,
      },
    });

    return attachRequestIdHeader(apiSuccess({ dish }), admin.session.requestId);
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_VENDOR_DISH_DELETE_FAILED",
      message: "Featured dish delete failed.",
      status: 502,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.success ? routeParams.data.id : null,
      error,
    });
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Unable to delete vendor dish."),
      admin.session.requestId,
    );
  }
}

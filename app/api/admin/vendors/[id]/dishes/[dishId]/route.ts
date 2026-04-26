import { apiSuccess } from "../../../../../../../lib/api/responses.ts";
import { validateInput } from "../../../../../../../lib/api/validation.ts";
import { requireAdmin } from "../../../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../../../lib/admin/errors.ts";
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
  const admin = await requireAdmin(request);

  if (!admin.success) {
    return admin.response;
  }

  const routeParams = validateInput(
    vendorIdParamsSchema.extend({ dishId: uuidSchema }),
    await params,
  );

  if (!routeParams.success) {
    return routeParams.response;
  }

  try {
    const dish = await deleteVendorDish(routeParams.data, {
      session: admin.session,
    });

    return apiSuccess({ dish });
  } catch (error) {
    return handleAdminServiceError(error, "Unable to delete vendor dish.");
  }
}

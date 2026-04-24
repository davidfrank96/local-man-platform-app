import { apiSuccess } from "../../../../../../../lib/api/responses.ts";
import { validateInput } from "../../../../../../../lib/api/validation.ts";
import { requireAdmin } from "../../../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../../../lib/admin/errors.ts";
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
  const admin = await requireAdmin(request);

  if (!admin.success) {
    return admin.response;
  }

  const routeParams = validateInput(
    vendorIdParamsSchema.extend({ imageId: uuidSchema }),
    await params,
  );

  if (!routeParams.success) {
    return routeParams.response;
  }

  try {
    const image = await deleteVendorImage(routeParams.data, {
      session: admin.session,
    });

    return apiSuccess({ image });
  } catch (error) {
    return handleAdminServiceError(error, "Unable to delete vendor image.");
  }
}

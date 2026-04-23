import { apiSuccess } from "../../../../../../lib/api/responses.ts";
import {
  validateInput,
  validateJsonBody,
} from "../../../../../../lib/api/validation.ts";
import { requireAdmin } from "../../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../../lib/admin/errors.ts";
import { createVendorDishes } from "../../../../../../lib/admin/vendor-service.ts";
import {
  createVendorDishesRequestSchema,
  vendorIdParamsSchema,
} from "../../../../../../lib/validation/index.ts";

type VendorDishesRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: VendorDishesRouteContext) {
  const admin = await requireAdmin(_request);

  if (!admin.success) {
    return admin.response;
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  const body = await validateJsonBody(_request, createVendorDishesRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    const dishes = await createVendorDishes(routeParams.data, body.data, {
      session: admin.session,
    });

    return apiSuccess({ dishes }, 201);
  } catch (error) {
    return handleAdminServiceError(error, "Unable to create vendor dishes.");
  }
}

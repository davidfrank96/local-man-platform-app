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
  const admin = await requireAdmin(_request);

  if (!admin.success) {
    return admin.response;
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  const body = await validateJsonBody(_request, updateVendorRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    const vendor = await updateVendor(routeParams.data, body.data, {
      session: admin.session,
    });

    return apiSuccess({ vendor });
  } catch (error) {
    return handleAdminServiceError(error, "Unable to update vendor.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: AdminVendorRouteContext,
) {
  const admin = await requireAdminPermission(_request, "vendor:delete");

  if (!admin.success) {
    return admin.response;
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  try {
    const vendor = await softDeleteVendor(routeParams.data, {
      session: admin.session,
    });

    return apiSuccess({ vendor });
  } catch (error) {
    return handleAdminServiceError(error, "Unable to delete vendor.");
  }
}

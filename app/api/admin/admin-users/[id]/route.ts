import { apiSuccess } from "../../../../../lib/api/responses.ts";
import {
  validateInput,
  validateJsonBody,
} from "../../../../../lib/api/validation.ts";
import {
  requireAdminPermission,
} from "../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../lib/admin/errors.ts";
import {
  deleteAdminUser,
  updateAdminUserRole,
} from "../../../../../lib/admin/admin-user-service.ts";
import {
  updateAdminUserRequestSchema,
  vendorIdParamsSchema,
} from "../../../../../lib/validation/index.ts";

type AdminUserRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: AdminUserRouteContext) {
  const admin = await requireAdminPermission(request, "admin_users:manage");

  if (!admin.success) {
    return admin.response;
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  const body = await validateJsonBody(request, updateAdminUserRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    const adminUser = await updateAdminUserRole(
      {
        adminUserId: routeParams.data.id,
        role: body.data.role,
        full_name: body.data.full_name,
      },
      { session: admin.session },
    );
    return apiSuccess({ adminUser });
  } catch (error) {
    return handleAdminServiceError(error, "Unable to update the admin role.");
  }
}

export async function DELETE(request: Request, { params }: AdminUserRouteContext) {
  const admin = await requireAdminPermission(request, "admin_users:manage");

  if (!admin.success) {
    return admin.response;
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  try {
    const result = await deleteAdminUser(
      {
        adminUserId: routeParams.data.id,
      },
      { session: admin.session },
    );
    return apiSuccess(result);
  } catch (error) {
    return handleAdminServiceError(error, "Unable to delete the admin account.");
  }
}

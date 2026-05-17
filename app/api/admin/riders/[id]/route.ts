import { apiSuccess } from "../../../../../lib/api/responses.ts";
import {
  validateInput,
  validateJsonBody,
} from "../../../../../lib/api/validation.ts";
import { requireAdminPermission } from "../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../lib/admin/errors.ts";
import {
  getAdminRider,
  updateAdminRider,
} from "../../../../../lib/admin/rider-service.ts";
import {
  updateAdminRiderRequestSchema,
  vendorIdParamsSchema,
} from "../../../../../lib/validation/index.ts";

type AdminRiderRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: AdminRiderRouteContext) {
  const admin = await requireAdminPermission(request, "riders:manage");

  if (!admin.success) {
    return admin.response;
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  try {
    const rider = await getAdminRider(routeParams.data.id, { session: admin.session });
    return apiSuccess({ rider });
  } catch (error) {
    return handleAdminServiceError(error, "Unable to load rider.");
  }
}

export async function PATCH(request: Request, { params }: AdminRiderRouteContext) {
  const admin = await requireAdminPermission(request, "riders:manage");

  if (!admin.success) {
    return admin.response;
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  const body = await validateJsonBody(request, updateAdminRiderRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    const rider = await updateAdminRider(routeParams.data.id, body.data, {
      session: admin.session,
    });
    return apiSuccess({ rider });
  } catch (error) {
    return handleAdminServiceError(error, "Unable to update rider.");
  }
}

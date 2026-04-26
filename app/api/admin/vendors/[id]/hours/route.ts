import { apiSuccess } from "../../../../../../lib/api/responses.ts";
import {
  validateInput,
  validateJsonBody,
} from "../../../../../../lib/api/validation.ts";
import { requireAdmin } from "../../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../../lib/admin/errors.ts";
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
  const admin = await requireAdmin(request);

  if (!admin.success) {
    return admin.response;
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  try {
    const hours = await listVendorHours(routeParams.data, {
      session: admin.session,
    });

    return apiSuccess({ hours });
  } catch (error) {
    return handleAdminServiceError(error, "Unable to load vendor hours.");
  }
}

export async function POST(_request: Request, { params }: VendorHoursRouteContext) {
  const admin = await requireAdmin(_request);

  if (!admin.success) {
    return admin.response;
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  const body = await validateJsonBody(_request, replaceVendorHoursRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    const hours = await replaceVendorHours(routeParams.data, body.data, {
      session: admin.session,
    });

    return apiSuccess({ hours });
  } catch (error) {
    return handleAdminServiceError(error, "Unable to replace vendor hours.");
  }
}

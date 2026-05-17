import type { NextRequest } from "next/server";
import { apiSuccess } from "../../../../lib/api/responses.ts";
import {
  validateSearchParams,
} from "../../../../lib/api/validation.ts";
import { requireAdminPermission } from "../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../lib/admin/errors.ts";
import {
  listAdminRiders,
} from "../../../../lib/admin/rider-service.ts";
import { adminRidersQuerySchema } from "../../../../lib/validation/index.ts";

export async function GET(request: NextRequest) {
  const admin = await requireAdminPermission(request, "riders:manage");

  if (!admin.success) {
    return admin.response;
  }

  const query = validateSearchParams(
    adminRidersQuerySchema,
    request.nextUrl.searchParams,
  );

  if (!query.success) {
    return query.response;
  }

  try {
    const result = await listAdminRiders(query.data, { session: admin.session });
    return apiSuccess(result);
  } catch (error) {
    return handleAdminServiceError(error, "Unable to list riders.");
  }
}

import type { NextRequest } from "next/server";
import { apiSuccess } from "../../../../lib/api/responses.ts";
import {
  validateJsonBody,
  validateSearchParams,
} from "../../../../lib/api/validation.ts";
import { requireAdminPermission } from "../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../lib/admin/errors.ts";
import {
  createAdminRider,
  listAdminRiders,
} from "../../../../lib/admin/rider-service.ts";
import {
  adminRidersQuerySchema,
  createAdminRiderRequestSchema,
} from "../../../../lib/validation/index.ts";

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

export async function POST(request: Request) {
  const admin = await requireAdminPermission(request, "riders:manage");

  if (!admin.success) {
    return admin.response;
  }

  const body = await validateJsonBody(request, createAdminRiderRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    const rider = await createAdminRider(body.data, { session: admin.session });
    return apiSuccess({ rider }, 201);
  } catch (error) {
    return handleAdminServiceError(error, "Unable to create rider.");
  }
}

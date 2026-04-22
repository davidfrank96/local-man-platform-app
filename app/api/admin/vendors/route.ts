import type { NextRequest } from "next/server";
import { apiSuccess } from "../../../../lib/api/responses.ts";
import {
  validateJsonBody,
  validateSearchParams,
} from "../../../../lib/api/validation.ts";
import { requireAdmin } from "../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../lib/admin/errors.ts";
import {
  createVendor,
  listVendors,
} from "../../../../lib/admin/vendor-service.ts";
import {
  adminVendorsQuerySchema,
  createVendorRequestSchema,
} from "../../../../lib/validation/index.ts";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin.success) {
    return admin.response;
  }

  const query = validateSearchParams(
    adminVendorsQuerySchema,
    request.nextUrl.searchParams,
  );

  if (!query.success) {
    return query.response;
  }

  try {
    const result = await listVendors(query.data, { session: admin.session });

    return apiSuccess(result);
  } catch (error) {
    return handleAdminServiceError(error, "Unable to list vendors.");
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);

  if (!admin.success) {
    return admin.response;
  }

  const body = await validateJsonBody(request, createVendorRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    const vendor = await createVendor(body.data, { session: admin.session });

    return apiSuccess({ vendor }, 201);
  } catch (error) {
    return handleAdminServiceError(error, "Unable to create vendor.");
  }
}

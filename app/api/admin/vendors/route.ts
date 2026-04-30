import type { NextRequest } from "next/server";
import { apiSuccess } from "../../../../lib/api/responses.ts";
import {
  validateJsonBody,
  validateSearchParams,
} from "../../../../lib/api/validation.ts";
import { requireAdmin } from "../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../lib/admin/errors.ts";
import {
  attachVendorCategory,
  createVendor,
  hardDeleteVendor,
  listVendors,
  listVendorCategories,
} from "../../../../lib/admin/vendor-service.ts";
import {
  adminVendorsQuerySchema,
  createManagedVendorRequestSchema,
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

  const body = await validateJsonBody(request, createManagedVendorRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    const { category_slug, ...vendorData } = body.data;
    const categories = await listVendorCategories({ session: admin.session });
    const category = categories.find((entry) => entry.slug === category_slug);

    if (!category) {
      return Response.json(
        {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request.",
            details: {
              issues: [
                {
                  path: ["category_slug"],
                  message: "Select a valid vendor category.",
                },
              ],
            },
          },
        },
        { status: 400 },
      );
    }

    const vendor = await createVendor(vendorData, { session: admin.session });

    try {
      await attachVendorCategory({ id: vendor.id }, category.id, { session: admin.session });
    } catch (error) {
      await hardDeleteVendor({ id: vendor.id }, { session: admin.session }).catch(() => undefined);
      throw error;
    }

    return apiSuccess({ vendor }, 201);
  } catch (error) {
    return handleAdminServiceError(error, "Unable to create vendor.");
  }
}

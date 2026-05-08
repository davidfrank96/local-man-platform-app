import type { NextRequest } from "next/server";
import { apiSuccess } from "../../../../lib/api/responses.ts";
import {
  validateJsonBody,
  validateSearchParams,
} from "../../../../lib/api/validation.ts";
import { requireAdmin } from "../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../lib/admin/errors.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../lib/observability.ts";
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
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/vendors",
    area: "admin",
  });
  const admin = await requireAdmin(request);

  if (!admin.success) {
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const query = validateSearchParams(
    adminVendorsQuerySchema,
    request.nextUrl.searchParams,
  );

  if (!query.success) {
    return attachRequestIdHeader(query.response, admin.session.requestId);
  }

  try {
    const result = await listVendors(query.data, { session: admin.session });

    return attachRequestIdHeader(apiSuccess(result), admin.session.requestId);
  } catch (error) {
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Unable to list vendors."),
      admin.session.requestId,
    );
  }
}

export async function POST(request: Request) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/vendors",
    area: "admin",
  });
  const admin = await requireAdmin(request);

  if (!admin.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_CREATE_DENIED",
      message: "Unauthorized vendor creation attempt was blocked.",
      status: admin.response.status,
    });
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const body = await validateJsonBody(request, createManagedVendorRequestSchema);

  if (!body.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_CREATE_REJECTED",
      message: "Vendor creation request validation failed.",
      status: body.response.status,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
    });
    return attachRequestIdHeader(body.response, admin.session.requestId);
  }

  try {
    const { category_slug, ...vendorData } = body.data;
    const categories = await listVendorCategories({ session: admin.session });
    const category = categories.find((entry) => entry.slug === category_slug);

    if (!category) {
      logRouteEvent("warn", routeLog, {
        event: "ADMIN_VENDOR_CREATE_REJECTED",
        message: "Vendor creation request used an invalid category slug.",
        status: 400,
        adminUserId: admin.session.adminUser.id,
        userRole: admin.session.adminUser.role,
        metadata: {
          categorySlug: category_slug,
        },
      });
      return attachRequestIdHeader(Response.json(
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
      ), admin.session.requestId);
    }

    const vendor = await createVendor(vendorData, { session: admin.session });

    try {
      await attachVendorCategory({ id: vendor.id }, category.id, { session: admin.session });
    } catch (error) {
      await hardDeleteVendor({ id: vendor.id }, { session: admin.session }).catch(() => undefined);
      throw error;
    }

    logRouteEvent("info", routeLog, {
      event: "ADMIN_VENDOR_CREATED",
      message: "Vendor created successfully.",
      status: 201,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: vendor.id,
      vendorSlug: vendor.slug,
      metadata: {
        categorySlug: category.slug,
        isActive: vendor.is_active,
      },
    });
    return attachRequestIdHeader(apiSuccess({ vendor }, 201), admin.session.requestId);
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_VENDOR_CREATE_FAILED",
      message: "Vendor creation failed.",
      status: 502,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      error,
    });
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Unable to create vendor."),
      admin.session.requestId,
    );
  }
}

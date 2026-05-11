import { apiError, apiSuccess } from "../../../../../../lib/api/responses.ts";
import {
  validateInput,
  validateJsonBody,
} from "../../../../../../lib/api/validation.ts";
import { requireAdmin } from "../../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../../lib/admin/errors.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logStructuredEvent,
  logRouteEvent,
} from "../../../../../../lib/observability.ts";
import {
  createVendorImages,
  listVendorImages,
  uploadVendorImage,
} from "../../../../../../lib/admin/vendor-service.ts";
import { validateVendorImageFile } from "../../../../../../lib/admin/storage.ts";
import {
  vendorIdParamsSchema,
  vendorImageMetadataRequestSchema,
} from "../../../../../../lib/validation/index.ts";

type VendorImagesRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = "nodejs";

export async function GET(request: Request, { params }: VendorImagesRouteContext) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/vendors/[id]/images",
    area: "storage",
  });
  const admin = await requireAdmin(request);

  if (!admin.success) {
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return attachRequestIdHeader(routeParams.response, admin.session.requestId);
  }

  try {
    const images = await listVendorImages(routeParams.data, {
      session: admin.session,
    });

    return attachRequestIdHeader(apiSuccess({ images }), admin.session.requestId);
  } catch (error) {
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Unable to load vendor images."),
      admin.session.requestId,
    );
  }
}

export async function POST(request: Request, { params }: VendorImagesRouteContext) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/admin/vendors/[id]/images",
    area: "storage",
  });
  const admin = await requireAdmin(request);

  if (!admin.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_IMAGE_CREATE_DENIED",
      message: "Unauthorized vendor image mutation attempt was blocked.",
      status: admin.response.status,
    });
    return attachRequestIdHeader(admin.response, routeLog.requestId);
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    logRouteEvent("warn", routeLog, {
      event: "ADMIN_VENDOR_IMAGE_CREATE_REJECTED",
      message: "Vendor image mutation used invalid route parameters.",
      status: routeParams.response.status,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
    });
    return attachRequestIdHeader(routeParams.response, admin.session.requestId);
  }

  try {
    const requestId = admin.session.requestId;
    const route = `/api/admin/vendors/${routeParams.data.id}/images`;
    const method = "POST";
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const fileEntry = formData.get("image");

      if (!(fileEntry instanceof File)) {
        logRouteEvent("warn", routeLog, {
          event: "ADMIN_VENDOR_IMAGE_UPLOAD_REJECTED",
          status: 400,
          adminUserId: admin.session.adminUser.id,
          userRole: admin.session.adminUser.role,
          vendorId: routeParams.data.id,
          metadata: {
            reason: "missing_file",
            hasImageField: formData.has("image"),
          },
        });
        return attachRequestIdHeader(
          apiError("VALIDATION_ERROR", "An image file is required.", 400),
          requestId,
        );
      }

      const file = fileEntry;

      const fileValidationError = validateVendorImageFile(file);

      if (fileValidationError) {
        logRouteEvent("warn", routeLog, {
          event: "ADMIN_VENDOR_IMAGE_UPLOAD_REJECTED",
          status: 400,
          adminUserId: admin.session.adminUser.id,
          userRole: admin.session.adminUser.role,
          vendorId: routeParams.data.id,
          errorMessage: fileValidationError,
          metadata: {
            reason: "validation_failed",
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          },
        });
        return attachRequestIdHeader(
          apiError("VALIDATION_ERROR", fileValidationError, 400),
          requestId,
        );
      }

      const sortOrderValue = Number(String(formData.get("sort_order") ?? "0"));

      if (!Number.isInteger(sortOrderValue) || sortOrderValue < 0) {
        logRouteEvent("warn", routeLog, {
          event: "ADMIN_VENDOR_IMAGE_UPLOAD_REJECTED",
          message: "Vendor image upload used an invalid sort order.",
          status: 400,
          adminUserId: admin.session.adminUser.id,
          userRole: admin.session.adminUser.role,
          vendorId: routeParams.data.id,
          metadata: {
            reason: "invalid_sort_order",
            sortOrder: sortOrderValue,
          },
        });
        return attachRequestIdHeader(
          apiError(
            "VALIDATION_ERROR",
            "Sort order must be a non-negative integer.",
            400,
          ),
          requestId,
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);

      if (fileBytes.byteLength <= 0) {
        logRouteEvent("warn", routeLog, {
          event: "ADMIN_VENDOR_IMAGE_UPLOAD_REJECTED",
          message: "Vendor image upload used an empty file.",
          status: 400,
          adminUserId: admin.session.adminUser.id,
          userRole: admin.session.adminUser.role,
          vendorId: routeParams.data.id,
          metadata: {
            reason: "empty_file",
            fileName: file.name,
          },
        });
        return attachRequestIdHeader(
          apiError("VALIDATION_ERROR", "Image file is empty.", 400),
          requestId,
        );
      }

      logStructuredEvent("info", {
        event: "ADMIN_VENDOR_IMAGE_UPLOAD_ACCEPTED",
        area: "storage",
        route,
        method,
        requestId,
        adminUserId: admin.session.adminUser.id,
        userRole: admin.session.adminUser.role,
        vendorId: routeParams.data.id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        sortOrder: sortOrderValue,
        hasBytes: fileBytes.byteLength > 0,
      });

      const images = await uploadVendorImage(
        routeParams.data,
        {
          file,
          fileBytes,
          sort_order: sortOrderValue,
        },
        {
          session: admin.session,
        },
      );

      logRouteEvent("info", routeLog, {
        event: "ADMIN_VENDOR_IMAGE_UPLOADED",
        message: "Vendor image uploaded successfully.",
        status: 201,
        adminUserId: admin.session.adminUser.id,
        userRole: admin.session.adminUser.role,
        vendorId: routeParams.data.id,
        metadata: {
          imageCount: images.length,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          sortOrder: sortOrderValue,
        },
      });
      return attachRequestIdHeader(apiSuccess({ images }, 201), requestId);
    }

    const body = await validateJsonBody(request, vendorImageMetadataRequestSchema);

    if (!body.success) {
      logRouteEvent("warn", routeLog, {
        event: "ADMIN_VENDOR_IMAGE_CREATE_REJECTED",
        message: "Vendor image metadata request validation failed.",
        status: body.response.status,
        adminUserId: admin.session.adminUser.id,
        userRole: admin.session.adminUser.role,
        vendorId: routeParams.data.id,
      });
      return attachRequestIdHeader(body.response, admin.session.requestId);
    }

    const images = await createVendorImages(routeParams.data, body.data, {
      session: admin.session,
    });

    logRouteEvent("info", routeLog, {
      event: "ADMIN_VENDOR_IMAGE_METADATA_CREATED",
      message: "Vendor image metadata created successfully.",
      status: 201,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.data.id,
      metadata: {
        imageCount: images.length,
      },
    });
    return attachRequestIdHeader(apiSuccess({ images }, 201), admin.session.requestId);
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "ADMIN_VENDOR_IMAGE_CREATE_FAILED",
      status: 502,
      adminUserId: admin.session.adminUser.id,
      userRole: admin.session.adminUser.role,
      vendorId: routeParams.success ? routeParams.data.id : null,
      error,
      metadata: {
        details:
          typeof error === "object" &&
          error !== null &&
          "details" in error
            ? (error as { details?: unknown }).details
            : undefined,
      },
    });
    return attachRequestIdHeader(
      handleAdminServiceError(error, "Unable to create vendor images."),
      admin.session.requestId,
    );
  }
}

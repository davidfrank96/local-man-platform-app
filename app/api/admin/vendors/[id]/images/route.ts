import { apiError, apiSuccess } from "../../../../../../lib/api/responses.ts";
import {
  validateInput,
  validateJsonBody,
} from "../../../../../../lib/api/validation.ts";
import { requireAdmin } from "../../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../../lib/admin/errors.ts";
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

export async function GET(request: Request, { params }: VendorImagesRouteContext) {
  const admin = await requireAdmin(request);

  if (!admin.success) {
    return admin.response;
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  try {
    const images = await listVendorImages(routeParams.data, {
      session: admin.session,
    });

    return apiSuccess({ images });
  } catch (error) {
    return handleAdminServiceError(error, "Unable to load vendor images.");
  }
}

export async function POST(request: Request, { params }: VendorImagesRouteContext) {
  const admin = await requireAdmin(request);

  if (!admin.success) {
    return admin.response;
  }

  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const fileEntry = formData.get("image");

      if (!(fileEntry instanceof File)) {
        console.error("[admin][vendor-image] multipart upload request missing file", {
          vendorId: routeParams.data.id,
          hasImageField: formData.has("image"),
        });
        return apiError("VALIDATION_ERROR", "An image file is required.", 400);
      }

      const file = fileEntry;

      const fileValidationError = validateVendorImageFile(file);

      if (fileValidationError) {
        console.error("[admin][vendor-image] multipart upload request rejected", {
          vendorId: routeParams.data.id,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          error: fileValidationError,
        });
        return apiError("VALIDATION_ERROR", fileValidationError, 400);
      }

      const sortOrderValue = Number(String(formData.get("sort_order") ?? "0"));

      if (!Number.isInteger(sortOrderValue) || sortOrderValue < 0) {
        return apiError(
          "VALIDATION_ERROR",
          "Sort order must be a non-negative integer.",
          400,
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);

      if (fileBytes.byteLength <= 0) {
        return apiError("VALIDATION_ERROR", "Image file is empty.", 400);
      }

      console.info("[admin][vendor-image] multipart upload request accepted", {
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

      return apiSuccess({ images }, 201);
    }

    const body = await validateJsonBody(request, vendorImageMetadataRequestSchema);

    if (!body.success) {
      return body.response;
    }

    const images = await createVendorImages(routeParams.data, body.data, {
      session: admin.session,
    });

    return apiSuccess({ images }, 201);
  } catch (error) {
      console.error("[admin][vendor-image] upload route failed", {
      vendorId: routeParams.success ? routeParams.data.id : null,
      error: error instanceof Error ? error.message : "Unknown image upload error.",
      details:
        typeof error === "object" &&
        error !== null &&
        "details" in error
          ? (error as { details?: unknown }).details
          : undefined,
    });
    return handleAdminServiceError(error, "Unable to create vendor images.");
  }
}

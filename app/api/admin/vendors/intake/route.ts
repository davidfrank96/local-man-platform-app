import { apiSuccess } from "../../../../../lib/api/responses.ts";
import { validateJsonBody } from "../../../../../lib/api/validation.ts";
import { requireAdmin } from "../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../lib/admin/errors.ts";
import {
  previewVendorIntake,
  uploadVendorIntake,
} from "../../../../../lib/admin/vendor-intake-service.ts";
import { vendorIntakeRequestSchema } from "../../../../../lib/validation/index.ts";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);

  if (!admin.success) {
    return admin.response;
  }

  const body = await validateJsonBody(request, vendorIntakeRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    const result = body.data.action === "preview"
      ? await previewVendorIntake(body.data.rows, { session: admin.session })
      : await uploadVendorIntake(body.data.rows, { session: admin.session });

    return apiSuccess(result);
  } catch (error) {
    return handleAdminServiceError(error, "Unable to process vendor intake.");
  }
}

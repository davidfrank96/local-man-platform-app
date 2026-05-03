import { apiSuccess } from "../../../../../lib/api/responses.ts";
import { requireAdminPermission } from "../../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../../lib/admin/errors.ts";
import { cleanupQaTestVendors } from "../../../../../lib/admin/vendor-service.ts";

export async function DELETE(request: Request) {
  const admin = await requireAdminPermission(request, "vendor:delete");

  if (!admin.success) {
    return admin.response;
  }

  try {
    const result = await cleanupQaTestVendors({ session: admin.session });

    return apiSuccess(result);
  } catch (error) {
    return handleAdminServiceError(error, "Unable to cleanup QA test vendors.");
  }
}

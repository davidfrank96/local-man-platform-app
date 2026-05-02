import { apiSuccess } from "../../../../lib/api/responses.ts";
import { validateJsonBody } from "../../../../lib/api/validation.ts";
import { requireAdminPermission } from "../../../../lib/admin/auth.ts";
import { handleAdminServiceError } from "../../../../lib/admin/errors.ts";
import { createAdminUser } from "../../../../lib/admin/admin-user-service.ts";
import { createAdminUserRequestSchema } from "../../../../lib/validation/index.ts";

export async function POST(request: Request) {
  const admin = await requireAdminPermission(request, "admin_users:manage");

  if (!admin.success) {
    return admin.response;
  }

  const body = await validateJsonBody(request, createAdminUserRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    const result = await createAdminUser(body.data, { session: admin.session });
    return apiSuccess(
      {
        adminUser: result.adminUser,
        outcome: result.outcome,
      },
      result.outcome === "created" ? 201 : 200,
    );
  } catch (error) {
    return handleAdminServiceError(error, "Unable to create the admin account.");
  }
}

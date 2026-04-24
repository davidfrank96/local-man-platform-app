import { apiSuccess } from "../../../../lib/api/responses.ts";
import { requireAdmin } from "../../../../lib/admin/auth.ts";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);

  if (!admin.success) {
    return admin.response;
  }

  return apiSuccess({
    user: admin.session.user,
    adminUser: admin.session.adminUser,
  });
}

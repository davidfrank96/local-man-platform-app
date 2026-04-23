import { apiError, apiSuccess } from "../../../../lib/api/responses.ts";
import { validateInput } from "../../../../lib/api/validation.ts";
import {
  fetchVendorDetailBySlugFromSupabase,
  getSupabaseRestConfig,
} from "../../../../lib/vendors/supabase.ts";
import { vendorSlugParamsSchema } from "../../../../lib/validation/index.ts";

type VendorRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: VendorRouteContext) {
  const routeParams = validateInput(vendorSlugParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  const config = getSupabaseRestConfig();

  if (!config) {
    return apiError(
      "CONFIGURATION_ERROR",
      "Supabase public environment variables are required for vendor detail.",
      503,
    );
  }

  try {
    const vendor = await fetchVendorDetailBySlugFromSupabase(
      routeParams.data.slug,
      config,
    );

    if (!vendor) {
      return apiError("NOT_FOUND", "Vendor was not found.", 404);
    }

    return apiSuccess({ vendor });
  } catch (error) {
    return apiError(
      "UPSTREAM_ERROR",
      "Unable to fetch vendor detail.",
      502,
      error instanceof Error ? { message: error.message } : undefined,
    );
  }
}

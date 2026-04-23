import { apiError, apiSuccess } from "../../../lib/api/responses.ts";
import {
  fetchPublicCategoriesFromSupabase,
  getSupabaseRestConfig,
} from "../../../lib/vendors/supabase.ts";

export async function GET() {
  const config = getSupabaseRestConfig();

  if (!config) {
    return apiError(
      "CONFIGURATION_ERROR",
      "Supabase public environment variables are required for categories.",
      503,
    );
  }

  try {
    const categories = await fetchPublicCategoriesFromSupabase(config);

    return apiSuccess({
      categories: categories.map(({ id, name, slug }) => ({
        id,
        name,
        slug,
      })),
    });
  } catch (error) {
    return apiError(
      "UPSTREAM_ERROR",
      "Unable to fetch categories.",
      502,
      error instanceof Error ? { message: error.message } : undefined,
    );
  }
}

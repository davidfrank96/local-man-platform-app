import { apiError, apiSuccess } from "../../../lib/api/responses.ts";
import {
  applyRateLimitResponseHeaders,
  consumeRateLimit,
  PUBLIC_CATEGORIES_RATE_LIMIT,
} from "../../../lib/api/abuse-protection.ts";
import {
  fetchPublicCategoriesFromSupabase,
  getSupabaseRestConfig,
} from "../../../lib/vendors/supabase.ts";
import { logStructuredEvent } from "../../../lib/observability.ts";

export async function GET(request: Request = new Request("http://localhost/api/categories")) {
  const rateLimit = consumeRateLimit(request, {
    policy: PUBLIC_CATEGORIES_RATE_LIMIT,
    scope: "categories",
    useClientCookie: false,
  });

  if (!rateLimit.allowed) {
    return applyRateLimitResponseHeaders(
      apiError(
        "TOO_MANY_REQUESTS",
        "Too many category requests. Please wait before trying again.",
        429,
        {
          retry_after_seconds: rateLimit.retryAfterSeconds,
        },
      ),
      rateLimit,
    );
  }

  const config = getSupabaseRestConfig();

  if (!config) {
    return applyRateLimitResponseHeaders(
      apiError(
        "CONFIGURATION_ERROR",
        "Categories are unavailable.",
        503,
      ),
      rateLimit,
    );
  }

  try {
    const categories = await fetchPublicCategoriesFromSupabase(config);

    return applyRateLimitResponseHeaders(
      apiSuccess({
        categories: categories.map(({ id, name, slug }) => ({
          id,
          name,
          slug,
        })),
      }),
      rateLimit,
    );
  } catch (error) {
    logStructuredEvent("error", {
      type: "PUBLIC_CATEGORIES_FAILED",
      area: "public_discovery",
      route: "/api/categories",
      message: "Public categories route failed.",
      error,
    });
    return applyRateLimitResponseHeaders(
      apiError(
        "UPSTREAM_ERROR",
        "Unable to fetch categories.",
        502,
      ),
      rateLimit,
    );
  }
}

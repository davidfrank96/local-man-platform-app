import { apiError, apiSuccess } from "../../../../lib/api/responses.ts";
import {
  applyRateLimitResponseHeaders,
  consumeRateLimit,
  PUBLIC_VENDOR_DETAIL_RATE_LIMIT,
} from "../../../../lib/api/abuse-protection.ts";
import { validateInput } from "../../../../lib/api/validation.ts";
import {
  fetchVendorDetailBySlugFromSupabase,
  getSupabaseRestConfig,
} from "../../../../lib/vendors/supabase.ts";
import { vendorSlugParamsSchema } from "../../../../lib/validation/index.ts";
import { logStructuredEvent } from "../../../../lib/observability.ts";

type VendorRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: VendorRouteContext) {
  const rateLimit = consumeRateLimit(_request, {
    policy: PUBLIC_VENDOR_DETAIL_RATE_LIMIT,
    scope: "vendor-detail",
    useClientCookie: false,
  });

  if (!rateLimit.allowed) {
    return applyRateLimitResponseHeaders(
      apiError(
        "TOO_MANY_REQUESTS",
        "Too many vendor detail requests. Please wait before trying again.",
        429,
        {
          retry_after_seconds: rateLimit.retryAfterSeconds,
        },
      ),
      rateLimit,
    );
  }

  const routeParams = validateInput(vendorSlugParamsSchema, await params);

  if (!routeParams.success) {
    return applyRateLimitResponseHeaders(routeParams.response, rateLimit);
  }

  const config = getSupabaseRestConfig();

  if (!config) {
    return applyRateLimitResponseHeaders(
      apiError(
        "CONFIGURATION_ERROR",
        "Vendor detail is unavailable.",
        503,
      ),
      rateLimit,
    );
  }

  try {
    const vendor = await fetchVendorDetailBySlugFromSupabase(
      routeParams.data.slug,
      config,
    );

    if (!vendor) {
      return applyRateLimitResponseHeaders(
        apiError("NOT_FOUND", "Vendor was not found.", 404),
        rateLimit,
      );
    }

    return applyRateLimitResponseHeaders(apiSuccess({ vendor }), rateLimit);
  } catch (error) {
    logStructuredEvent("error", {
      type: "PUBLIC_VENDOR_DETAIL_FAILED",
      area: "public_discovery",
      route: "/api/vendors/[slug]",
      message: "Public vendor detail route failed.",
      vendorSlug: routeParams.data.slug,
      error,
    });
    return applyRateLimitResponseHeaders(
      apiError(
        "UPSTREAM_ERROR",
        "Unable to fetch vendor detail.",
        502,
      ),
      rateLimit,
    );
  }
}

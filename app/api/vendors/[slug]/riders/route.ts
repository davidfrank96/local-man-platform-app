import { apiError, apiSuccess } from "../../../../../lib/api/responses.ts";
import {
  applyRateLimitResponseHeaders,
  consumeRateLimit,
  PUBLIC_RIDER_SUGGESTIONS_RATE_LIMIT,
} from "../../../../../lib/api/abuse-protection.ts";
import { validateInput } from "../../../../../lib/api/validation.ts";
import {
  RiderConnectServiceError,
  getPublicRiderSuggestionsForVendor,
} from "../../../../../lib/public/rider-connect.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../../lib/observability.ts";
import { vendorSlugParamsSchema } from "../../../../../lib/validation/index.ts";

type VendorRidersRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: Request, { params }: VendorRidersRouteContext) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/vendors/[slug]/riders",
    area: "rider_connect",
  });
  const routeParams = validateInput(vendorSlugParamsSchema, await params);

  if (!routeParams.success) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_RIDER_SUGGESTIONS_REQUEST_INVALID",
      status: routeParams.response.status,
      message: "Rider suggestion route params failed validation.",
    });
    return attachRequestIdHeader(routeParams.response, routeLog.requestId);
  }

  const rateLimit = consumeRateLimit(request, {
    policy: PUBLIC_RIDER_SUGGESTIONS_RATE_LIMIT,
    scope: `suggestions:${routeParams.data.slug}`,
  });

  if (!rateLimit.allowed) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_RIDER_SUGGESTIONS_RATE_LIMITED",
      status: 429,
      message: "Rider suggestion request was rate limited.",
      vendorSlug: routeParams.data.slug,
      metadata: {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(
          "TOO_MANY_REQUESTS",
          "Too many rider suggestion requests. Please wait before trying again.",
          429,
          {
            retry_after_seconds: rateLimit.retryAfterSeconds,
          },
          "Rider suggestions are temporarily rate limited to protect Localman.",
        ),
        rateLimit,
      ),
      routeLog.requestId,
    );
  }

  try {
    const data = await getPublicRiderSuggestionsForVendor(routeParams.data.slug);

    logRouteEvent("info", routeLog, {
      event: "PUBLIC_RIDER_SUGGESTIONS_LOADED",
      status: 200,
      message: "Public rider suggestions loaded.",
      vendorSlug: routeParams.data.slug,
      metadata: {
        riderCount: data.riders.length,
      },
    });

    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(apiSuccess(data), rateLimit),
      routeLog.requestId,
    );
  } catch (error) {
    const status = error instanceof RiderConnectServiceError ? error.status : 502;
    const code = error instanceof RiderConnectServiceError
      ? error.code
      : "UPSTREAM_ERROR";
    const message = status === 404
      ? "Vendor was not found."
      : "Unable to load rider suggestions.";

    logRouteEvent(status === 404 ? "info" : "error", routeLog, {
      event: status === 404
        ? "PUBLIC_RIDER_SUGGESTIONS_NOT_FOUND"
        : "PUBLIC_RIDER_SUGGESTIONS_FAILED",
      status,
      message,
      vendorSlug: routeParams.data.slug,
      error,
    });

    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(apiError(code, message, status), rateLimit),
      routeLog.requestId,
    );
  }
}

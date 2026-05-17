import { apiError, apiSuccess } from "../../../../../lib/api/responses.ts";
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

    return attachRequestIdHeader(apiSuccess(data), routeLog.requestId);
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
      apiError(code, message, status),
      routeLog.requestId,
    );
  }
}

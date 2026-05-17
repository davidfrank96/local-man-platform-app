import { apiError, apiSuccess } from "../../../../../../lib/api/responses.ts";
import {
  applyRateLimitResponseHeaders,
  consumeRateLimit,
  PUBLIC_RIDER_UNAVAILABLE_REPORT_RATE_LIMIT,
  PUBLIC_RIDER_UNAVAILABLE_REPORT_RIDER_RATE_LIMIT,
  type RateLimitDecision,
} from "../../../../../../lib/api/abuse-protection.ts";
import {
  validateInput,
  validateJsonBody,
} from "../../../../../../lib/api/validation.ts";
import {
  RiderConnectServiceError,
  createRiderUnavailableReport,
} from "../../../../../../lib/public/rider-connect.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../../../lib/observability.ts";
import {
  riderUnavailableReportRequestSchema,
  vendorSlugParamsSchema,
} from "../../../../../../lib/validation/index.ts";

type VendorRiderReportRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

function rateLimitedReportResponse(
  rateLimit: RateLimitDecision,
  requestId: string,
): Response {
  return attachRequestIdHeader(
    applyRateLimitResponseHeaders(
      apiError(
        "TOO_MANY_REQUESTS",
        "Too many rider availability reports. Please wait before trying again.",
        429,
        {
          retry_after_seconds: rateLimit.retryAfterSeconds,
        },
        "Rider availability reports are temporarily rate limited to protect Localman.",
      ),
      rateLimit,
    ),
    requestId,
  );
}

export async function POST(
  request: Request,
  { params }: VendorRiderReportRouteContext,
) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/vendors/[slug]/riders/report-unavailable",
    area: "rider_connect",
  });
  const routeParams = validateInput(vendorSlugParamsSchema, await params);

  if (!routeParams.success) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_RIDER_REPORT_REQUEST_INVALID",
      status: routeParams.response.status,
      message: "Rider unavailable report route params failed validation.",
    });
    return attachRequestIdHeader(routeParams.response, routeLog.requestId);
  }

  const body = await validateJsonBody(request, riderUnavailableReportRequestSchema);

  if (!body.success) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_RIDER_REPORT_REJECTED",
      status: body.response.status,
      message: "Rider unavailable report payload failed validation.",
      vendorSlug: routeParams.data.slug,
    });
    return attachRequestIdHeader(body.response, routeLog.requestId);
  }

  const reportRateLimit = consumeRateLimit(request, {
    policy: PUBLIC_RIDER_UNAVAILABLE_REPORT_RATE_LIMIT,
    scope: "unavailable-report",
  });

  if (!reportRateLimit.allowed) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_RIDER_REPORT_RATE_LIMITED",
      status: 429,
      message: "Rider unavailable report was rate limited.",
      vendorSlug: routeParams.data.slug,
      metadata: {
        retryAfterSeconds: reportRateLimit.retryAfterSeconds,
      },
    });
    return rateLimitedReportResponse(reportRateLimit, routeLog.requestId);
  }

  const riderReportRateLimit = consumeRateLimit(request, {
    policy: PUBLIC_RIDER_UNAVAILABLE_REPORT_RIDER_RATE_LIMIT,
    scope: `unavailable-report:rider:${body.data.riderId}`,
  });

  if (!riderReportRateLimit.allowed) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_RIDER_REPORT_RIDER_RATE_LIMITED",
      status: 429,
      message: "Repeated rider unavailable report was rate limited.",
      vendorSlug: routeParams.data.slug,
      metadata: {
        riderId: body.data.riderId,
        retryAfterSeconds: riderReportRateLimit.retryAfterSeconds,
      },
    });
    return rateLimitedReportResponse(riderReportRateLimit, routeLog.requestId);
  }

  try {
    const data = await createRiderUnavailableReport(routeParams.data.slug, body.data);

    logRouteEvent("info", routeLog, {
      event: "PUBLIC_RIDER_REPORT_RECEIVED",
      status: 201,
      message: "Rider unavailable report was stored.",
      vendorSlug: routeParams.data.slug,
      metadata: {
        riderId: body.data.riderId,
        reason: body.data.reason,
      },
    });

    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(apiSuccess(data, 201), reportRateLimit),
      routeLog.requestId,
    );
  } catch (error) {
    const status = error instanceof RiderConnectServiceError ? error.status : 502;
    const code = error instanceof RiderConnectServiceError
      ? error.code
      : "UPSTREAM_ERROR";
    const message = status === 404
      ? "Vendor or rider was not found."
      : "Unable to submit rider availability report.";

    logRouteEvent(status === 404 ? "info" : "error", routeLog, {
      event: status === 404
        ? "PUBLIC_RIDER_REPORT_NOT_FOUND"
        : "PUBLIC_RIDER_REPORT_FAILED",
      status,
      message,
      vendorSlug: routeParams.data.slug,
      metadata: {
        riderId: body.data.riderId,
        reason: body.data.reason,
      },
      error,
    });

    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(code, message, status),
        reportRateLimit,
      ),
      routeLog.requestId,
    );
  }
}

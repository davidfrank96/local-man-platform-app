import { apiError, apiSuccess } from "../../../../../../lib/api/responses.ts";
import {
  applyRateLimitResponseHeaders,
  consumeRateLimit,
  PUBLIC_RIDER_CONTACT_RATE_LIMIT,
  PUBLIC_RIDER_CONTACT_RIDER_COOLDOWN_RATE_LIMIT,
  PUBLIC_RIDER_CONTACT_VENDOR_RATE_LIMIT,
  type RateLimitDecision,
} from "../../../../../../lib/api/abuse-protection.ts";
import {
  validateInput,
  validateJsonBody,
} from "../../../../../../lib/api/validation.ts";
import {
  RiderConnectServiceError,
  createRiderContactHandoff,
} from "../../../../../../lib/public/rider-connect.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../../../lib/observability.ts";
import {
  riderContactHandoffRequestSchema,
  vendorSlugParamsSchema,
} from "../../../../../../lib/validation/index.ts";

type VendorRiderContactRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

function rateLimitedContactResponse(
  rateLimit: RateLimitDecision,
  requestId: string,
): Response {
  return attachRequestIdHeader(
    applyRateLimitResponseHeaders(
      apiError(
        "TOO_MANY_REQUESTS",
        "Too many rider contact attempts. Please wait before trying again.",
        429,
        {
          retry_after_seconds: rateLimit.retryAfterSeconds,
        },
        "Rider contact handoff is temporarily rate limited to protect Localman.",
      ),
      rateLimit,
    ),
    requestId,
  );
}

export async function POST(
  request: Request,
  { params }: VendorRiderContactRouteContext,
) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/vendors/[slug]/riders/contact",
    area: "rider_connect",
  });
  const routeParams = validateInput(vendorSlugParamsSchema, await params);

  if (!routeParams.success) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_RIDER_CONTACT_REQUEST_INVALID",
      status: routeParams.response.status,
      message: "Rider contact route params failed validation.",
    });
    return attachRequestIdHeader(routeParams.response, routeLog.requestId);
  }

  const body = await validateJsonBody(request, riderContactHandoffRequestSchema);

  if (!body.success) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_RIDER_CONTACT_REJECTED",
      status: body.response.status,
      message: "Rider contact handoff payload failed validation.",
      vendorSlug: routeParams.data.slug,
    });
    return attachRequestIdHeader(body.response, routeLog.requestId);
  }

  const publicContactRateLimit = consumeRateLimit(request, {
    policy: PUBLIC_RIDER_CONTACT_RATE_LIMIT,
    scope: "contact",
  });

  if (!publicContactRateLimit.allowed) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_RIDER_CONTACT_RATE_LIMITED",
      status: 429,
      message: "Rider contact handoff was rate limited.",
      vendorSlug: routeParams.data.slug,
      metadata: {
        retryAfterSeconds: publicContactRateLimit.retryAfterSeconds,
      },
    });
    return rateLimitedContactResponse(publicContactRateLimit, routeLog.requestId);
  }

  const vendorContactRateLimit = consumeRateLimit(request, {
    policy: PUBLIC_RIDER_CONTACT_VENDOR_RATE_LIMIT,
    scope: `contact:vendor:${routeParams.data.slug}`,
  });

  if (!vendorContactRateLimit.allowed) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_RIDER_CONTACT_VENDOR_RATE_LIMITED",
      status: 429,
      message: "Rider contact handoff was rate limited for this vendor.",
      vendorSlug: routeParams.data.slug,
      metadata: {
        retryAfterSeconds: vendorContactRateLimit.retryAfterSeconds,
      },
    });
    return rateLimitedContactResponse(vendorContactRateLimit, routeLog.requestId);
  }

  const riderContactRateLimit = consumeRateLimit(request, {
    policy: PUBLIC_RIDER_CONTACT_RIDER_COOLDOWN_RATE_LIMIT,
    scope: `contact:rider:${body.data.riderId}`,
  });

  if (!riderContactRateLimit.allowed) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_RIDER_CONTACT_RIDER_RATE_LIMITED",
      status: 429,
      message: "Repeated rider contact handoff was rate limited.",
      vendorSlug: routeParams.data.slug,
      metadata: {
        riderId: body.data.riderId,
        retryAfterSeconds: riderContactRateLimit.retryAfterSeconds,
      },
    });
    return rateLimitedContactResponse(riderContactRateLimit, routeLog.requestId);
  }

  try {
    const data = await createRiderContactHandoff(routeParams.data.slug, body.data);

    logRouteEvent("info", routeLog, {
      event: "PUBLIC_RIDER_CONTACT_HANDOFF_CREATED",
      status: 201,
      message: "Rider contact handoff was created.",
      vendorSlug: routeParams.data.slug,
      metadata: {
        riderId: data.rider.rider_id,
        intentId: data.intent_id,
        deliveryLocationMode: body.data.deliveryLocationMode,
        paymentNoteType: body.data.paymentNoteType,
      },
    });

    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(apiSuccess(data, 201), publicContactRateLimit),
      routeLog.requestId,
    );
  } catch (error) {
    const status = error instanceof RiderConnectServiceError ? error.status : 502;
    const code = error instanceof RiderConnectServiceError
      ? error.code
      : "UPSTREAM_ERROR";
    const message = status === 404
      ? "Vendor or rider was not found."
      : "Unable to create rider contact handoff.";

    logRouteEvent(status === 404 ? "info" : "error", routeLog, {
      event: status === 404
        ? "PUBLIC_RIDER_CONTACT_NOT_FOUND"
        : "PUBLIC_RIDER_CONTACT_FAILED",
      status,
      message,
      vendorSlug: routeParams.data.slug,
      metadata: {
        riderId: body.data.riderId,
      },
      error,
    });

    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(code, message, status),
        publicContactRateLimit,
      ),
      routeLog.requestId,
    );
  }
}

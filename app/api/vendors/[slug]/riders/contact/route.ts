import { apiError, apiSuccess } from "../../../../../../lib/api/responses.ts";
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

    return attachRequestIdHeader(apiSuccess(data, 201), routeLog.requestId);
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
      apiError(code, message, status),
      routeLog.requestId,
    );
  }
}

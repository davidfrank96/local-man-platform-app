import { apiError, apiSuccess } from "../../../../lib/api/responses.ts";
import {
  applyRateLimitResponseHeaders,
  consumeRateLimit,
  PUBLIC_RIDER_APPLICATION_RATE_LIMIT,
} from "../../../../lib/api/abuse-protection.ts";
import { validateJsonBody } from "../../../../lib/api/validation.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../lib/observability.ts";
import { getSupabaseServiceRoleConfig } from "../../../../lib/vendors/supabase.ts";
import {
  riderApplicationRequestSchema,
} from "../../../../lib/validation/index.ts";
import type {
  RiderApplicationRequest,
  RiderApplicationResponseData,
} from "../../../../types/domain.ts";

const riderApplicationSuccessResponse: RiderApplicationResponseData = {
  received: true,
  review_status: "pending_review",
  verification_status: "pending",
  visibility_status: "hidden",
  message:
    "Application received. Localman may review your details before any rider profile becomes visible.",
};

function createServiceRoleHeaders(serviceRoleKey: string): HeadersInit {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
    prefer: "return=minimal",
  };
}

function toRiderInsertPayload(body: RiderApplicationRequest) {
  const now = new Date().toISOString();

  return {
    display_name: body.displayName,
    full_name: body.fullName,
    phone: body.phone,
    whatsapp_phone: body.whatsappPhone,
    vehicle_type: body.vehicleType,
    plate_number: body.plateNumber ?? null,
    operating_areas: body.operatingAreas,
    usual_available_hours: {
      label: body.usualAvailableHours,
    },
    verification_status: "pending",
    visibility_status: "hidden",
    consent_accepted_at: now,
  };
}

async function insertRiderApplication(
  body: RiderApplicationRequest,
): Promise<void> {
  const config = getSupabaseServiceRoleConfig();

  if (!config) {
    throw new Error("Rider application write config is missing.");
  }

  const url = new URL("/rest/v1/riders", config.url);
  const response = await fetch(url, {
    method: "POST",
    headers: createServiceRoleHeaders(config.serviceRoleKey),
    body: JSON.stringify(toRiderInsertPayload(body)),
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = "";

    try {
      const payload = await response.json();

      if (payload && typeof payload === "object" && "message" in payload) {
        detail = String((payload as { message?: unknown }).message ?? "");
      }
    } catch {
      detail = "";
    }

    throw new Error(`Rider application insert failed: ${response.status} ${detail}`.trim());
  }
}

export async function POST(request: Request) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/riders/apply",
    area: "rider_connect",
  });
  const rateLimit = consumeRateLimit(request, {
    policy: PUBLIC_RIDER_APPLICATION_RATE_LIMIT,
    scope: "apply",
  });

  if (!rateLimit.allowed) {
    logRouteEvent("warn", routeLog, {
      event: "RIDER_APPLICATION_RATE_LIMITED",
      status: 429,
      message: "Rider application request was rate limited.",
      metadata: {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(
          "TOO_MANY_REQUESTS",
          "Too many rider application attempts. Please wait before trying again.",
          429,
          {
            retry_after_seconds: rateLimit.retryAfterSeconds,
          },
          "Rider applications are temporarily rate limited to protect Localman.",
        ),
        rateLimit,
      ),
      routeLog.requestId,
    );
  }

  const body = await validateJsonBody(request, riderApplicationRequestSchema);

  if (!body.success) {
    logRouteEvent("warn", routeLog, {
      event: "RIDER_APPLICATION_REJECTED",
      status: body.response.status,
      message: "Rider application payload failed validation.",
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(body.response, rateLimit),
      routeLog.requestId,
    );
  }

  try {
    await insertRiderApplication(body.data);

    logRouteEvent("info", routeLog, {
      event: "RIDER_APPLICATION_RECEIVED",
      status: 201,
      message: "Rider application stored for admin review.",
      metadata: {
        operatingAreaCount: body.data.operatingAreas.length,
        vehicleType: body.data.vehicleType,
        visibilityStatus: "hidden",
        verificationStatus: "pending",
      },
    });

    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(apiSuccess(riderApplicationSuccessResponse, 201), rateLimit),
      routeLog.requestId,
    );
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "RIDER_APPLICATION_FAILED",
      status: 502,
      message: "Rider application could not be stored.",
      error,
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(
          "UPSTREAM_ERROR",
          "Unable to submit rider application.",
          502,
          "Please try again later.",
        ),
        rateLimit,
      ),
      routeLog.requestId,
    );
  }
}

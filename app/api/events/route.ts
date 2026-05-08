import { apiSuccess } from "../../../lib/api/responses.ts";
import {
  applyRateLimitResponseHeaders,
  consumeRateLimit,
  PUBLIC_EVENT_RATE_LIMIT,
  stableStringify,
  startSingleFlightGuard,
} from "../../../lib/api/abuse-protection.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../lib/observability.ts";
import { userActionEventSchema } from "../../../lib/validation/index.ts";

type EventWriteConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
};

function getEventWriteConfig(): EventWriteConfig | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    supabaseUrl,
    serviceRoleKey,
  };
}

async function readUpstreamError(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    try {
      const text = await response.text();
      return text.length > 0 ? { message: text } : null;
    } catch {
      return null;
    }
  }
}

export async function POST(request: Request) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/events",
    area: "api",
  });
  const config = getEventWriteConfig();

  if (!config) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_EVENT_TRACKING_SKIPPED",
      message: "Tracking skipped because write config is missing.",
      status: 202,
      metadata: {
        reason: "tracking_unconfigured",
      },
    });
    return attachRequestIdHeader(
      apiSuccess({ accepted: false, reason: "tracking_unconfigured" }, 202),
      routeLog.requestId,
    );
  }

  let payload: unknown;
  let rawBody = "";

  try {
    rawBody = await request.text();
    payload = JSON.parse(rawBody);
  } catch {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_EVENT_TRACKING_SKIPPED",
      message: "Tracking skipped because request JSON was invalid.",
      status: 400,
      metadata: {
        reason: "invalid_payload",
        contentType: request.headers.get("content-type"),
        bodyBytes: rawBody.length,
      },
    });
    return attachRequestIdHeader(
      new Response("Bad Request", { status: 400 }),
      routeLog.requestId,
    );
  }

  const parsedEvent = userActionEventSchema.safeParse(payload);

  if (!parsedEvent.success) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_EVENT_TRACKING_SKIPPED",
      message: "Tracking skipped because payload validation failed.",
      status: 202,
      metadata: {
        reason: "invalid_payload",
        issues: parsedEvent.error.issues,
      },
    });
    return attachRequestIdHeader(
      apiSuccess({ accepted: false, reason: "invalid_payload" }, 202),
      routeLog.requestId,
    );
  }

  const event = parsedEvent.data;
  const rateLimit = consumeRateLimit(request, {
    policy: PUBLIC_EVENT_RATE_LIMIT,
    sessionHint: event.session_id ?? null,
  });

  if (!rateLimit.allowed) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_EVENT_RATE_LIMITED",
      message: "Public event tracking request was rate limited.",
      status: 202,
      metadata: {
        eventType: event.event_type,
        sessionIdPresent: Boolean(event.session_id),
        vendorId: event.vendor_id ?? null,
        vendorSlug: event.vendor_slug ?? null,
      },
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiSuccess({ accepted: false, reason: "rate_limited" }, 202),
        rateLimit,
      ),
      routeLog.requestId,
    );
  }

  const dedupeKey = [
    rateLimit.identityKey,
    stableStringify({
      event_type: event.event_type,
      session_id: event.session_id ?? null,
      vendor_id: event.vendor_id ?? null,
      vendor_slug: event.vendor_slug ?? null,
      device_type: event.device_type,
      location_source: event.location_source ?? null,
      page_path: event.page_path ?? null,
      search_query: event.search_query ?? null,
      filters: event.filters ?? {},
      metadata: event.metadata ?? {},
    }),
  ].join("|");
  const dedupeGuard = startSingleFlightGuard<{ accepted: true; deduplicated?: boolean }>(
    dedupeKey,
    2_000,
  );

  if (dedupeGuard.status === "joined") {
    try {
      await dedupeGuard.promise;
    } catch {
      logRouteEvent("warn", routeLog, {
        event: "PUBLIC_EVENT_DUPLICATE_FAILED",
        message: "Public event retry collapsed into a failed upstream write.",
        status: 202,
        metadata: {
          eventType: event.event_type,
          sessionIdPresent: Boolean(event.session_id),
          vendorId: event.vendor_id ?? null,
          vendorSlug: event.vendor_slug ?? null,
        },
      });
      return attachRequestIdHeader(
        applyRateLimitResponseHeaders(
          apiSuccess({ accepted: false, reason: "tracking_unavailable" }, 202),
          rateLimit,
        ),
        routeLog.requestId,
      );
    }

    logRouteEvent("debug", routeLog, {
      event: "PUBLIC_EVENT_DUPLICATE_COLLAPSED",
      message: "Public event retry re-used an in-flight write.",
      status: 202,
      metadata: {
        eventType: event.event_type,
        sessionIdPresent: Boolean(event.session_id),
        vendorId: event.vendor_id ?? null,
        vendorSlug: event.vendor_slug ?? null,
      },
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiSuccess({ accepted: true, deduplicated: true }, 202),
        rateLimit,
      ),
      routeLog.requestId,
    );
  }

  try {
    const response = await fetch(new URL("/rest/v1/user_events", config.supabaseUrl), {
      method: "POST",
      headers: {
        apikey: config.serviceRoleKey,
        authorization: `Bearer ${config.serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({
        event_type: event.event_type,
        session_id: event.session_id ?? null,
        vendor_id: event.vendor_id ?? null,
        timestamp: event.timestamp ?? new Date().toISOString(),
        device_type: event.device_type,
        location_source: event.location_source ?? null,
        vendor_slug: event.vendor_slug ?? null,
        page_path: event.page_path ?? null,
        search_query: event.search_query ?? null,
        filters: event.filters ?? {},
        metadata: {
          ...(event.metadata ?? {}),
          request_id: routeLog.requestId,
        },
      }),
    });

    if (!response.ok) {
      const details = await readUpstreamError(response);

      logRouteEvent("error", routeLog, {
        event: "PUBLIC_EVENT_TRACKING_FAILED",
        status: response.status,
        message: "Public event tracking failed upstream.",
        metadata: {
          eventType: event.event_type,
          sessionIdPresent: Boolean(event.session_id),
          vendorId: event.vendor_id ?? null,
          vendorSlug: event.vendor_slug ?? null,
          details: details ?? { status: response.status },
        },
      });
      dedupeGuard.reject(new Error("tracking_unavailable"));
      return attachRequestIdHeader(
        applyRateLimitResponseHeaders(
          apiSuccess({ accepted: false, reason: "tracking_unavailable" }, 202),
          rateLimit,
        ),
        routeLog.requestId,
      );
    }

    dedupeGuard.resolve({ accepted: true });
    logRouteEvent("debug", routeLog, {
      event: "PUBLIC_EVENT_TRACKED",
      message: "Public event was accepted for storage.",
      status: 201,
      metadata: {
        eventType: event.event_type,
        sessionIdPresent: Boolean(event.session_id),
        vendorId: event.vendor_id ?? null,
        vendorSlug: event.vendor_slug ?? null,
      },
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiSuccess({ accepted: true }, 201),
        rateLimit,
      ),
      routeLog.requestId,
    );
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "PUBLIC_EVENT_TRACKING_FAILED",
      error,
      message: "Public event tracking failed before completion.",
      metadata: {
        eventType: event.event_type,
        sessionIdPresent: Boolean(event.session_id),
        vendorId: event.vendor_id ?? null,
        vendorSlug: event.vendor_slug ?? null,
      },
    });
    dedupeGuard.reject(error);
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiSuccess({ accepted: false, reason: "tracking_unavailable" }, 202),
        rateLimit,
      ),
      routeLog.requestId,
    );
  }
}

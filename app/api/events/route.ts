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

type EventTrackingResult = {
  accepted: boolean;
  deduplicated?: boolean;
  reason?: string;
};

type VendorExistenceResult =
  | {
      status: "exists";
    }
  | {
      status: "missing";
    }
  | {
      status: "unavailable";
      details: unknown;
      upstreamStatus: number;
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

async function verifyVendorExists(
  config: EventWriteConfig,
  vendorId: string,
): Promise<VendorExistenceResult> {
  const url = new URL("/rest/v1/vendors", config.supabaseUrl);
  url.searchParams.set("select", "id");
  url.searchParams.set("id", `eq.${vendorId}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    return {
      status: "unavailable",
      upstreamStatus: response.status,
      details: await readUpstreamError(response),
    };
  }

  let rows: Array<{ id?: string | null }> = [];

  try {
    rows = (await response.json()) as Array<{ id?: string | null }>;
  } catch {
    rows = [];
  }

  return rows.some((row) => row.id === vendorId) ? { status: "exists" } : { status: "missing" };
}

function isVendorForeignKeyError(details: unknown): boolean {
  if (!details || typeof details !== "object") {
    return false;
  }

  const record = details as Record<string, unknown>;
  const code = String(record.code ?? "");
  const message = String(record.message ?? "");
  const detail = String(record.details ?? "");

  return (
    code === "23503" &&
    (message.includes("user_action_events_vendor_id_fkey") ||
      message.includes("user_events") ||
      detail.includes("vendor_id"))
  );
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
  const dedupeGuard = startSingleFlightGuard<EventTrackingResult>(
    dedupeKey,
    2_000,
  );

  if (dedupeGuard.status === "joined") {
    let dedupedResult: EventTrackingResult;

    try {
      dedupedResult = await dedupeGuard.promise;
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
        apiSuccess({ ...dedupedResult, deduplicated: true }, 202),
        rateLimit,
      ),
      routeLog.requestId,
    );
  }

  try {
    if (event.vendor_id) {
      const vendorExistence = await verifyVendorExists(config, event.vendor_id);

      if (vendorExistence.status === "missing") {
        const skippedResult = { accepted: false, reason: "vendor_not_found" } satisfies
          EventTrackingResult;

        logRouteEvent("warn", routeLog, {
          event: "PUBLIC_EVENT_VENDOR_NOT_FOUND_SKIPPED",
          message: "Public event referenced a vendor that does not exist; tracking write skipped.",
          status: 202,
          metadata: {
            eventType: event.event_type,
            sessionIdPresent: Boolean(event.session_id),
            vendorId: event.vendor_id,
            vendorSlug: event.vendor_slug ?? null,
            pagePath: event.page_path ?? null,
          },
        });
        dedupeGuard.resolve(skippedResult);
        return attachRequestIdHeader(
          applyRateLimitResponseHeaders(apiSuccess(skippedResult, 202), rateLimit),
          routeLog.requestId,
        );
      }

      if (vendorExistence.status === "unavailable") {
        logRouteEvent("error", routeLog, {
          event: "PUBLIC_EVENT_VENDOR_VALIDATION_FAILED",
          message: "Public event vendor validation failed before tracking write.",
          status: vendorExistence.upstreamStatus,
          metadata: {
            eventType: event.event_type,
            sessionIdPresent: Boolean(event.session_id),
            vendorId: event.vendor_id,
            vendorSlug: event.vendor_slug ?? null,
            details: vendorExistence.details ?? { status: vendorExistence.upstreamStatus },
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
    }

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

      if (event.vendor_id && isVendorForeignKeyError(details)) {
        const skippedResult = { accepted: false, reason: "vendor_not_found" } satisfies
          EventTrackingResult;

        logRouteEvent("warn", routeLog, {
          event: "PUBLIC_EVENT_VENDOR_NOT_FOUND_SKIPPED",
          status: 202,
          message: "Public event referenced a vendor deleted before insert; tracking write skipped.",
          metadata: {
            eventType: event.event_type,
            sessionIdPresent: Boolean(event.session_id),
            vendorId: event.vendor_id,
            vendorSlug: event.vendor_slug ?? null,
            details: details ?? { status: response.status },
          },
        });
        dedupeGuard.resolve(skippedResult);
        return attachRequestIdHeader(
          applyRateLimitResponseHeaders(apiSuccess(skippedResult, 202), rateLimit),
          routeLog.requestId,
        );
      }

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

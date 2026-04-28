import { apiSuccess } from "../../../lib/api/responses.ts";
import { getOrCreateRequestId, logStructuredEvent } from "../../../lib/observability.ts";
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
  const requestId = getOrCreateRequestId(request);
  const config = getEventWriteConfig();

  if (!config) {
    logStructuredEvent("warn", {
      type: "PUBLIC_EVENT_TRACKING_SKIPPED",
      requestId,
      reason: "tracking_unconfigured",
      message: "Tracking skipped because write config is missing.",
    });
    return apiSuccess({ accepted: false, reason: "tracking_unconfigured" }, 202);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    logStructuredEvent("warn", {
      type: "PUBLIC_EVENT_TRACKING_SKIPPED",
      requestId,
      reason: "invalid_payload",
      message: "Tracking skipped because request JSON was invalid.",
    });
    return apiSuccess({ accepted: false, reason: "invalid_payload" }, 202);
  }

  const parsedEvent = userActionEventSchema.safeParse(payload);

  if (!parsedEvent.success) {
    logStructuredEvent("warn", {
      type: "PUBLIC_EVENT_TRACKING_SKIPPED",
      requestId,
      reason: "invalid_payload",
      message: "Tracking skipped because payload validation failed.",
      issues: parsedEvent.error.issues,
    });
    return apiSuccess({ accepted: false, reason: "invalid_payload" }, 202);
  }

  const event = parsedEvent.data;

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
          request_id: requestId,
        },
      }),
    });

    if (!response.ok) {
      const details = await readUpstreamError(response);

      logStructuredEvent("error", {
        type: "PUBLIC_EVENT_TRACKING_FAILED",
        requestId,
        eventType: event.event_type,
        status: response.status,
        details: details ?? { status: response.status },
      });
      return apiSuccess({ accepted: false, reason: "tracking_unavailable" }, 202);
    }

    return apiSuccess({ accepted: true }, 201);
  } catch (error) {
    logStructuredEvent("error", {
      type: "PUBLIC_EVENT_TRACKING_FAILED",
      requestId,
      eventType: event.event_type,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return apiSuccess({ accepted: false, reason: "tracking_unavailable" }, 202);
  }
}

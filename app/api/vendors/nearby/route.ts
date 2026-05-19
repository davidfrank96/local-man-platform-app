import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "../../../../lib/api/responses.ts";
import {
  applyRateLimitResponseHeaders,
  consumeRateLimit,
  PUBLIC_NEARBY_READ_RATE_LIMIT,
  PUBLIC_NEARBY_SEARCH_RATE_LIMIT,
  type RateLimitDecision,
} from "../../../../lib/api/abuse-protection.ts";
import { validateSearchParams } from "../../../../lib/api/validation.ts";
import { resolveNearbySearchLocation } from "../../../../lib/location/user-location.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../lib/observability.ts";
import { nearbyVendorsQuerySchema } from "../../../../lib/validation/index.ts";
import { findNearbyVendors } from "../../../../lib/vendors/nearby.ts";
import {
  fetchNearbyVendorCandidates,
  fetchVendorUsageScores,
  getSupabaseRestConfig,
  getSupabaseServiceRoleConfig,
} from "../../../../lib/vendors/supabase.ts";

function sanitizeNearbySearchInput(search: string | null | undefined): string {
  return String(search || "")
    .replace(/[^\w\s-]/g, "")
    .trim();
}

const nearbySlowRequestThresholdMs = 750;

export async function GET(request: NextRequest) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/vendors/nearby",
    area: "public_discovery",
  });
  const readRateLimit = consumeRateLimit(request, {
    policy: PUBLIC_NEARBY_READ_RATE_LIMIT,
    scope: "nearby",
    useClientCookie: false,
  });

  if (!readRateLimit.allowed) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_NEARBY_READ_RATE_LIMITED",
      status: 429,
      message: "Nearby request was rate limited.",
      metadata: {
        retryAfterSeconds: readRateLimit.retryAfterSeconds,
      },
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(
          "TOO_MANY_REQUESTS",
          "Too many nearby requests. Please wait before trying again.",
          429,
          {
            retry_after_seconds: readRateLimit.retryAfterSeconds,
          },
          "Nearby discovery is temporarily rate limited to protect Local Man.",
        ),
        readRateLimit,
      ),
      routeLog.requestId,
    );
  }

  const sanitizedSearchParams = new URLSearchParams(request.nextUrl.searchParams);
  const safeSearch = sanitizeNearbySearchInput(
    request.nextUrl.searchParams.get("search"),
  );

  if (safeSearch) {
    sanitizedSearchParams.set("search", safeSearch);
  } else {
    sanitizedSearchParams.delete("search");
  }

  const query = validateSearchParams(
    nearbyVendorsQuerySchema,
    sanitizedSearchParams,
  );

  if (!query.success) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_NEARBY_REQUEST_INVALID",
      status: query.response.status,
      message: "Nearby request validation failed.",
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(query.response, readRateLimit),
      routeLog.requestId,
    );
  }

  const resolvedSearch = resolveNearbySearchLocation(query.data);
  const activeSearchRateLimit: RateLimitDecision | null = query.data.search
    ? consumeRateLimit(request, {
      policy: PUBLIC_NEARBY_SEARCH_RATE_LIMIT,
      scope: "search",
    })
    : null;

  if (activeSearchRateLimit && !activeSearchRateLimit.allowed) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_NEARBY_RATE_LIMITED",
      status: 429,
      message: "Nearby search request was rate limited.",
      metadata: {
        searchPresent: Boolean(query.data.search),
        retryAfterSeconds: activeSearchRateLimit.retryAfterSeconds,
      },
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(
          "TOO_MANY_REQUESTS",
          "Too many search requests. Please wait before trying again.",
          429,
          {
            retry_after_seconds: activeSearchRateLimit.retryAfterSeconds,
          },
          "Search is temporarily rate limited to protect Local Man.",
        ),
        activeSearchRateLimit,
      ),
      routeLog.requestId,
    );
  }
  const config = getSupabaseRestConfig();

  if (!config) {
    logRouteEvent("error", routeLog, {
      event: "PUBLIC_NEARBY_CONFIGURATION_ERROR",
      status: 503,
      message: "Nearby search is unavailable because public Supabase config is missing.",
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(
          "CONFIGURATION_ERROR",
          "Nearby vendor search is unavailable.",
          503,
        ),
        activeSearchRateLimit ?? readRateLimit,
      ),
      routeLog.requestId,
    );
  }

  try {
    const candidates = await fetchNearbyVendorCandidates(
      resolvedSearch.query,
      config,
    );
    const usageScores = await fetchVendorUsageScores(
      candidates.map((vendor) => vendor.id),
      getSupabaseServiceRoleConfig(),
    );
    const vendors = findNearbyVendors(
      candidates,
      resolvedSearch.query,
      new Date(),
      usageScores,
    );

    const response = apiSuccess({
      location: resolvedSearch.location,
      vendors,
    });
    const durationMs = Date.now() - routeLog.startedAt;

    if (vendors.length === 0) {
      logRouteEvent("info", routeLog, {
        event: "PUBLIC_NEARBY_EMPTY_RESULT",
        status: 200,
        durationMs,
        message: "Nearby request completed with no matching vendors.",
        metadata: {
          degraded: false,
          locationSource: resolvedSearch.location.source,
          searchPresent: Boolean(query.data.search),
          radiusKm: query.data.radius_km,
        },
      });
    } else if (durationMs >= nearbySlowRequestThresholdMs) {
      logRouteEvent("warn", routeLog, {
        event: "PUBLIC_NEARBY_SLOW",
        status: 200,
        durationMs,
        message: "Nearby request completed slowly.",
        metadata: {
          resultCount: vendors.length,
          locationSource: resolvedSearch.location.source,
          searchPresent: Boolean(query.data.search),
          radiusKm: query.data.radius_km,
        },
      });
    }

    return attachRequestIdHeader(
      activeSearchRateLimit
        ? applyRateLimitResponseHeaders(response, activeSearchRateLimit)
        : applyRateLimitResponseHeaders(response, readRateLimit),
      routeLog.requestId,
    );
  } catch (error) {
    logRouteEvent("error", routeLog, {
      event: "PUBLIC_NEARBY_ROUTE_FAILED",
      status: 200,
      message: "Nearby request degraded to an empty response after an upstream failure.",
      error,
      metadata: {
        degraded: true,
        locationSource: resolvedSearch.location.source,
        searchPresent: Boolean(query.data.search),
        radiusKm: query.data.radius_km,
      },
    });

    const response = apiSuccess({
      location: resolvedSearch.location,
      vendors: [],
    });

    return attachRequestIdHeader(
      activeSearchRateLimit
        ? applyRateLimitResponseHeaders(response, activeSearchRateLimit)
        : applyRateLimitResponseHeaders(response, readRateLimit),
      routeLog.requestId,
    );
  }
}

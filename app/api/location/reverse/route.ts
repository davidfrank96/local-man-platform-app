import {
  applyRateLimitResponseHeaders,
  consumeRateLimit,
  PUBLIC_REVERSE_GEOCODE_RATE_LIMIT,
} from "../../../../lib/api/abuse-protection.ts";
import { apiError, apiSuccess } from "../../../../lib/api/responses.ts";
import { formatReverseGeocodeLabel } from "../../../../lib/location/reverse-geocode.ts";
import { logStructuredEvent } from "../../../../lib/observability.ts";

const REVERSE_GEOCODE_TIMEOUT_MS = 2_500;
const MAX_ACCEPT_LANGUAGE_LENGTH = 120;

function parseCoordinate(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function isCoordinateInRange(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function getSafeAcceptLanguage(request: Request): string {
  const header = request.headers.get("accept-language")?.trim();

  return header && header.length <= MAX_ACCEPT_LANGUAGE_LENGTH ? header : "en";
}

export async function GET(request: Request) {
  const rateLimit = consumeRateLimit(request, {
    policy: PUBLIC_REVERSE_GEOCODE_RATE_LIMIT,
    scope: "reverse-geocode",
    useClientCookie: false,
  });

  if (!rateLimit.allowed) {
    return applyRateLimitResponseHeaders(
      apiError(
        "TOO_MANY_REQUESTS",
        "Too many location lookup requests. Please wait before trying again.",
        429,
        {
          retry_after_seconds: rateLimit.retryAfterSeconds,
        },
      ),
      rateLimit,
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = parseCoordinate(searchParams.get("lat"));
  const lng = parseCoordinate(searchParams.get("lng"));

  if (lat === null || lng === null || !isCoordinateInRange(lat, lng)) {
    return applyRateLimitResponseHeaders(
      apiError(
        "VALIDATION_ERROR",
        "Latitude and longitude are required.",
        400,
        undefined,
        "Latitude must be between -90 and 90, and longitude must be between -180 and 180.",
      ),
      rateLimit,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REVERSE_GEOCODE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=13&lat=${lat}&lon=${lng}`,
      {
        headers: {
          "accept-language": getSafeAcceptLanguage(request),
          "user-agent": "The Local Man / reverse-geocode",
        },
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Reverse geocode failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      address?: Record<string, string>;
    };

    return applyRateLimitResponseHeaders(
      apiSuccess({
        label: formatReverseGeocodeLabel(payload.address),
      }),
      rateLimit,
    );
  } catch (error) {
    logStructuredEvent("warn", {
      type: "PUBLIC_REVERSE_GEOCODE_FAILED",
      area: "public_discovery",
      route: "/api/location/reverse",
      message: "Reverse geocode lookup failed.",
      error,
    });
    return applyRateLimitResponseHeaders(
      apiError(
        "UPSTREAM_ERROR",
        "Unable to reverse geocode location.",
        502,
      ),
      rateLimit,
    );
  } finally {
    clearTimeout(timeout);
  }
}

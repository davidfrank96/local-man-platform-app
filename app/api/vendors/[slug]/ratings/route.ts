import { createHash } from "node:crypto";
import { apiError, apiSuccess } from "../../../../../lib/api/responses.ts";
import {
  applyRateLimitResponseHeaders,
  consumeRateLimit,
  getExistingPublicClientId,
  PUBLIC_RATING_RATE_LIMIT,
  startSingleFlightGuard,
} from "../../../../../lib/api/abuse-protection.ts";
import {
  validateInput,
  validateJsonBody,
} from "../../../../../lib/api/validation.ts";
import {
  attachRequestIdHeader,
  createRouteLogContext,
  logRouteEvent,
} from "../../../../../lib/observability.ts";
import {
  createVendorRatingRequestSchema,
  vendorSlugParamsSchema,
} from "../../../../../lib/validation/index.ts";

type VendorRatingsRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

type RatingWriteConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
};

type VendorRatingTarget = {
  id: string;
  slug: string;
};

type RatingSubmissionResult = {
  vendor_id: string;
  average_rating: number;
  review_count: number;
  duplicate: boolean;
};

type RatingRouteResult = {
  vendor_id: string;
  rating_summary: {
    average_rating: number;
    review_count: number;
  };
  duplicate: boolean;
};

function getRatingWriteConfig(): RatingWriteConfig | null {
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

function createHeaders(config: RatingWriteConfig, prefer = "return=minimal"): HeadersInit {
  return {
    apikey: config.serviceRoleKey,
    authorization: `Bearer ${config.serviceRoleKey}`,
    "content-type": "application/json",
    prefer,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchVendorTarget(
  slug: string,
  config: RatingWriteConfig,
): Promise<VendorRatingTarget | null> {
  const url = new URL("/rest/v1/vendors", config.supabaseUrl);
  url.searchParams.set("select", "id,slug");
  url.searchParams.set("slug", `eq.${slug}`);
  url.searchParams.set("is_active", "eq.true");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    method: "GET",
    headers: createHeaders(config, ""),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(`Vendor lookup failed: ${response.status}`);
  }

  if (!Array.isArray(payload)) {
    throw new Error("Vendor lookup payload was malformed.");
  }

  return (payload[0] as VendorRatingTarget | undefined) ?? null;
}

function normalizeRatingSubmissionPayload(payload: unknown): RatingSubmissionResult | null {
  const candidate = Array.isArray(payload) ? payload[0] : payload;

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const vendorId = "vendor_id" in candidate ? (candidate as { vendor_id?: unknown }).vendor_id : null;
  const averageRating = "average_rating" in candidate
    ? (candidate as { average_rating?: unknown }).average_rating
    : null;
  const reviewCount = "review_count" in candidate
    ? (candidate as { review_count?: unknown }).review_count
    : null;
  const duplicate = "duplicate" in candidate
    ? (candidate as { duplicate?: unknown }).duplicate
    : false;

  if (
    typeof vendorId !== "string" ||
    typeof averageRating !== "number" ||
    typeof reviewCount !== "number" ||
    typeof duplicate !== "boolean"
  ) {
    return null;
  }

  return {
    vendor_id: vendorId,
    average_rating: averageRating,
    review_count: reviewCount,
    duplicate,
  };
}

function hashAnonymousRatingClientId(clientId: string): string {
  return createHash("sha256")
    .update(`localman-rating:${clientId}`)
    .digest("hex");
}

function toRatingRouteResult(ratingSummary: RatingSubmissionResult): RatingRouteResult {
  return {
    vendor_id: ratingSummary.vendor_id,
    rating_summary: {
      average_rating: ratingSummary.average_rating,
      review_count: ratingSummary.review_count,
    },
    duplicate: ratingSummary.duplicate,
  };
}

function toRatingResponseData(result: RatingRouteResult): Omit<RatingRouteResult, "duplicate"> {
  return {
    vendor_id: result.vendor_id,
    rating_summary: result.rating_summary,
  };
}

function duplicateRatingResponse(
  result: RatingRouteResult,
  rateLimit: ReturnType<typeof consumeRateLimit>,
): Response {
  return applyRateLimitResponseHeaders(
    apiError(
      "VALIDATION_ERROR",
      "You've already rated this vendor.",
      409,
      {
        ...toRatingResponseData(result),
        duplicate: true,
      },
      "Each browser can rate a vendor once.",
    ),
    rateLimit,
  );
}

async function submitPublicVendorRating(
  vendorId: string,
  score: number,
  signalTags: string[],
  anonymousClientHash: string,
  config: RatingWriteConfig,
): Promise<RatingSubmissionResult | null> {
  const response = await fetch(
    new URL("/rest/v1/rpc/submit_public_vendor_rating", config.supabaseUrl),
    {
      method: "POST",
      headers: createHeaders(config, ""),
      body: JSON.stringify({
        target_vendor_id: vendorId,
        target_score: score,
        target_source_type: "public_simple_rating",
        target_anonymous_client_hash: anonymousClientHash,
        target_signal_tags: signalTags,
      }),
    },
  );
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(`Rating submission failed: ${response.status}`);
  }

  return normalizeRatingSubmissionPayload(payload);
}

export async function POST(request: Request, { params }: VendorRatingsRouteContext) {
  const routeLog = createRouteLogContext(request, {
    route: "/api/vendors/[slug]/ratings",
    area: "ratings",
  });
  const routeParams = validateInput(vendorSlugParamsSchema, await params);

  if (!routeParams.success) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_VENDOR_RATING_REQUEST_INVALID",
      status: routeParams.response.status,
      message: "Vendor rating route params failed validation.",
    });
    return attachRequestIdHeader(routeParams.response, routeLog.requestId);
  }

  const rateLimit = consumeRateLimit(request, {
    policy: PUBLIC_RATING_RATE_LIMIT,
  });

  if (!rateLimit.allowed) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_VENDOR_RATING_RATE_LIMITED",
      status: 429,
      message: "Vendor rating submission was rate limited.",
      vendorSlug: routeParams.data.slug,
      metadata: {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(
          "TOO_MANY_REQUESTS",
          "Too many rating submissions. Please wait before trying again.",
          429,
          {
            retry_after_seconds: rateLimit.retryAfterSeconds,
          },
          "Rating is temporarily rate limited to protect Local Man.",
        ),
        rateLimit,
      ),
      routeLog.requestId,
    );
  }

  const body = await validateJsonBody(request, createVendorRatingRequestSchema);

  if (!body.success) {
    logRouteEvent("warn", routeLog, {
      event: "PUBLIC_VENDOR_RATING_REJECTED",
      status: body.response.status,
      message: "Vendor rating payload failed validation.",
      vendorSlug: routeParams.data.slug,
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(
          "VALIDATION_ERROR",
          "Invalid rating input.",
          body.response.status,
          undefined,
          "Check the star rating and selected signals.",
        ),
        rateLimit,
      ),
      routeLog.requestId,
    );
  }

  const config = getRatingWriteConfig();

  if (!config) {
    logRouteEvent("error", routeLog, {
      event: "PUBLIC_VENDOR_RATING_CONFIGURATION_ERROR",
      status: 503,
      message: "Vendor ratings are unavailable because write config is missing.",
      vendorSlug: routeParams.data.slug,
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(
          "CONFIGURATION_ERROR",
          "Vendor ratings are unavailable.",
          503,
        ),
        rateLimit,
      ),
      routeLog.requestId,
    );
  }

  let activeDedupeGuard:
    | Extract<
      ReturnType<typeof startSingleFlightGuard<{
        vendor_id: string;
        rating_summary: {
          average_rating: number;
          review_count: number;
        };
        duplicate: boolean;
      }>>,
      { status: "fresh" }
    >
    | null = null;

  try {
    const vendor = await fetchVendorTarget(routeParams.data.slug, config);

    if (!vendor) {
      logRouteEvent("info", routeLog, {
        event: "PUBLIC_VENDOR_RATING_NOT_FOUND",
        status: 404,
        message: "Vendor rating submission targeted an unknown vendor.",
        vendorSlug: routeParams.data.slug,
      });
      return attachRequestIdHeader(
        applyRateLimitResponseHeaders(
          apiError("NOT_FOUND", "Vendor was not found.", 404),
          rateLimit,
        ),
        routeLog.requestId,
      );
    }

    const anonymousClientId =
      getExistingPublicClientId(request) ??
      rateLimit.responseClientId ??
      crypto.randomUUID();
    const anonymousClientHash = hashAnonymousRatingClientId(anonymousClientId);
    const dedupeGuard = startSingleFlightGuard<RatingRouteResult>(
      [
        rateLimit.identityKey,
        vendor.id,
        String(body.data.score),
        [...body.data.signals].sort().join(","),
      ].join("|"),
      60_000,
    );
    if (dedupeGuard.status === "fresh") {
      activeDedupeGuard = dedupeGuard;
    }

    if (dedupeGuard.status === "joined") {
      try {
        const payload = await dedupeGuard.promise;

        logRouteEvent("info", routeLog, {
          event: "PUBLIC_VENDOR_RATING_DUPLICATE_COLLAPSED",
          status: 200,
          message: "Vendor rating duplicate submission reused an in-flight result.",
          vendorId: payload.vendor_id,
          vendorSlug: routeParams.data.slug,
          metadata: {
            score: body.data.score,
            signalCount: body.data.signals.length,
            duplicate: payload.duplicate,
          },
        });

        if (payload.duplicate) {
          return attachRequestIdHeader(
            duplicateRatingResponse(payload, rateLimit),
            routeLog.requestId,
          );
        }

        return attachRequestIdHeader(
          applyRateLimitResponseHeaders(apiSuccess(toRatingResponseData(payload), 200), rateLimit),
          routeLog.requestId,
        );
      } catch (error) {
        logRouteEvent("error", routeLog, {
          event: "PUBLIC_VENDOR_RATING_DUPLICATE_FAILED",
          status: 502,
          message: "Vendor rating duplicate submission failed while awaiting the shared result.",
          vendorSlug: routeParams.data.slug,
          error,
        });
        return attachRequestIdHeader(
          applyRateLimitResponseHeaders(
            apiError(
              "UPSTREAM_ERROR",
              "Unable to save vendor rating.",
              502,
            ),
            rateLimit,
          ),
          routeLog.requestId,
        );
      }
    }

    const ratingSummary = await submitPublicVendorRating(
      vendor.id,
      body.data.score,
      body.data.signals,
      anonymousClientHash,
      config,
    );

    if (!ratingSummary) {
      dedupeGuard.reject(new Error("Vendor was not found."));
      logRouteEvent("warn", routeLog, {
        event: "PUBLIC_VENDOR_RATING_RPC_RETURNED_EMPTY",
        status: 404,
        message: "Vendor rating RPC returned no summary payload.",
        vendorId: vendor.id,
        vendorSlug: routeParams.data.slug,
      });
      return attachRequestIdHeader(
        applyRateLimitResponseHeaders(
          apiError("NOT_FOUND", "Vendor was not found.", 404),
          rateLimit,
        ),
        routeLog.requestId,
      );
    }

    const responseData = toRatingRouteResult(ratingSummary);
    dedupeGuard.resolve(responseData);

    if (responseData.duplicate) {
      logRouteEvent("info", routeLog, {
        event: "PUBLIC_VENDOR_RATING_DUPLICATE_REJECTED",
        status: 409,
        message: "Vendor rating duplicate attempt was rejected.",
        vendorId: ratingSummary.vendor_id,
        vendorSlug: routeParams.data.slug,
        metadata: {
          score: body.data.score,
          signalCount: body.data.signals.length,
          reviewCount: ratingSummary.review_count,
          averageRating: ratingSummary.average_rating,
        },
      });

      return attachRequestIdHeader(
        duplicateRatingResponse(responseData, rateLimit),
        routeLog.requestId,
      );
    }

    logRouteEvent("info", routeLog, {
      event: "PUBLIC_VENDOR_RATING_ACCEPTED",
      status: 201,
      message: "Vendor rating accepted.",
      vendorId: ratingSummary.vendor_id,
      vendorSlug: routeParams.data.slug,
      metadata: {
        score: body.data.score,
        signalCount: body.data.signals.length,
        reviewCount: ratingSummary.review_count,
        averageRating: ratingSummary.average_rating,
      },
    });

    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(apiSuccess(toRatingResponseData(responseData), 201), rateLimit),
      routeLog.requestId,
    );
  } catch (error) {
    activeDedupeGuard?.reject(error);
    logRouteEvent("error", routeLog, {
      event: "PUBLIC_VENDOR_RATING_FAILED",
      status: 502,
      message: "Vendor rating submission failed.",
      vendorSlug: routeParams.data.slug,
      metadata: {
        score: body.data.score,
        signalCount: body.data.signals.length,
      },
      error,
    });
    return attachRequestIdHeader(
      applyRateLimitResponseHeaders(
        apiError(
          "UPSTREAM_ERROR",
          "Unable to save vendor rating.",
          502,
        ),
        rateLimit,
      ),
      routeLog.requestId,
    );
  }
}

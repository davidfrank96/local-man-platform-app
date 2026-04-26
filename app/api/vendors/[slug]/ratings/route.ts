import { apiError, apiSuccess } from "../../../../../lib/api/responses.ts";
import {
  validateInput,
  validateJsonBody,
} from "../../../../../lib/api/validation.ts";
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
  average_rating: number;
  review_count: number;
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
  url.searchParams.set("select", "id,slug,average_rating,review_count");
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

async function insertRating(
  vendorId: string,
  score: number,
  config: RatingWriteConfig,
): Promise<void> {
  const response = await fetch(new URL("/rest/v1/ratings", config.supabaseUrl), {
    method: "POST",
    headers: createHeaders(config),
    body: JSON.stringify({
      vendor_id: vendorId,
      score,
      source_type: "public_simple_rating",
    }),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(
      `Rating insert failed: ${response.status} ${
        typeof payload === "object" && payload !== null && "message" in payload
          ? String((payload as { message?: unknown }).message ?? "")
          : ""
      }`.trim(),
    );
  }
}

async function fetchVendorScores(
  vendorId: string,
  config: RatingWriteConfig,
): Promise<number[]> {
  const url = new URL("/rest/v1/ratings", config.supabaseUrl);
  url.searchParams.set("select", "score");
  url.searchParams.set("vendor_id", `eq.${vendorId}`);

  const response = await fetch(url, {
    method: "GET",
    headers: createHeaders(config, ""),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(`Ratings aggregate fetch failed: ${response.status}`);
  }

  if (!Array.isArray(payload)) {
    throw new Error("Ratings aggregate payload was malformed.");
  }

  return payload
    .flatMap((row) =>
      typeof row === "object" &&
      row !== null &&
      "score" in row &&
      typeof (row as { score?: unknown }).score === "number"
        ? [(row as { score: number }).score]
        : [],
    );
}

function computeRatingSummary(scores: number[]): { average_rating: number; review_count: number } {
  const reviewCount = scores.length;

  if (reviewCount === 0) {
    return {
      average_rating: 0,
      review_count: 0,
    };
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / reviewCount;

  return {
    average_rating: Number(average.toFixed(2)),
    review_count: reviewCount,
  };
}

async function updateVendorRatingSummary(
  vendorId: string,
  summary: { average_rating: number; review_count: number },
  config: RatingWriteConfig,
): Promise<void> {
  const url = new URL("/rest/v1/vendors", config.supabaseUrl);
  url.searchParams.set("id", `eq.${vendorId}`);

  const response = await fetch(url, {
    method: "PATCH",
    headers: createHeaders(config),
    body: JSON.stringify(summary),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(`Vendor rating summary update failed: ${response.status}`);
  }

  if (payload !== null && !Array.isArray(payload)) {
    throw new Error("Vendor rating summary update payload was malformed.");
  }
}

export async function POST(request: Request, { params }: VendorRatingsRouteContext) {
  const routeParams = validateInput(vendorSlugParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  const body = await validateJsonBody(request, createVendorRatingRequestSchema);

  if (!body.success) {
    return body.response;
  }

  const config = getRatingWriteConfig();

  if (!config) {
    return apiError(
      "CONFIGURATION_ERROR",
      "Supabase environment variables are required for vendor ratings.",
      503,
    );
  }

  try {
    const vendor = await fetchVendorTarget(routeParams.data.slug, config);

    if (!vendor) {
      return apiError("NOT_FOUND", "Vendor was not found.", 404);
    }

    await insertRating(vendor.id, body.data.score, config);
    const scores = await fetchVendorScores(vendor.id, config);
    const ratingSummary = computeRatingSummary(scores);
    await updateVendorRatingSummary(vendor.id, ratingSummary, config);

    return apiSuccess({
      vendor_id: vendor.id,
      rating_summary: ratingSummary,
    }, 201);
  } catch (error) {
    return apiError(
      "UPSTREAM_ERROR",
      "Unable to save vendor rating.",
      502,
      error instanceof Error ? { message: error.message } : undefined,
    );
  }
}

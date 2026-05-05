import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "../../../../lib/api/responses.ts";
import { validateSearchParams } from "../../../../lib/api/validation.ts";
import { resolveNearbySearchLocation } from "../../../../lib/location/user-location.ts";
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

export async function GET(request: NextRequest) {
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
    return query.response;
  }

  const resolvedSearch = resolveNearbySearchLocation(query.data);
  const config = getSupabaseRestConfig();

  if (!config) {
    return apiError(
      "CONFIGURATION_ERROR",
      "Supabase public environment variables are required for nearby vendor search.",
      503,
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

    return apiSuccess({
      location: resolvedSearch.location,
      vendors,
    });
  } catch (error) {
    console.error("NEARBY_ROUTE_ERROR:", error);

    return apiSuccess({
      location: resolvedSearch.location,
      vendors: [],
    });
  }
}

import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { validateSearchParams } from "@/lib/api/validation";
import { resolveNearbySearchLocation } from "@/lib/location/user-location";
import { nearbyVendorsQuerySchema } from "@/lib/validation";
import { findNearbyVendors } from "@/lib/vendors/nearby";
import {
  fetchNearbyVendorCandidates,
  fetchVendorUsageScores,
  getSupabaseRestConfig,
  getSupabaseServiceRoleConfig,
} from "@/lib/vendors/supabase";

export async function GET(request: NextRequest) {
  const query = validateSearchParams(
    nearbyVendorsQuerySchema,
    request.nextUrl.searchParams,
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
    return apiError(
      "UPSTREAM_ERROR",
      "Unable to fetch nearby vendors.",
      502,
      error instanceof Error ? { message: error.message } : undefined,
    );
  }
}

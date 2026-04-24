"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUserLocation } from "../../hooks/use-user-location.ts";
import type { AcquiredUserLocation } from "../../lib/location/acquisition.ts";
import type { LocationAcquisitionError } from "../../lib/location/acquisition.ts";
import {
  fetchNearbyVendors,
  fetchPublicCategories,
  type PublicCategory,
} from "../../lib/vendors/public-api-client.ts";
import type { NearbyVendorsResponseData } from "../../types/index.ts";
import {
  VendorFilters,
  type DiscoveryFilters,
} from "./vendor-filters.tsx";
import { VendorCard } from "./vendor-card.tsx";
import { VendorMap } from "./vendor-map.tsx";

type PublicDiscoveryProps = {
  title?: string;
  initialSearch?: string;
};

const defaultFilters: DiscoveryFilters = {
  search: "",
  radiusKm: 10,
  openNow: false,
  priceBand: "",
  category: "",
};

function createNearbyFilters(
  location: AcquiredUserLocation,
  filters: DiscoveryFilters,
) {
  const shouldSendCoordinates = location.source !== "default_city";

  return {
    ...(shouldSendCoordinates
      ? {
          lat: location.coordinates.lat,
          lng: location.coordinates.lng,
        }
      : {}),
    location_source: location.source,
    radius_km: filters.radiusKm,
    open_now: filters.openNow || undefined,
    price_band: filters.priceBand || undefined,
    category: filters.category || undefined,
    search: filters.search || undefined,
  };
}

function formatLocationErrorMessage(code: string): string {
  switch (code) {
    case "GEOLOCATION_DENIED":
      return "Precise location was denied.";
    case "GEOLOCATION_UNAVAILABLE":
      return "Precise location was unavailable.";
    case "GEOLOCATION_TIMEOUT":
      return "Precise location took too long.";
    case "IP_LOOKUP_UNAVAILABLE":
      return "Approximate location was unavailable.";
    default:
      return "Location could not be resolved.";
  }
}

function getLocationCopy(
  location: AcquiredUserLocation | null,
  locationErrors: LocationAcquisitionError[],
): string {
  if (!location) return "Trying to get precise location";
  if (location.source === "precise") return "Using current location";
  if (location.source === "approximate") return "Using approximate location";

  if (
    locationErrors.some((error) => error.code === "GEOLOCATION_TIMEOUT") &&
    locationErrors.some((error) => error.code === "IP_LOOKUP_UNAVAILABLE")
  ) {
    return "Showing Abuja after location fallback";
  }

  return "Showing Abuja";
}

export function PublicDiscovery({
  title = "The Local Man",
  initialSearch = "",
}: PublicDiscoveryProps) {
  const [filters, setFilters] = useState<DiscoveryFilters>({
    ...defaultFilters,
    search: initialSearch,
  });
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [nearbyData, setNearbyData] = useState<NearbyVendorsResponseData | null>(null);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [isFetchingVendors, setIsFetchingVendors] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const nearbyRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const {
    status: locationStatus,
    location,
    errors: locationErrors,
    refresh: refreshLocation,
  } = useUserLocation();

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      nearbyRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    fetchPublicCategories()
      .then((nextCategories) => {
        if (!isActive) return;
        setCategories(nextCategories);
        setCategoryError(null);
      })
      .catch((error) => {
        if (!isActive) return;
        setCategories([]);
        setCategoryError(
          error instanceof Error ? error.message : "Unable to load categories.",
        );
      });

    return () => {
      isActive = false;
    };
  }, []);

  const loadNearbyVendors = useCallback(
    async (nextLocation: AcquiredUserLocation, nextFilters: DiscoveryFilters) => {
      const requestId = nearbyRequestIdRef.current + 1;
      nearbyRequestIdRef.current = requestId;
      setIsFetchingVendors(true);
      setNearbyError(null);

      try {
        const result = await fetchNearbyVendors(
          createNearbyFilters(nextLocation, nextFilters),
        );

        if (!isMountedRef.current || nearbyRequestIdRef.current !== requestId) {
          return;
        }

        setNearbyData(result);
        setSelectedVendorId((current) => {
          if (current && result.vendors.some((vendor) => vendor.vendor_id === current)) {
            return current;
          }

          return result.vendors[0]?.vendor_id ?? null;
        });
      } catch (error) {
        if (!isMountedRef.current || nearbyRequestIdRef.current !== requestId) {
          return;
        }

        setNearbyData(null);
        setSelectedVendorId(null);
        setNearbyError(
          error instanceof Error ? error.message : "Unable to load nearby vendors.",
        );
      } finally {
        if (isMountedRef.current && nearbyRequestIdRef.current === requestId) {
          setIsFetchingVendors(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (locationStatus !== "resolved" || !location) return;

    const timeout = window.setTimeout(() => {
      void loadNearbyVendors(location, filters);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [filters, loadNearbyVendors, location, locationStatus]);

  const vendors = useMemo(() => nearbyData?.vendors ?? [], [nearbyData]);
  const resolvedLocation = location ?? nearbyData?.location ?? null;
  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.vendor_id === selectedVendorId) ?? null,
    [selectedVendorId, vendors],
  );
  const isLoading = locationStatus === "resolving" || isFetchingVendors;
  const isApproximateDistance = nearbyData?.location.isApproximate ?? true;

  function applyFilters(nextFilters: DiscoveryFilters) {
    setFilters(nextFilters);
  }

  async function retryLocation() {
    try {
      const nextLocation = await refreshLocation();
      await loadNearbyVendors(nextLocation, filters);
    } catch (error) {
      setNearbyError(
        error instanceof Error ? error.message : "Unable to refresh location.",
      );
    }
  }

  return (
    <main className="public-shell">
      <section className="discovery-layout" aria-labelledby="discovery-title">
        <div className="discovery-sidebar">
          <div className="discovery-heading">
            <p className="eyebrow">Abuja pilot</p>
            <h1 id="discovery-title">{title}</h1>
            <p>Find nearby local food vendors and act quickly.</p>
          </div>

          <section className="location-panel" aria-live="polite">
            <div>
              <strong>{getLocationCopy(location, locationErrors)}</strong>
              <span>
                {resolvedLocation?.label ??
                  (locationStatus === "resolving"
                    ? "On mobile, precise location can take up to 10 seconds before Abuja fallback."
                    : "Location access starts automatically.")}
              </span>
            </div>
            <button
              className="button-secondary compact-button"
              disabled={locationStatus === "resolving"}
              type="button"
              onClick={() => void retryLocation()}
            >
              Retry location
            </button>
            {locationErrors.length > 0 ? (
              <p>
                {locationErrors.map((error) => formatLocationErrorMessage(error.code)).join(" ")}
              </p>
            ) : null}
          </section>

          <VendorFilters
            categories={categories}
            disabled={isLoading}
            filters={filters}
            onChange={applyFilters}
          />
          {categoryError ? <p className="runtime-note">{categoryError}</p> : null}

          <section className="vendor-results" aria-live="polite">
            <div className="result-heading">
              <strong>{vendors.length} vendors</strong>
              <span>{isLoading ? "Loading…" : "Nearest first"}</span>
            </div>
            {nearbyError ? <p className="runtime-error">{nearbyError}</p> : null}
            {!nearbyError && vendors.length === 0 && !isLoading ? (
              <p className="empty-state">No vendors matched this search.</p>
            ) : null}
            {vendors.map((vendor) => (
              <VendorCard
                approximateDistance={isApproximateDistance}
                key={vendor.vendor_id}
                selected={vendor.vendor_id === selectedVendorId}
                vendor={vendor}
                onSelect={setSelectedVendorId}
              />
            ))}
          </section>
        </div>

        <div className="discovery-main">
          {resolvedLocation ? (
            <VendorMap
              selectedVendorId={selectedVendorId}
              userLocation={resolvedLocation.coordinates}
              vendors={vendors}
              onSelectVendor={setSelectedVendorId}
            />
          ) : (
            <section className="discovery-map waiting-map">
              <strong>Resolving map location</strong>
            </section>
          )}

          <section className="selected-vendor-panel">
            <p className="eyebrow">Selected vendor</p>
            {selectedVendor ? (
              <>
                <h2>{selectedVendor.name}</h2>
                <p>{selectedVendor.short_description ?? "Local food vendor"}</p>
                <span className={selectedVendor.is_open_now ? "status-open" : "status-closed"}>
                  {selectedVendor.is_open_now ? "Open now" : "Closed"}
                </span>
              </>
            ) : (
              <>
                <h2>No vendor selected</h2>
                <p>Select a marker or vendor result.</p>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

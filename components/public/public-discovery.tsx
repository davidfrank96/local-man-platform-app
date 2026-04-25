"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useUserLocation } from "../../hooks/use-user-location.ts";
import type { AcquiredUserLocation } from "../../lib/location/acquisition.ts";
import type { LocationAcquisitionError } from "../../lib/location/acquisition.ts";
import type { LocationAcquisitionStatus } from "../../lib/location/acquisition.ts";
import { formatLocationCoordinates } from "../../lib/location/display.ts";
import type { LocationSource, PriceBand } from "../../types/index.ts";
import {
  fetchNearbyVendors,
  fetchPublicCategories,
  type PublicCategory,
} from "../../lib/vendors/public-api-client.ts";
import { formatVendorCardDistance } from "../../lib/vendors/card-display.ts";
import {
  getMillisecondsUntilNextPublicTimeTheme,
  getPublicTimeTheme,
  type PublicTimeTheme,
} from "../../lib/public/time-theme.ts";
import type { NearbyVendorsResponseData } from "../../types/index.ts";
import {
  VendorFilters,
  type DiscoveryFilters,
} from "./vendor-filters.tsx";
import { VendorActions } from "./vendor-actions.tsx";
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

type DiscoverySnapshot = {
  nearbyData: NearbyVendorsResponseData | null;
  selectedVendorSlug: string | null;
  scrollY: number;
};

function parseRadius(value: string | null): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultFilters.radiusKm;
}

function parseOpenNow(value: string | null): boolean {
  return value === "1" || value === "true";
}

function parsePriceBand(value: string | null): PriceBand | "" {
  return value === "budget" || value === "standard" || value === "premium" ? value : "";
}

function parseLocationSource(value: string | null): LocationSource | null {
  return value === "precise" || value === "approximate" || value === "default_city"
    ? value
    : null;
}

function parseDiscoveryUrlState(
  searchParams: URLSearchParams,
  initialSearch: string,
): {
  filters: DiscoveryFilters;
  selectedVendorSlug: string | null;
  locationSource: LocationSource | null;
} {
  return {
    filters: {
      search: searchParams.get("q")?.trim() || initialSearch,
      radiusKm: parseRadius(searchParams.get("radius_km")),
      openNow: parseOpenNow(searchParams.get("open_now")),
      priceBand: parsePriceBand(searchParams.get("price_band")),
      category: searchParams.get("category")?.trim() || "",
    },
    selectedVendorSlug: searchParams.get("selected")?.trim() || null,
    locationSource: parseLocationSource(searchParams.get("location_source")),
  };
}

function buildDiscoverySearchParams(
  filters: DiscoveryFilters,
  selectedVendorSlug: string | null,
  locationSource: LocationSource | null,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("q", filters.search);
  }

  if (filters.radiusKm !== defaultFilters.radiusKm) {
    params.set("radius_km", String(filters.radiusKm));
  }

  if (filters.openNow) {
    params.set("open_now", "1");
  }

  if (filters.priceBand) {
    params.set("price_band", filters.priceBand);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (selectedVendorSlug) {
    params.set("selected", selectedVendorSlug);
  }

  if (locationSource === "default_city") {
    params.set("location_source", locationSource);
  }

  return params;
}

function getDiscoverySnapshotKey(pathname: string, queryString: string): string {
  return `public-discovery:${pathname}${queryString ? `?${queryString}` : ""}`;
}

function buildVendorDetailHref(slug: string, returnTo: string): string {
  const params = new URLSearchParams();
  params.set("returnTo", returnTo);

  return `/vendors/${slug}?${params.toString()}`;
}

function buildDiscoveryReturnTo(
  pathname: string,
  filters: DiscoveryFilters,
  selectedVendorSlug: string | null,
  locationSource: LocationSource | null,
): string {
  const queryString = buildDiscoverySearchParams(
    filters,
    selectedVendorSlug,
    locationSource,
  ).toString();

  return `${pathname}${queryString ? `?${queryString}` : ""}`;
}

function readDiscoverySnapshot(key: string): DiscoverySnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(key);

    if (!raw) return null;

    return JSON.parse(raw) as DiscoverySnapshot;
  } catch {
    return null;
  }
}

function writeDiscoverySnapshot(key: string, snapshot: DiscoverySnapshot): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Ignore session storage failures.
  }
}

function shouldRestoreDiscoveryScroll(): boolean {
  const navigationEntry = performance
    .getEntriesByType("navigation")
    .at(0) as PerformanceNavigationTiming | undefined;

  if (navigationEntry?.type === "back_forward") {
    return true;
  }

  return /\/vendors\/[^/]+$/.test(document.referrer);
}

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
  locationStatus: LocationAcquisitionStatus,
  location: AcquiredUserLocation | null,
  locationErrors: LocationAcquisitionError[],
): string {
  if (locationStatus === "resolving" || locationStatus === "idle") {
    return "Trying to get precise location";
  }

  if (locationStatus === "precise" || location?.source === "precise") {
    return "Using your current location";
  }

  if (locationStatus === "approximate" || location?.source === "approximate") {
    return "Using approximate location";
  }

  if (
    locationErrors.some((error) => error.code === "GEOLOCATION_TIMEOUT") &&
    locationErrors.some((error) => error.code === "IP_LOOKUP_UNAVAILABLE")
  ) {
    return "Showing Abuja";
  }

  return "Showing Abuja";
}

function getLocationDetailCopy(
  locationStatus: LocationAcquisitionStatus,
  location: AcquiredUserLocation | null,
): string {
  switch (locationStatus) {
    case "resolving":
      return "On mobile, precise location can take up to 10 seconds before Abuja fallback.";
    case "precise":
      return location?.label ?? "Current location";
    case "approximate":
      return location?.label ?? "Approximate location";
    case "denied":
      return "Location access is off. Turn it on for vendors closer to you.";
    case "unavailable":
      return "Location access is off or unavailable. Turn it on for vendors closer to you.";
    case "default_city":
      return "Location access is off or unavailable. Turn it on for vendors closer to you.";
    case "error":
      return "Location could not be resolved.";
    default:
      return "Location access starts automatically.";
  }
}

function getLocationTrustLine(
  locationStatus: LocationAcquisitionStatus,
): string | null {
  if (locationStatus === "approximate") {
    return "Turn on location for better accuracy";
  }

  return null;
}

function getLocationDisplayLine(
  locationStatus: LocationAcquisitionStatus,
  location: AcquiredUserLocation | null,
  locationDisplayLabel: string | null,
): string {
  if (
    (locationStatus === "precise" || locationStatus === "approximate") &&
    location
  ) {
    return locationDisplayLabel ?? formatLocationCoordinates(location.coordinates);
  }

  return getLocationDetailCopy(locationStatus, location);
}

function getLocationErrorCopy(
  locationStatus: LocationAcquisitionStatus,
  locationErrors: LocationAcquisitionError[],
): string | null {
  if (
    locationStatus === "precise" ||
    locationStatus === "approximate" ||
    locationStatus === "idle" ||
    locationStatus === "resolving"
  ) {
    return null;
  }

  if (locationStatus === "denied") {
    if (locationErrors.some((error) => error.code === "IP_LOOKUP_UNAVAILABLE")) {
      return "Location access was denied and approximate location is unavailable.";
    }

    return "Location access was denied.";
  }

  if (locationStatus === "unavailable") {
    if (locationErrors.some((error) => error.code === "IP_LOOKUP_UNAVAILABLE")) {
      return "Precise location is unavailable and approximate location is unavailable.";
    }

    return "Precise location is unavailable.";
  }

  if (locationStatus === "default_city" && locationErrors.length > 0) {
    return locationErrors.map((error) => formatLocationErrorMessage(error.code)).join(" ");
  }

  return null;
}

export function PublicDiscovery({
  title = "The Local Man",
  initialSearch = "",
}: PublicDiscoveryProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsedUrlState = useMemo(
    () => parseDiscoveryUrlState(new URLSearchParams(searchParams.toString()), initialSearch),
    [initialSearch, searchParams],
  );
  const [filters, setFilters] = useState<DiscoveryFilters>(parsedUrlState.filters);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [nearbyData, setNearbyData] = useState<NearbyVendorsResponseData | null>(null);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [isFetchingVendors, setIsFetchingVendors] = useState(false);
  const [timeTheme, setTimeTheme] = useState<PublicTimeTheme | null>(null);
  const [resolvedLocationLabel, setResolvedLocationLabel] = useState<{
    key: string;
    label: string;
  } | null>(null);
  const [selectedVendorSlug, setSelectedVendorSlug] = useState<string | null>(
    parsedUrlState.selectedVendorSlug,
  );
  const [snapshotHydrated, setSnapshotHydrated] = useState(false);
  const nearbyRequestIdRef = useRef(0);
  const reverseGeocodeRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const hasRestoredScrollRef = useRef(false);
  const {
    status: locationStatus,
    location,
    errors: locationErrors,
    refresh: refreshLocation,
  } = useUserLocation();
  const urlLocationSource = parsedUrlState.locationSource;
  const activeLocationSource = location?.source ?? nearbyData?.location.source ?? urlLocationSource;
  const discoveryQueryString = useMemo(
    () =>
      buildDiscoverySearchParams(filters, selectedVendorSlug, activeLocationSource).toString(),
    [activeLocationSource, filters, selectedVendorSlug],
  );
  const filterFormKey = useMemo(
    () => JSON.stringify(filters),
    [filters],
  );
  const resolvedLocationKey = useMemo(() => {
    if (!location || location.source === "default_city") {
      return null;
    }

    return `${location.source}:${location.coordinates.lat}:${location.coordinates.lng}`;
  }, [location]);
  const discoverySnapshotKey = useMemo(
    () => getDiscoverySnapshotKey(pathname, discoveryQueryString),
    [discoveryQueryString, pathname],
  );
  const discoveryReturnTo = useMemo(
    () => buildDiscoveryReturnTo(pathname, filters, selectedVendorSlug, activeLocationSource),
    [activeLocationSource, filters, pathname, selectedVendorSlug],
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      nearbyRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    let timeoutId: number | null = null;

    function applyTimeTheme(now: Date) {
      setTimeTheme(getPublicTimeTheme(now));
      timeoutId = window.setTimeout(() => {
        applyTimeTheme(new Date());
      }, getMillisecondsUntilNextPublicTimeTheme(now));
    }

    applyTimeTheme(new Date());

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (!location || location.source === "default_city" || !resolvedLocationKey) {
      reverseGeocodeRequestIdRef.current += 1;
      return;
    }

    const requestId = reverseGeocodeRequestIdRef.current + 1;
    reverseGeocodeRequestIdRef.current = requestId;

    const timeout = window.setTimeout(() => {
      void fetch(
        `/api/location/reverse?lat=${location.coordinates.lat}&lng=${location.coordinates.lng}`,
      )
        .then(async (response) => {
          if (!response.ok) {
            return null;
          }

          const payload = (await response.json()) as {
            data?: { label?: string | null };
          };

          return payload.data?.label ?? null;
        })
        .then((label) => {
          if (
            !label ||
            !isMountedRef.current ||
            reverseGeocodeRequestIdRef.current !== requestId
          ) {
            return;
          }

          setResolvedLocationLabel({
            key: resolvedLocationKey,
            label,
          });
        })
        .catch(() => {
          // Keep coordinate fallback.
        });
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [location, resolvedLocationKey]);

  useEffect(() => {
    const nextQueryString = discoveryQueryString;
    const currentQueryString = searchParams.toString();

    if (nextQueryString === currentQueryString) {
      return;
    }

    router.replace(
      `${pathname}${nextQueryString ? `?${nextQueryString}` : ""}`,
      { scroll: false },
    );
  }, [discoveryQueryString, pathname, router, searchParams]);

  useEffect(() => {
    const snapshot = readDiscoverySnapshot(discoverySnapshotKey);

    if (!snapshot) {
      const timeout = window.setTimeout(() => {
        setSnapshotHydrated(true);
      }, 0);

      return () => {
        window.clearTimeout(timeout);
      };
    }

    const timeout = window.setTimeout(() => {
      setNearbyData(snapshot.nearbyData);
      setSelectedVendorSlug((current) => current ?? snapshot.selectedVendorSlug);
      setSnapshotHydrated(true);

      if (!hasRestoredScrollRef.current && shouldRestoreDiscoveryScroll()) {
        hasRestoredScrollRef.current = true;
        window.setTimeout(() => {
          window.scrollTo({ top: snapshot.scrollY, behavior: "auto" });
        }, 0);
      }
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [discoverySnapshotKey]);

  useEffect(() => {
    if (!snapshotHydrated) return;

    writeDiscoverySnapshot(discoverySnapshotKey, {
      nearbyData,
      selectedVendorSlug,
      scrollY: window.scrollY,
    });
  }, [discoverySnapshotKey, nearbyData, selectedVendorSlug, snapshotHydrated]);

  useEffect(() => {
    if (!snapshotHydrated) return;

    function persistScrollPosition() {
      const snapshot = readDiscoverySnapshot(discoverySnapshotKey) ?? {
        nearbyData,
        selectedVendorSlug,
        scrollY: 0,
      };

      writeDiscoverySnapshot(discoverySnapshotKey, {
        ...snapshot,
        nearbyData,
        selectedVendorSlug,
        scrollY: window.scrollY,
      });
    }

    window.addEventListener("scroll", persistScrollPosition, { passive: true });
    window.addEventListener("pagehide", persistScrollPosition);

    return () => {
      window.removeEventListener("scroll", persistScrollPosition);
      window.removeEventListener("pagehide", persistScrollPosition);
    };
  }, [discoverySnapshotKey, nearbyData, selectedVendorSlug, snapshotHydrated]);

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
        setSelectedVendorSlug((current) => {
          if (current && result.vendors.some((vendor) => vendor.slug === current)) {
            return current;
          }

          return result.vendors[0]?.slug ?? null;
        });
      } catch (error) {
        if (!isMountedRef.current || nearbyRequestIdRef.current !== requestId) {
          return;
        }

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
    if (
      locationStatus === "idle" ||
      locationStatus === "resolving" ||
      locationStatus === "error" ||
      !location
    ) {
      return;
    }

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
    () => vendors.find((vendor) => vendor.slug === selectedVendorSlug) ?? null,
    [selectedVendorSlug, vendors],
  );
  const selectedVendorId = selectedVendor?.vendor_id ?? null;
  const isLoading = locationStatus === "resolving" || isFetchingVendors;
  const isApproximateDistance = nearbyData?.location.isApproximate ?? true;
  const locationErrorCopy = getLocationErrorCopy(locationStatus, locationErrors);
  const locationTrustLine = getLocationTrustLine(locationStatus);
  const locationDisplayLabel =
    resolvedLocationKey && resolvedLocationLabel?.key === resolvedLocationKey
      ? resolvedLocationLabel.label
      : null;

  function applyFilters(nextFilters: DiscoveryFilters) {
    setFilters(nextFilters);
  }

  function selectVendorById(vendorId: string) {
    const vendor = vendors.find((entry) => entry.vendor_id === vendorId);

    setSelectedVendorSlug(vendor?.slug ?? null);
  }

  async function retryLocation() {
    setNearbyError(null);

    try {
      await refreshLocation();
    } catch (error) {
      setNearbyError(
        error instanceof Error ? error.message : "Unable to refresh location.",
      );
    }
  }

  return (
    <main
      className="public-shell"
      data-time-theme={timeTheme ?? undefined}
    >
      <section className="discovery-layout" aria-labelledby="discovery-title">
        <div className="discovery-sidebar">
          <div className="discovery-heading">
            <p className="eyebrow">Abuja pilot</p>
            <h1 id="discovery-title">{title}</h1>
            <p>Nearby local vendors. Act quickly.</p>
          </div>

          <section className="location-panel" aria-live="polite">
            <div>
              <strong>{getLocationCopy(locationStatus, location, locationErrors)}</strong>
              <span>{getLocationDisplayLine(locationStatus, location, locationDisplayLabel)}</span>
              {locationTrustLine ? (
                <span className="location-trust-line">{locationTrustLine}</span>
              ) : null}
            </div>
            <button
              className="button-secondary compact-button"
              disabled={locationStatus === "resolving"}
              type="button"
              onClick={() => void retryLocation()}
            >
              Retry location
            </button>
            {locationErrorCopy ? (
              <p>{locationErrorCopy}</p>
            ) : null}
          </section>

          <VendorFilters
            categories={categories}
            disabled={isLoading}
            filters={filters}
            key={filterFormKey}
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
                detailHref={buildVendorDetailHref(
                  vendor.slug,
                  buildDiscoveryReturnTo(
                    pathname,
                    filters,
                    vendor.slug,
                    activeLocationSource,
                  ),
                )}
                key={vendor.vendor_id}
                selected={vendor.slug === selectedVendorSlug}
                vendor={vendor}
                onSelect={selectVendorById}
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
              onSelectVendor={selectVendorById}
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
                <div className="selected-vendor-summary">
                  <p className="selected-vendor-status-line">
                    <span>
                      {formatVendorCardDistance(
                        selectedVendor.distance_km,
                        isApproximateDistance,
                      )}
                    </span>
                    <span aria-hidden="true">•</span>
                    <span
                      className={
                        selectedVendor.is_open_now
                          ? "selected-vendor-status-open"
                          : "selected-vendor-status-closed"
                      }
                    >
                      {selectedVendor.is_open_now ? "Open" : "Closed"}
                    </span>
                  </p>
                  <p className="selected-vendor-hours-line">
                    <span className="selected-vendor-label">Today:</span>{" "}
                    {selectedVendor.today_hours}
                  </p>
                  {selectedVendor.area ? (
                    <p className="selected-vendor-area-line">
                      <span className="selected-vendor-label">Area:</span>{" "}
                      {selectedVendor.area}
                    </p>
                  ) : null}
                </div>
                <div className="selected-vendor-actions">
                  <VendorActions
                    latitude={selectedVendor.latitude}
                    longitude={selectedVendor.longitude}
                    phoneNumber={selectedVendor.phone_number}
                  />
                  <Link
                    className="button-secondary compact-button"
                    href={buildVendorDetailHref(selectedVendor.slug, discoveryReturnTo)}
                  >
                    View details
                  </Link>
                </div>
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

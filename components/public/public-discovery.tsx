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
import {
  getPublicLocationDisplayModel,
} from "../../lib/location/display.ts";
import {
  ensurePublicTrackingSession,
  trackPublicUserAction,
} from "../../lib/public/user-action-tracking.ts";
import {
  createRetainedVendorPreview,
  readLastSelectedVendor,
  readRecentlyViewedVendors,
  rememberLastSelectedVendor,
  type RetainedVendorPreview,
} from "../../lib/public/vendor-retention.ts";
import type { LocationSource, PriceBand } from "../../types/index.ts";
import {
  fetchNearbyVendors,
  fetchPublicCategories,
  type PublicCategory,
} from "../../lib/vendors/public-api-client.ts";
import { formatVendorCardDistance } from "../../lib/vendors/card-display.ts";
import { getVendorOpenStateDisplay } from "../../lib/vendors/card-display.ts";
import {
  getPopularVendorIds,
  sortDiscoveryVendors,
} from "../../lib/vendors/discovery-ranking.ts";
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

type MobileVendorSection = "nearby" | "recent" | "popular";

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
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeMobileVendorSection, setActiveMobileVendorSection] =
    useState<MobileVendorSection>("nearby");
  const [snapshotHydrated, setSnapshotHydrated] = useState(false);
  const [recentlyViewedVendors, setRecentlyViewedVendors] = useState<RetainedVendorPreview[]>([]);
  const [lastSelectedVendorMemory, setLastSelectedVendorMemory] =
    useState<RetainedVendorPreview | null>(null);
  const nearbyRequestIdRef = useRef(0);
  const reverseGeocodeRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const hasRestoredScrollRef = useRef(false);
  const {
    status: locationStatus,
    location,
    refresh: refreshLocation,
  } = useUserLocation();
  const urlLocationSource = parsedUrlState.locationSource;
  const activeLocationSource = location?.source ?? nearbyData?.location.source ?? urlLocationSource;
  const discoveryQueryString = useMemo(
    () =>
      buildDiscoverySearchParams(filters, selectedVendorSlug, activeLocationSource).toString(),
    [activeLocationSource, filters, selectedVendorSlug],
  );
  const discoverySnapshotQueryString = useMemo(
    () =>
      buildDiscoverySearchParams(filters, null, activeLocationSource).toString(),
    [activeLocationSource, filters],
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
    () => getDiscoverySnapshotKey(pathname, discoverySnapshotQueryString),
    [discoverySnapshotQueryString, pathname],
  );
  const discoveryReturnTo = useMemo(
    () => buildDiscoveryReturnTo(pathname, filters, selectedVendorSlug, activeLocationSource),
    [activeLocationSource, filters, pathname, selectedVendorSlug],
  );

  const hydrateRetentionState = useCallback(() => {
    setRecentlyViewedVendors(readRecentlyViewedVendors());
    setLastSelectedVendorMemory(readLastSelectedVendor());
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      nearbyRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      hydrateRetentionState();
    }, 0);

    function refreshRetentionState() {
      hydrateRetentionState();
    }

    window.addEventListener("focus", refreshRetentionState);
    window.addEventListener("pageshow", refreshRetentionState);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", refreshRetentionState);
      window.removeEventListener("pageshow", refreshRetentionState);
    };
  }, [hydrateRetentionState]);

  useEffect(() => {
    void ensurePublicTrackingSession({
      page_path:
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : pathname,
      location_source: activeLocationSource ?? null,
    });
  }, [activeLocationSource, pathname]);

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

          if (
            lastSelectedVendorMemory &&
            result.vendors.some((vendor) => vendor.slug === lastSelectedVendorMemory.slug)
          ) {
            return lastSelectedVendorMemory.slug;
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
    [lastSelectedVendorMemory],
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

  const vendors = useMemo(
    () => sortDiscoveryVendors(nearbyData?.vendors ?? [], filters),
    [filters, nearbyData],
  );
  const popularVendorIds = useMemo(() => getPopularVendorIds(vendors), [vendors]);
  const popularVendors = useMemo(
    () => vendors.filter((vendor) => popularVendorIds.has(vendor.vendor_id)).slice(0, 3),
    [popularVendorIds, vendors],
  );
  const resolvedLocation = location ?? nearbyData?.location ?? null;
  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.slug === selectedVendorSlug) ?? null,
    [selectedVendorSlug, vendors],
  );
  const selectedVendorOpenState = useMemo(
    () => getVendorOpenStateDisplay(selectedVendor?.is_open_now),
    [selectedVendor?.is_open_now],
  );
  const selectedVendorId = selectedVendor?.vendor_id ?? null;
  const rememberedSelectedVendor = useMemo(
    () =>
      lastSelectedVendorMemory
        ? vendors.find((vendor) => vendor.slug === lastSelectedVendorMemory.slug) ?? null
        : null,
    [lastSelectedVendorMemory, vendors],
  );
  const isResolvingLocation = locationStatus === "resolving";
  const isLoading = isResolvingLocation || isFetchingVendors;
  const isApproximateDistance = nearbyData?.location.isApproximate ?? true;
  const locationDisplayLabel =
    resolvedLocationKey && resolvedLocationLabel?.key === resolvedLocationKey
      ? resolvedLocationLabel.label
      : null;
  const locationDisplay = useMemo(
    () =>
      getPublicLocationDisplayModel({
        status: locationStatus,
        location,
        resolvedLocationLabel: locationDisplayLabel,
      }),
    [location, locationDisplayLabel, locationStatus],
  );

  function applyFilters(nextFilters: DiscoveryFilters) {
    setFilters(nextFilters);
    setActiveMobileVendorSection("nearby");
    setDesktopFiltersOpen(false);
    setMobileFiltersOpen(false);
  }

  function selectVendorById(vendorId: string, source: "card" | "map" = "map") {
    const vendor = vendors.find((entry) => entry.vendor_id === vendorId);

    if (vendor) {
      trackPublicUserAction({
        event_type: "vendor_selected",
        vendor_id: vendor.vendor_id,
        location_source: activeLocationSource ?? null,
        vendor_slug: vendor.slug,
        page_path:
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : pathname,
        metadata: { source },
        filters: {},
      });
    }

    if (vendor) {
      const retainedVendor = createRetainedVendorPreview(vendor);
      rememberLastSelectedVendor(retainedVendor);
      setLastSelectedVendorMemory(retainedVendor);
    }

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

          <div className="desktop-discovery-filters">
            <VendorFilters
              categories={categories}
              filters={filters}
              key={`desktop-${filterFormKey}`}
              locationSource={activeLocationSource ?? null}
              panelOpen={desktopFiltersOpen}
              variant="desktopFloating"
              onChange={applyFilters}
              onTogglePanel={() => setDesktopFiltersOpen((current) => !current)}
            />
          </div>

          <section className="location-panel" aria-live="polite">
            <div>
              <strong>{locationDisplay.headline}</strong>
              {locationDisplay.detail ? (
                <span>{locationDisplay.detail}</span>
              ) : null}
              {locationDisplay.trustLine ? (
                <span className="location-trust-line">{locationDisplay.trustLine}</span>
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
          </section>
          {categoryError ? <p className="runtime-note">{categoryError}</p> : null}

          <section className="vendor-section-nav" aria-label="Vendor sections">
            <button
              aria-pressed={activeMobileVendorSection === "nearby"}
              className={
                activeMobileVendorSection === "nearby"
                  ? "vendor-section-tab active"
                  : "vendor-section-tab"
              }
              type="button"
              onClick={() => setActiveMobileVendorSection("nearby")}
            >
              Nearby
            </button>
            <button
              aria-pressed={activeMobileVendorSection === "recent"}
              className={
                activeMobileVendorSection === "recent"
                  ? "vendor-section-tab active"
                  : "vendor-section-tab"
              }
              type="button"
              onClick={() => setActiveMobileVendorSection("recent")}
            >
              Recent
            </button>
            <button
              aria-pressed={activeMobileVendorSection === "popular"}
              className={
                activeMobileVendorSection === "popular"
                  ? "vendor-section-tab active"
                  : "vendor-section-tab"
              }
              type="button"
              onClick={() => setActiveMobileVendorSection("popular")}
            >
              Popular
            </button>
          </section>

          <section
            aria-live="polite"
            className="vendor-results vendor-section-pane"
            data-mobile-active={activeMobileVendorSection === "nearby"}
          >
            <div className="result-heading">
              <strong>Nearby vendors</strong>
              <span>
                {isLoading
                  ? "Loading…"
                  : filters.search
                    ? "Best search matches first"
                    : filters.openNow
                      ? "Open now only"
                      : "Open now, then popular, then distance"}
              </span>
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
                isPopular={popularVendorIds.has(vendor.vendor_id)}
                locationSource={activeLocationSource ?? null}
                selected={vendor.slug === selectedVendorSlug}
                vendor={vendor}
                onSelect={selectVendorById}
              />
            ))}
          </section>

          <section
            className="retention-panel retention-panel-muted vendor-section-pane"
            data-mobile-active={activeMobileVendorSection === "recent"}
          >
            <div className="result-heading">
              <strong>Recently viewed vendors</strong>
              <span>
                {recentlyViewedVendors.length > 0
                  ? `${recentlyViewedVendors.length} saved`
                  : "No recent views yet"}
              </span>
            </div>
            {recentlyViewedVendors.length > 0 ? (
              <div className="retention-list">
                {recentlyViewedVendors.map((vendor) => (
                  <div key={vendor.vendor_id} className="retention-item">
                    <div className="retention-item-copy">
                      <strong>{vendor.name}</strong>
                      <span>
                        {vendor.area ?? "Area not set"} • Today: {vendor.today_hours}
                      </span>
                    </div>
                    <Link
                      className="button-secondary compact-button"
                      href={buildVendorDetailHref(vendor.slug, discoveryReturnTo)}
                    >
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="runtime-note">Viewed vendor details will appear here.</p>
            )}
          </section>

          <section
            className="retention-panel retention-panel-muted vendor-section-pane"
            data-mobile-active={activeMobileVendorSection === "popular"}
          >
            <div className="result-heading">
              <strong>Popular vendors near you</strong>
              <span>
                {popularVendors.length > 0 ? "Based on recent usage" : "No popularity signal yet"}
              </span>
            </div>
            {popularVendors.length > 0 ? (
              <div className="retention-list">
                {popularVendors.map((vendor) => (
                  <div key={vendor.vendor_id} className="retention-item">
                    <div className="retention-item-copy">
                      <strong>{vendor.name}</strong>
                      <span>
                        {formatVendorCardDistance(vendor.distance_km, isApproximateDistance)} •{" "}
                        Today: {vendor.today_hours}
                      </span>
                    </div>
                    <button
                      className="button-secondary compact-button"
                      type="button"
                      onClick={() => selectVendorById(vendor.vendor_id, "card")}
                    >
                      Preview
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="runtime-note">Popular nearby vendors will appear as usage builds.</p>
            )}
          </section>

          <section className="retention-panel retention-panel-muted retention-panel-secondary">
            <div className="result-heading">
              <strong>Last selected vendor</strong>
              <span>{lastSelectedVendorMemory ? "Saved on this device" : "No saved vendor yet"}</span>
            </div>
            {lastSelectedVendorMemory ? (
              <div className="retention-list">
                <div className="retention-item">
                  <div className="retention-item-copy">
                    <strong>{lastSelectedVendorMemory.name}</strong>
                    <span>
                      {lastSelectedVendorMemory.area ?? "Area not set"} • Today:{" "}
                      {lastSelectedVendorMemory.today_hours}
                    </span>
                  </div>
                  {rememberedSelectedVendor ? (
                    <button
                      className="button-secondary compact-button"
                      type="button"
                      onClick={() => selectVendorById(rememberedSelectedVendor.vendor_id, "card")}
                    >
                      Preview again
                    </button>
                  ) : (
                    <Link
                      className="button-secondary compact-button"
                      href={buildVendorDetailHref(lastSelectedVendorMemory.slug, discoveryReturnTo)}
                    >
                      View details
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <p className="runtime-note">Your last selected vendor will stay here.</p>
            )}
          </section>
        </div>

        <div className="discovery-main">
          <div className="mobile-map-stack">
            <div className="mobile-discovery-filters">
              <VendorFilters
                categories={categories}
                filters={filters}
                key={`mobile-${filterFormKey}`}
                locationSource={activeLocationSource ?? null}
                panelOpen={mobileFiltersOpen}
                variant="mobileFloating"
                onChange={applyFilters}
                onTogglePanel={() => setMobileFiltersOpen((current) => !current)}
              />
            </div>
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
          </div>

          <section className="selected-vendor-panel">
            <p className="eyebrow">Selected vendor</p>
            {selectedVendor ? (
              <>
                <h2>{selectedVendor.name}</h2>
                <div className="selected-vendor-summary">
                  <p className="selected-vendor-status-line">
                    <span className="selected-vendor-chip">
                      <span className="selected-vendor-chip-icon" aria-hidden="true">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M8 14s4-3.9 4-7A4 4 0 1 0 4 7c0 3.1 4 7 4 7Z" strokeLinejoin="round" />
                          <circle cx="8" cy="7" r="1.5" />
                        </svg>
                      </span>
                      {formatVendorCardDistance(
                        selectedVendor.distance_km,
                        isApproximateDistance,
                      )}
                    </span>
                    <span
                      className={
                        selectedVendorOpenState.toneClassName === "vendor-card-status-open"
                          ? "selected-vendor-chip selected-vendor-status-open"
                          : selectedVendorOpenState.toneClassName === "vendor-card-status-closed"
                            ? "selected-vendor-chip selected-vendor-status-closed"
                            : "selected-vendor-chip selected-vendor-status-unavailable"
                      }
                    >
                      <span className="selected-vendor-chip-icon" aria-hidden="true">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <circle cx="8" cy="8" r="5.5" />
                          <path d="M8 4.8v3.6l2.4 1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {selectedVendorOpenState.label}
                    </span>
                  </p>
                  <p className="selected-vendor-hours-line">
                    <span className="selected-vendor-summary-icon" aria-hidden="true">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <circle cx="8" cy="8" r="5.5" />
                        <path d="M8 4.8v3.6l2.4 1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="selected-vendor-label">Today:</span> {selectedVendor.today_hours}
                  </p>
                  {selectedVendor.area ? (
                    <p className="selected-vendor-area-line">
                      <span className="selected-vendor-summary-icon" aria-hidden="true">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M3 4h10" strokeLinecap="round" />
                          <path d="M3 8h10" strokeLinecap="round" />
                          <path d="M3 12h10" strokeLinecap="round" />
                        </svg>
                      </span>
                      <span className="selected-vendor-label">Area:</span> {selectedVendor.area}
                    </p>
                  ) : null}
                </div>
                <div className="selected-vendor-actions">
                  <VendorActions
                    latitude={selectedVendor.latitude}
                    longitude={selectedVendor.longitude}
                    phoneNumber={selectedVendor.phone_number}
                    source="selected_preview"
                    vendorId={selectedVendor.vendor_id}
                    vendorSlug={selectedVendor.slug}
                    locationSource={activeLocationSource ?? null}
                  />
                  <Link
                    className="button-secondary compact-button selected-vendor-detail-link"
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

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useUserLocation } from "../../hooks/use-user-location.ts";
import { useOnlineStatus } from "../../hooks/use-online-status.ts";
import type { AcquiredUserLocation } from "../../lib/location/acquisition.ts";
import { DEFAULT_CITY_LOCATION } from "../../lib/location/user-location.ts";
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
  hasValidVendorCoordinates,
  normalizeNearbyDiscoveryData,
} from "../../lib/public/vendor-normalization.ts";
import {
  getMillisecondsUntilNextPublicTimeTheme,
  getPublicTimeTheme,
  type PublicTimeTheme,
} from "../../lib/public/time-theme.ts";
import { endDevTimer, startDevTimer } from "../../lib/public/dev-performance.ts";
import type { NearbyVendorsResponseData } from "../../types/index.ts";
import {
  VendorFilters,
  type DiscoveryFilters,
} from "./vendor-filters.tsx";
import { VendorActions } from "./vendor-actions.tsx";
import { VendorCard } from "./vendor-card.tsx";
import { VendorMap } from "./vendor-map.tsx";
import type { VendorSelectionSource } from "./vendor-map-types.ts";

if (typeof window !== "undefined") {
  startDevTimer("first_render");
  startDevTimer("first_vendor_render");
}

type PublicDiscoveryProps = {
  title?: string;
  initialSearch?: string;
};

type VendorSection = "nearby" | "recent" | "popular" | "lastSelected";

const defaultFilters: DiscoveryFilters = {
  search: "",
  radiusKm: 10,
  openNow: false,
  priceBand: "",
  category: "",
};
const DEFAULT_CITY_BOOTSTRAP_DELAY_MS = 250;

type DiscoverySnapshot = {
  nearbyData: NearbyVendorsResponseData | null;
  selectedVendorId: string | null;
  selectedVendorSlug?: string | null;
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
    locationSource: parseLocationSource(searchParams.get("location_source")),
  };
}

function buildDiscoverySearchParams(
  filters: DiscoveryFilters,
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

  if (locationSource === "default_city") {
    params.set("location_source", locationSource);
  }

  return params;
}

function getDiscoverySnapshotKey(pathname: string, queryString: string): string {
  return `public-discovery:${pathname}${queryString ? `?${queryString}` : ""}`;
}

function buildVendorDetailHref(
  slug: string,
  returnTo: string,
  locationSource: LocationSource | null,
): string {
  const params = new URLSearchParams();
  params.set("returnTo", returnTo);
  if (locationSource) {
    params.set("location_source", locationSource);
  }

  return `/vendors/${slug}?${params.toString()}`;
}

function buildDiscoveryReturnTo(
  pathname: string,
  filters: DiscoveryFilters,
  locationSource: LocationSource | null,
): string {
  const queryString = buildDiscoverySearchParams(
    filters,
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

function resolveSnapshotSelectedVendorId(snapshot: DiscoverySnapshot): string | null {
  if (snapshot.selectedVendorId) {
    return snapshot.selectedVendorId;
  }

  if (!snapshot.selectedVendorSlug || !snapshot.nearbyData) {
    return null;
  }

  return (
    snapshot.nearbyData.vendors.find((vendor) => vendor.slug === snapshot.selectedVendorSlug)
      ?.vendor_id ?? null
  );
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

function buildNearbyRequestKey(
  location: Pick<AcquiredUserLocation, "source" | "coordinates">,
  filters: DiscoveryFilters,
): string {
  return JSON.stringify({
    source: location.source,
    lat: location.coordinates.lat,
    lng: location.coordinates.lng,
    search: filters.search,
    radiusKm: filters.radiusKm,
    openNow: filters.openNow,
    priceBand: filters.priceBand,
    category: filters.category,
  });
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
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectionActionToken, setSelectionActionToken] = useState(0);
  const [selectionSource, setSelectionSource] = useState<VendorSelectionSource>(null);
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeVendorSection, setActiveVendorSection] =
    useState<VendorSection>("nearby");
  const [showLocationReminder, setShowLocationReminder] = useState(true);
  const [snapshotHydrated, setSnapshotHydrated] = useState(false);
  const [browserReady, setBrowserReady] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [recentlyViewedVendors, setRecentlyViewedVendors] = useState<RetainedVendorPreview[]>([]);
  const [lastSelectedVendorMemory, setLastSelectedVendorMemory] =
    useState<RetainedVendorPreview | null>(null);
  const nearbyDataRef = useRef<NearbyVendorsResponseData | null>(null);
  const lastSelectedVendorMemoryRef = useRef<RetainedVendorPreview | null>(null);
  const preferredSelectedVendorIdRef = useRef<string | null>(null);
  const selectedVendorIdRef = useRef<string | null>(null);
  const selectionActionTokenRef = useRef(0);
  const selectionSourceRef = useRef<VendorSelectionSource>(null);
  const nearbyRequestIdRef = useRef(0);
  const nearbyRequestKeyRef = useRef<string | null>(null);
  const reverseGeocodeRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const hasRestoredScrollRef = useRef(false);
  const firstRenderTimerStateRef = useRef({
    firstRenderStarted: false,
    firstRenderEnded: false,
    nearbyStarted: false,
    nearbyEnded: false,
    vendorRenderStarted: false,
    vendorRenderEnded: false,
  });
  const isOnline = useOnlineStatus();
  const canUseNetwork = browserReady && isOnline;
  const {
    status: locationStatus,
    location,
    refresh: refreshLocation,
  } = useUserLocation({ auto: canUseNetwork });
  const urlLocationSource = parsedUrlState.locationSource;
  const activeLocationSource = location?.source ?? nearbyData?.location.source ?? urlLocationSource;
  const discoveryQueryString = useMemo(
    () =>
      buildDiscoverySearchParams(filters, activeLocationSource).toString(),
    [activeLocationSource, filters],
  );
  const discoverySnapshotQueryString = useMemo(
    () =>
      buildDiscoverySearchParams(filters, activeLocationSource).toString(),
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
  const fallbackDiscoverySnapshotKey = useMemo(
    () =>
      getDiscoverySnapshotKey(
        pathname,
        buildDiscoverySearchParams(filters, null).toString(),
      ),
    [filters, pathname],
  );
  const discoveryReturnTo = useMemo(
    () => buildDiscoveryReturnTo(pathname, filters, activeLocationSource),
    [activeLocationSource, filters, pathname],
  );
  const fallbackDiscoveryLocation = useMemo<AcquiredUserLocation>(
    () => ({
      source: "default_city",
      label: DEFAULT_CITY_LOCATION.label,
      coordinates: DEFAULT_CITY_LOCATION.coordinates,
      isApproximate: true,
      errors: [],
    }),
    [],
  );

  const hydrateRetentionState = useCallback(() => {
    setRecentlyViewedVendors(readRecentlyViewedVendors());
    setLastSelectedVendorMemory(readLastSelectedVendor());
  }, []);

  useEffect(() => {
    lastSelectedVendorMemoryRef.current = lastSelectedVendorMemory;
  }, [lastSelectedVendorMemory]);

  useEffect(() => {
    nearbyDataRef.current = nearbyData;
  }, [nearbyData]);

  useEffect(() => {
    selectedVendorIdRef.current = selectedVendorId;
  }, [selectedVendorId]);

  useEffect(() => {
    firstRenderTimerStateRef.current.firstRenderStarted = true;
    firstRenderTimerStateRef.current.vendorRenderStarted = true;
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setBrowserReady(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const recordSelectionIntent = useCallback((source: VendorSelectionSource) => {
    selectionSourceRef.current = source;
    setSelectionSource(source);
    selectionActionTokenRef.current += 1;
    setSelectionActionToken(selectionActionTokenRef.current);
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      nearbyRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (
      !firstRenderTimerStateRef.current.firstRenderStarted ||
      firstRenderTimerStateRef.current.firstRenderEnded
    ) {
      return;
    }

    endDevTimer("first_render");
    firstRenderTimerStateRef.current.firstRenderEnded = true;
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
    if (!canUseNetwork) {
      return;
    }

    void ensurePublicTrackingSession({
      page_path:
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : pathname,
      location_source: activeLocationSource ?? null,
    });
  }, [activeLocationSource, canUseNetwork, pathname]);

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
    const timeoutId = window.setTimeout(() => {
      setShowLocationReminder(false);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!canUseNetwork) {
      reverseGeocodeRequestIdRef.current += 1;
      return;
    }

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
  }, [canUseNetwork, location, resolvedLocationKey]);

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
    const snapshot =
      readDiscoverySnapshot(discoverySnapshotKey) ??
      readDiscoverySnapshot(fallbackDiscoverySnapshotKey);

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
      const snapshotSelectedVendorId = resolveSnapshotSelectedVendorId(snapshot);
      preferredSelectedVendorIdRef.current = snapshotSelectedVendorId;
      nearbyDataRef.current = snapshot.nearbyData;
      selectedVendorIdRef.current = snapshotSelectedVendorId;
      recordSelectionIntent("restore");
      setSelectedVendorId(snapshotSelectedVendorId);
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
  }, [discoverySnapshotKey, fallbackDiscoverySnapshotKey, recordSelectionIntent]);

  useEffect(() => {
    if (!snapshotHydrated) return;

    writeDiscoverySnapshot(discoverySnapshotKey, {
      nearbyData,
      selectedVendorId,
      scrollY: window.scrollY,
    });
    if (fallbackDiscoverySnapshotKey !== discoverySnapshotKey) {
      writeDiscoverySnapshot(fallbackDiscoverySnapshotKey, {
        nearbyData,
        selectedVendorId,
        scrollY: window.scrollY,
      });
    }
  }, [
    discoverySnapshotKey,
    fallbackDiscoverySnapshotKey,
    nearbyData,
    selectedVendorId,
    snapshotHydrated,
  ]);

  useEffect(() => {
    if (!snapshotHydrated) return;

    function persistScrollPosition() {
      const snapshot = readDiscoverySnapshot(discoverySnapshotKey) ?? {
        nearbyData: nearbyDataRef.current,
        selectedVendorId: selectedVendorIdRef.current,
        scrollY: 0,
      };

      writeDiscoverySnapshot(discoverySnapshotKey, {
        ...snapshot,
        nearbyData: nearbyDataRef.current,
        selectedVendorId: selectedVendorIdRef.current,
        scrollY: window.scrollY,
      });
      if (fallbackDiscoverySnapshotKey !== discoverySnapshotKey) {
        writeDiscoverySnapshot(fallbackDiscoverySnapshotKey, {
          ...snapshot,
          nearbyData: nearbyDataRef.current,
          selectedVendorId: selectedVendorIdRef.current,
          scrollY: window.scrollY,
        });
      }
    }

    window.addEventListener("scroll", persistScrollPosition, { passive: true });
    window.addEventListener("pagehide", persistScrollPosition);

    return () => {
      window.removeEventListener("scroll", persistScrollPosition);
      window.removeEventListener("pagehide", persistScrollPosition);
    };
  }, [
    discoverySnapshotKey,
    fallbackDiscoverySnapshotKey,
    nearbyData,
    selectedVendorId,
    snapshotHydrated,
  ]);

  useEffect(() => {
    function restorePreviewSelectionFromSnapshot() {
      const snapshot = readDiscoverySnapshot(discoverySnapshotKey);
      const fallbackSnapshot = readDiscoverySnapshot(fallbackDiscoverySnapshotKey);
      const restoredSnapshot = snapshot ?? fallbackSnapshot;

      if (!restoredSnapshot) {
        return;
      }

      const snapshotSelectedVendorId = resolveSnapshotSelectedVendorId(restoredSnapshot);
      preferredSelectedVendorIdRef.current = snapshotSelectedVendorId;
      nearbyDataRef.current = restoredSnapshot.nearbyData;
      selectedVendorIdRef.current = snapshotSelectedVendorId;
      recordSelectionIntent("restore");
      setSelectedVendorId(snapshotSelectedVendorId);
      setNearbyData((current) => current ?? restoredSnapshot.nearbyData);
    }

    window.addEventListener("pageshow", restorePreviewSelectionFromSnapshot);

    return () => {
      window.removeEventListener("pageshow", restorePreviewSelectionFromSnapshot);
    };
  }, [discoverySnapshotKey, fallbackDiscoverySnapshotKey, recordSelectionIntent]);

  useEffect(() => {
    if (!canUseNetwork) {
      return;
    }

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
  }, [canUseNetwork]);

  const loadNearbyVendors = useCallback(
    async (nextLocation: AcquiredUserLocation, nextFilters: DiscoveryFilters) => {
      const requestId = nearbyRequestIdRef.current + 1;
      nearbyRequestIdRef.current = requestId;
      setIsFetchingVendors(true);
      setNearbyError(null);

      if (!firstRenderTimerStateRef.current.nearbyStarted) {
        startDevTimer("nearby_api");
        firstRenderTimerStateRef.current.nearbyStarted = true;
      }

      try {
        const result = await fetchNearbyVendors(
          createNearbyFilters(nextLocation, nextFilters),
        );

        if (!isMountedRef.current || nearbyRequestIdRef.current !== requestId) {
          return;
        }

        setNearbyData(result);
        const nextSelectionSource =
          selectionSourceRef.current === "filter" ? "filter" : "restore";
        recordSelectionIntent(nextSelectionSource);
        setSelectedVendorId((current) => {
          const preferredSelectedVendorId = preferredSelectedVendorIdRef.current;

          if (
            preferredSelectedVendorId &&
            result.vendors.some((vendor) => vendor.vendor_id === preferredSelectedVendorId)
          ) {
            selectedVendorIdRef.current = preferredSelectedVendorId;
            return preferredSelectedVendorId;
          }

          if (current && result.vendors.some((vendor) => vendor.vendor_id === current)) {
            selectedVendorIdRef.current = current;
            return current;
          }

          const rememberedVendor = lastSelectedVendorMemoryRef.current;

          if (
            rememberedVendor &&
            result.vendors.some((vendor) => vendor.vendor_id === rememberedVendor.vendor_id)
          ) {
            selectedVendorIdRef.current = rememberedVendor.vendor_id;
            return rememberedVendor.vendor_id;
          }

          const fallbackVendorId = result.vendors[0]?.vendor_id ?? null;
          selectedVendorIdRef.current = fallbackVendorId;
          preferredSelectedVendorIdRef.current = fallbackVendorId;
          return fallbackVendorId;
        });
      } catch (error) {
        if (!isMountedRef.current || nearbyRequestIdRef.current !== requestId) {
          return;
        }

        nearbyRequestKeyRef.current = null;
        setNearbyError(
          error instanceof Error ? error.message : "Unable to load nearby vendors.",
        );
      } finally {
        if (
          firstRenderTimerStateRef.current.nearbyStarted &&
          !firstRenderTimerStateRef.current.nearbyEnded
        ) {
          endDevTimer("nearby_api");
          firstRenderTimerStateRef.current.nearbyEnded = true;
        }

        if (isMountedRef.current && nearbyRequestIdRef.current === requestId) {
          setIsFetchingVendors(false);
        }
      }
    },
    [recordSelectionIntent],
  );

  const activeFetchLocation = useMemo<AcquiredUserLocation | null>(() => {
    if (location) {
      return location;
    }

    if (nearbyData) {
      return {
        source: nearbyData.location.source,
        label: nearbyData.location.label,
        coordinates: nearbyData.location.coordinates,
        isApproximate: nearbyData.location.isApproximate,
        errors: [],
      };
    }

    if (locationStatus === "idle" || locationStatus === "resolving") {
      return fallbackDiscoveryLocation;
    }

    return null;
  }, [fallbackDiscoveryLocation, location, locationStatus, nearbyData]);

  useEffect(() => {
    if (!isOnline) {
      nearbyRequestKeyRef.current = null;
      return;
    }

    if (!snapshotHydrated) {
      return;
    }

    if (!canUseNetwork || !activeFetchLocation) {
      return;
    }

    const requestKey = buildNearbyRequestKey(activeFetchLocation, filters);

    if (nearbyRequestKeyRef.current === requestKey) {
      return;
    }

    if (
      !nearbyRequestKeyRef.current &&
      nearbyData &&
      buildNearbyRequestKey(
        {
          source: nearbyData.location.source,
          coordinates: nearbyData.location.coordinates,
        },
        filters,
      ) === requestKey
    ) {
      nearbyRequestKeyRef.current = requestKey;
      return;
    }

    const bootstrapDelayMs =
      !location &&
      !nearbyData &&
      activeFetchLocation.source === "default_city"
        ? DEFAULT_CITY_BOOTSTRAP_DELAY_MS
        : 0;

    const timeout = window.setTimeout(() => {
      nearbyRequestKeyRef.current = requestKey;
      void loadNearbyVendors(activeFetchLocation, filters);
    }, bootstrapDelayMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    activeFetchLocation,
    canUseNetwork,
    filters,
    isOnline,
    loadNearbyVendors,
    location,
    locationStatus,
    nearbyData,
    snapshotHydrated,
  ]);

  const vendors = useMemo(
    () => {
      const normalized = normalizeNearbyDiscoveryData(
        {
          location: nearbyData?.location ?? null,
          vendors: nearbyData?.vendors ?? [],
        },
        nearbyData?.location ?? null,
      ).vendors;

      return sortDiscoveryVendors(
        normalized as NearbyVendorsResponseData["vendors"],
        filters,
      ) as typeof normalized;
    },
    [filters, nearbyData],
  );
  const mappableVendors = useMemo(
    () => vendors.filter(hasValidVendorCoordinates),
    [vendors],
  );

  useEffect(() => {
    if (
      vendors.length === 0 ||
      !firstRenderTimerStateRef.current.vendorRenderStarted ||
      firstRenderTimerStateRef.current.vendorRenderEnded
    ) {
      return;
    }

    endDevTimer("first_vendor_render");
    firstRenderTimerStateRef.current.vendorRenderEnded = true;
  }, [vendors.length]);
  const vendorById = useMemo(
    () => new Map(vendors.map((vendor) => [vendor.vendor_id, vendor] as const)),
    [vendors],
  );
  const popularVendorIds = useMemo(
    () => getPopularVendorIds(vendors as NearbyVendorsResponseData["vendors"]),
    [vendors],
  );
  const popularVendors = useMemo(
    () => vendors.filter((vendor) => popularVendorIds.has(vendor.vendor_id)).slice(0, 3),
    [popularVendorIds, vendors],
  );
  const resolvedLocation = location ?? nearbyData?.location ?? null;
  const selectedVendor = useMemo(
    () => (selectedVendorId ? vendorById.get(selectedVendorId) ?? null : null),
    [selectedVendorId, vendorById],
  );
  const selectedVendorOpenState = useMemo(
    () => getVendorOpenStateDisplay(selectedVendor?.is_open_now),
    [selectedVendor?.is_open_now],
  );
  const rememberedSelectedVendor = useMemo(
    () =>
      lastSelectedVendorMemory
        ? vendorById.get(lastSelectedVendorMemory.vendor_id) ?? null
        : null,
    [lastSelectedVendorMemory, vendorById],
  );
  const isResolvingLocation = locationStatus === "resolving";
  const isLoading = canUseNetwork && (isResolvingLocation || isFetchingVendors);
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

  const applyFilters = useCallback((nextFilters: DiscoveryFilters) => {
    recordSelectionIntent("filter");
    setFilters(nextFilters);
    setActiveVendorSection("nearby");
    setDesktopFiltersOpen(false);
    setMobileFiltersOpen(false);
  }, [recordSelectionIntent]);

  const selectVendorById = useCallback((vendorId: string, source: "card" | "map" = "map") => {
    const vendor = vendorById.get(vendorId);
    recordSelectionIntent(source);

    if (vendor?.vendor_id === selectedVendorIdRef.current) {
      return;
    }

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
      const retainedVendor = createRetainedVendorPreview({
        vendor_id: vendor.vendor_id,
        slug: vendor.slug,
        name: vendor.name,
        area: vendor.area,
        today_hours: vendor.today_hours,
        is_open_now: vendor.is_open_now,
      });
      rememberLastSelectedVendor(retainedVendor);
      setLastSelectedVendorMemory(retainedVendor);
    }

    if (typeof window !== "undefined") {
      writeDiscoverySnapshot(discoverySnapshotKey, {
        nearbyData: nearbyDataRef.current,
        selectedVendorId: vendor?.vendor_id ?? null,
        scrollY: window.scrollY,
      });
    }

    preferredSelectedVendorIdRef.current = vendor?.vendor_id ?? null;
    selectedVendorIdRef.current = vendor?.vendor_id ?? null;
    setSelectedVendorId(vendor?.vendor_id ?? null);
  }, [activeLocationSource, discoverySnapshotKey, pathname, recordSelectionIntent, vendorById]);

  const retryLocation = useCallback(async () => {
    if (!isOnline) {
      setRetryMessage("Still offline");
      setNearbyError(null);
      return;
    }

    if (locationStatus === "resolving") {
      return;
    }

    setRetryMessage(null);
    setNearbyError(null);

    try {
      await refreshLocation();
    } catch (error) {
      setNearbyError(
        error instanceof Error ? error.message : "Unable to refresh location.",
      );
    }
  }, [isOnline, locationStatus, refreshLocation]);

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

          {showLocationReminder ? (
            <section
              className="location-reminder-toast"
              role="status"
              aria-live="polite"
            >
              <div className="location-reminder-copy">
                <span className="location-reminder-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M8 14s4-3.9 4-7A4 4 0 1 0 4 7c0 3.1 4 7 4 7Z" strokeLinejoin="round" />
                    <circle cx="8" cy="7" r="1.5" />
                  </svg>
                </span>
                <p>Turn on your location to find accurate vendors near you.</p>
              </div>
              <button
                aria-label="Close location reminder"
                className="location-reminder-close"
                type="button"
                onClick={() => setShowLocationReminder(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </section>
          ) : null}

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
              disabled={!isOnline || locationStatus === "resolving"}
              title={!isOnline ? "Reconnect to retry" : undefined}
              type="button"
              onClick={() => void retryLocation()}
            >
              Retry location
            </button>
          </section>
          {!isOnline ? (
            <section
              className="runtime-note"
              data-testid="offline-fallback"
              role="status"
              aria-live="polite"
            >
              You&apos;re offline. Showing the last known vendor list.
            </section>
          ) : null}
          {!isOnline && retryMessage ? <p className="runtime-note">{retryMessage}</p> : null}
          {categoryError ? <p className="runtime-note">{categoryError}</p> : null}

          <section className="desktop-vendor-section-nav" aria-label="Vendor sections">
            <button
              aria-pressed={activeVendorSection === "nearby"}
              className={
                activeVendorSection === "nearby"
                  ? "vendor-section-tab active"
                  : "vendor-section-tab"
              }
              type="button"
              onClick={() => setActiveVendorSection("nearby")}
            >
              Nearby
            </button>
            <button
              aria-pressed={activeVendorSection === "recent"}
              className={
                activeVendorSection === "recent"
                  ? "vendor-section-tab active"
                  : "vendor-section-tab"
              }
              type="button"
              onClick={() => setActiveVendorSection("recent")}
            >
              Recent
            </button>
            <button
              aria-pressed={activeVendorSection === "popular"}
              className={
                activeVendorSection === "popular"
                  ? "vendor-section-tab active"
                  : "vendor-section-tab"
              }
              type="button"
              onClick={() => setActiveVendorSection("popular")}
            >
              Popular
            </button>
            <button
              aria-pressed={activeVendorSection === "lastSelected"}
              className={
                activeVendorSection === "lastSelected"
                  ? "vendor-section-tab active"
                  : "vendor-section-tab"
              }
              type="button"
              onClick={() => setActiveVendorSection("lastSelected")}
            >
              Last selected
            </button>
          </section>

          <section className="vendor-section-nav" aria-label="Vendor sections">
            <button
              aria-pressed={activeVendorSection === "nearby"}
              className={
                activeVendorSection === "nearby"
                  ? "vendor-section-tab active"
                  : "vendor-section-tab"
              }
              type="button"
              onClick={() => setActiveVendorSection("nearby")}
            >
              Nearby
            </button>
            <button
              aria-pressed={activeVendorSection === "recent"}
              className={
                activeVendorSection === "recent"
                  ? "vendor-section-tab active"
                  : "vendor-section-tab"
              }
              type="button"
              onClick={() => setActiveVendorSection("recent")}
            >
              Recent
            </button>
            <button
              aria-pressed={activeVendorSection === "popular"}
              className={
                activeVendorSection === "popular"
                  ? "vendor-section-tab active"
                  : "vendor-section-tab"
              }
              type="button"
              onClick={() => setActiveVendorSection("popular")}
            >
              Popular
            </button>
          </section>

          <section
            aria-live="polite"
            className="vendor-results vendor-section-pane"
            data-desktop-active={activeVendorSection === "nearby"}
            data-mobile-active={activeVendorSection === "nearby"}
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
              <p className="empty-state">
                {isOnline
                  ? "No vendors matched this search."
                  : "No cached vendors available while offline."}
              </p>
            ) : null}
            {vendors.map((vendor) => (
              <VendorCard
                approximateDistance={isApproximateDistance}
                detailHref={buildVendorDetailHref(
                  vendor.slug,
                  buildDiscoveryReturnTo(pathname, filters, activeLocationSource),
                  activeLocationSource ?? null,
                )}
                key={vendor.vendor_id}
                isPopular={popularVendorIds.has(vendor.vendor_id)}
                locationSource={activeLocationSource ?? null}
                selected={vendor.vendor_id === selectedVendorId}
                vendor={vendor}
                onSelect={selectVendorById}
              />
            ))}
          </section>

          <section
            className="retention-panel retention-panel-muted vendor-section-pane"
            data-desktop-active={activeVendorSection === "recent"}
            data-mobile-active={activeVendorSection === "recent"}
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
                      href={buildVendorDetailHref(
                        vendor.slug,
                        discoveryReturnTo,
                        activeLocationSource ?? null,
                      )}
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
            data-desktop-active={activeVendorSection === "popular"}
            data-mobile-active={activeVendorSection === "popular"}
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

          <section
            className="retention-panel retention-panel-muted retention-panel-secondary"
            data-desktop-active={activeVendorSection === "lastSelected"}
          >
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
                      href={buildVendorDetailHref(
                        lastSelectedVendorMemory.slug,
                        discoveryReturnTo,
                        activeLocationSource ?? null,
                      )}
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
            <VendorMap
              selectionActionToken={selectionActionToken}
              selectionSource={selectionSource}
              selectedVendorId={selectedVendorId}
              timeTheme={timeTheme}
              userLocation={resolvedLocation?.coordinates ?? null}
              vendors={mappableVendors}
              onSelectVendor={selectVendorById}
            />
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
                        selectedVendor.distanceKm ?? selectedVendor.distance_km,
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
                    <span className="selected-vendor-label">Active hours:</span> {selectedVendor.today_hours}
                  </p>
                  <p className="selected-vendor-slug-line">
                    <span className="selected-vendor-summary-icon" aria-hidden="true">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M4 5.25h8" strokeLinecap="round" />
                        <path d="M4 8h8" strokeLinecap="round" />
                        <path d="M4 10.75h5.5" strokeLinecap="round" />
                      </svg>
                    </span>
                    <span className="selected-vendor-label">Slug:</span>{" "}
                    <span className="selected-vendor-slug-value">{selectedVendor.slug}</span>
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
                  {hasValidVendorCoordinates(selectedVendor) ? (
                    <VendorActions
                      latitude={selectedVendor.latitude}
                      longitude={selectedVendor.longitude}
                      phoneNumber={selectedVendor.phone_number}
                      source="selected_preview"
                      vendorId={selectedVendor.vendor_id}
                      vendorSlug={selectedVendor.slug}
                      locationSource={activeLocationSource ?? null}
                    />
                  ) : null}
                  <Link
                    className="button-secondary compact-button selected-vendor-detail-link"
                    href={buildVendorDetailHref(
                      selectedVendor.slug,
                      discoveryReturnTo,
                      activeLocationSource ?? null,
                    )}
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

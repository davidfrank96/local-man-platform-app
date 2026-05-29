"use client";

import Image from "next/image";
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
  applyStoredPublicDiscoveryInvalidationToRetention,
  clearPublicDiscoveryVendorCache,
  isPublicDiscoverySnapshotFresh,
  readPublicDiscoverySnapshot,
  shouldSkipPublicDiscoveryFetch,
  subscribeToPublicDiscoveryVendorInvalidation,
  writePublicDiscoverySnapshot,
} from "../../lib/public/discovery-cache.ts";
import {
  createRetainedVendorPreview,
  readLastSelectedVendor,
  readRecentlyViewedVendors,
  rememberLastSelectedVendor,
  type RetainedVendorPreview,
} from "../../lib/public/vendor-retention.ts";
import {
  buildDiscoveryReturnTo,
  buildDiscoverySearchParams,
  buildNearbyBaseDatasetKey,
  buildNearbyRequestKey,
  buildVendorDetailHref,
  createNearbyFilters,
  getDiscoverySnapshotKey,
  parseDiscoveryUrlState,
  resolveSnapshotSelectedVendorId,
  shouldRestoreDiscoveryScroll,
} from "../../lib/public/discovery-state.ts";
import {
  fetchNearbyVendors,
  fetchPublicCategories,
  type PublicCategory,
} from "../../lib/vendors/public-api-client.ts";
import {
  formatVendorCardDistance,
  getVendorCue,
  getVendorOpenStateDisplayFromSnapshot,
} from "../../lib/vendors/card-display.ts";
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
import {
  SelectedVendorPanel,
  VendorSectionTabs,
  type VendorSection,
} from "./public-discovery-sections.tsx";
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

type MobileDiscoveryTab = "home" | "map" | "about";
type MobileAboutSection = "using" | "mission" | "install" | "terms" | "privacy";
type DiscoveryEmptyStateCopy = {
  title: string;
  body: string;
};

const defaultFilters: DiscoveryFilters = {
  search: "",
  radiusKm: 10,
  openNow: false,
  priceBand: "",
  category: "",
};
const DEFAULT_CITY_BOOTSTRAP_DELAY_MS = 250;
const LOCALMAN_WEBSITE_URL =
  process.env.NEXT_PUBLIC_LOCALMAN_WEBSITE_URL ?? "https://localman.app";
const LOCALMAN_SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_LOCALMAN_SUPPORT_EMAIL ?? "support@localman.app";
const LOCALMAN_BRAND_ICON_SRC = "/branding/localman-brand-icon.png";

function isLocalmanBrandTitle(title: string): boolean {
  return title.trim().replace(/\s+/g, "").toLowerCase() === "localman";
}

function getDiscoveryEmptyStateCopy(
  filters: DiscoveryFilters,
  isOnline: boolean,
): DiscoveryEmptyStateCopy {
  if (!isOnline) {
    return {
      title: "No cached vendors available.",
      body: "Reconnect to refresh nearby vendors.",
    };
  }

  const hasSearch = filters.search.trim().length > 0;
  const hasTightRadius = filters.radiusKm < defaultFilters.radiusKm;
  const hasWideRadius = filters.radiusKm > defaultFilters.radiusKm;
  const hasOtherFilters = Boolean(filters.category || filters.priceBand || filters.openNow);

  if (hasSearch) {
    return {
      title: "Nothing matched your search.",
      body: hasTightRadius || hasOtherFilters
        ? "Try increasing your distance or clearing one filter."
        : "Try another vendor, dish, or area.",
    };
  }

  if (hasTightRadius) {
    return {
      title: "No vendors found nearby.",
      body: `No food spots found within ${filters.radiusKm} km yet. Try a wider distance.`,
    };
  }

  if (hasOtherFilters) {
    return {
      title: "No vendors found with these filters.",
      body: hasWideRadius
        ? "Try changing your search or clearing one filter."
        : "Try increasing your distance or changing your filters.",
    };
  }

  return {
    title: "No vendors found nearby.",
    body: "Try refreshing the map or checking another area.",
  };
}

export function PublicDiscovery({
  title = "Local Man",
  initialSearch = "",
}: PublicDiscoveryProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsedUrlState = useMemo(
    () =>
      parseDiscoveryUrlState(
        new URLSearchParams(searchParams.toString()),
        initialSearch,
        defaultFilters.radiusKm,
      ),
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
  const [mobileMapFiltersOpen, setMobileMapFiltersOpen] = useState(false);
  const [activeVendorSection, setActiveVendorSection] =
    useState<VendorSection>("nearby");
  const [activeMobileTab, setActiveMobileTab] =
    useState<MobileDiscoveryTab>("home");
  const [openMobileAboutSection, setOpenMobileAboutSection] =
    useState<MobileAboutSection | null>(null);
  const [mapRefreshToken, setMapRefreshToken] = useState(0);
  const [showLocationReminder, setShowLocationReminder] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [snapshotHydrated, setSnapshotHydrated] = useState(false);
  const [browserReady, setBrowserReady] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [recentlyViewedVendors, setRecentlyViewedVendors] = useState<RetainedVendorPreview[]>([]);
  const [lastSelectedVendorMemory, setLastSelectedVendorMemory] =
    useState<RetainedVendorPreview | null>(null);
  const showBrandLogo = isLocalmanBrandTitle(title);
  const nearbyDataRef = useRef<NearbyVendorsResponseData | null>(null);
  const nearbyDataUpdatedAtRef = useRef<string | null>(null);
  const nearbyDataRequestKeyRef = useRef<string | null>(null);
  const unsearchedNearbyDataCacheRef = useRef(new Map<string, {
    data: NearbyVendorsResponseData;
    requestKey: string;
    updatedAt: string;
  }>());
  const lastSelectedVendorMemoryRef = useRef<RetainedVendorPreview | null>(null);
  const preferredSelectedVendorIdRef = useRef<string | null>(null);
  const restoredSnapshotNeedsLiveFetchRef = useRef(false);
  const selectedVendorIdRef = useRef<string | null>(null);
  const selectionActionTokenRef = useRef(0);
  const selectionSourceRef = useRef<VendorSelectionSource>(null);
  const nearbyRequestIdRef = useRef(0);
  const nearbyRequestKeyRef = useRef<string | null>(null);
  const reverseGeocodeRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const hasRestoredScrollRef = useRef(false);
  const discoveryTopRef = useRef<HTMLElement | null>(null);
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
      buildDiscoverySearchParams(filters, activeLocationSource, defaultFilters.radiusKm).toString(),
    [activeLocationSource, filters],
  );
  const discoverySnapshotQueryString = useMemo(
    () =>
      buildDiscoverySearchParams(filters, activeLocationSource, defaultFilters.radiusKm).toString(),
    [activeLocationSource, filters],
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
        buildDiscoverySearchParams(filters, null, defaultFilters.radiusKm).toString(),
      ),
    [filters, pathname],
  );
  const discoveryReturnTo = useMemo(
    () => buildDiscoveryReturnTo(pathname, filters, activeLocationSource, defaultFilters.radiusKm),
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
    applyStoredPublicDiscoveryInvalidationToRetention();
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
      readPublicDiscoverySnapshot<NearbyVendorsResponseData>(discoverySnapshotKey) ??
      readPublicDiscoverySnapshot<NearbyVendorsResponseData>(fallbackDiscoverySnapshotKey);

    if (!snapshot) {
      const timeout = window.setTimeout(() => {
        restoredSnapshotNeedsLiveFetchRef.current = false;
        setSnapshotHydrated(true);
      }, 0);

      return () => {
        window.clearTimeout(timeout);
      };
    }

    const timeout = window.setTimeout(() => {
      const hasFreshNearbyData = isPublicDiscoverySnapshotFresh(snapshot);
      const restoredNearbyData = hasFreshNearbyData ? snapshot.nearbyData : null;
      nearbyDataUpdatedAtRef.current = hasFreshNearbyData
        ? snapshot.nearbyDataUpdatedAt ?? null
        : null;
      nearbyDataRequestKeyRef.current = hasFreshNearbyData
        ? snapshot.nearbyRequestKey ?? null
        : null;
      restoredSnapshotNeedsLiveFetchRef.current = Boolean(restoredNearbyData);
      setNearbyData(restoredNearbyData);
      const snapshotSelectedVendorId = resolveSnapshotSelectedVendorId(snapshot);
      preferredSelectedVendorIdRef.current = snapshotSelectedVendorId;
      nearbyDataRef.current = restoredNearbyData;
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

    writePublicDiscoverySnapshot(discoverySnapshotKey, {
      nearbyData,
      nearbyDataUpdatedAt: nearbyData ? nearbyDataUpdatedAtRef.current : null,
      nearbyRequestKey: nearbyData ? nearbyDataRequestKeyRef.current : null,
      selectedVendorId,
      scrollY: window.scrollY,
    });
    if (fallbackDiscoverySnapshotKey !== discoverySnapshotKey) {
      writePublicDiscoverySnapshot(fallbackDiscoverySnapshotKey, {
        nearbyData,
        nearbyDataUpdatedAt: nearbyData ? nearbyDataUpdatedAtRef.current : null,
        nearbyRequestKey: nearbyData ? nearbyDataRequestKeyRef.current : null,
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

    let scrollPersistFrameId = 0;

    function persistScrollPosition() {
      scrollPersistFrameId = 0;
      const snapshot = readPublicDiscoverySnapshot<NearbyVendorsResponseData>(discoverySnapshotKey) ?? {
        nearbyData: nearbyDataRef.current,
        nearbyDataUpdatedAt: nearbyDataUpdatedAtRef.current,
        nearbyRequestKey: nearbyDataRequestKeyRef.current,
        selectedVendorId: selectedVendorIdRef.current,
        scrollY: 0,
      };

      writePublicDiscoverySnapshot(discoverySnapshotKey, {
        ...snapshot,
        nearbyData: nearbyDataRef.current,
        nearbyDataUpdatedAt:
          nearbyDataRef.current ? (nearbyDataUpdatedAtRef.current ?? snapshot.nearbyDataUpdatedAt ?? null) : null,
        nearbyRequestKey: nearbyDataRef.current
          ? nearbyDataRequestKeyRef.current ?? snapshot.nearbyRequestKey ?? null
          : null,
        selectedVendorId: selectedVendorIdRef.current,
        scrollY: window.scrollY,
      });
      if (fallbackDiscoverySnapshotKey !== discoverySnapshotKey) {
        writePublicDiscoverySnapshot(fallbackDiscoverySnapshotKey, {
          ...snapshot,
          nearbyData: nearbyDataRef.current,
          nearbyDataUpdatedAt:
            nearbyDataRef.current ? (nearbyDataUpdatedAtRef.current ?? snapshot.nearbyDataUpdatedAt ?? null) : null,
          nearbyRequestKey: nearbyDataRef.current
            ? nearbyDataRequestKeyRef.current ?? snapshot.nearbyRequestKey ?? null
            : null,
          selectedVendorId: selectedVendorIdRef.current,
          scrollY: window.scrollY,
        });
      }
    }

    function scheduleScrollPositionPersist() {
      if (scrollPersistFrameId !== 0) {
        return;
      }

      scrollPersistFrameId = window.requestAnimationFrame(persistScrollPosition);
    }

    function persistScrollPositionImmediately() {
      if (scrollPersistFrameId !== 0) {
        window.cancelAnimationFrame(scrollPersistFrameId);
        scrollPersistFrameId = 0;
      }

      persistScrollPosition();
    }

    window.addEventListener("scroll", scheduleScrollPositionPersist, { passive: true });
    window.addEventListener("pagehide", persistScrollPositionImmediately);

    return () => {
      window.removeEventListener("scroll", scheduleScrollPositionPersist);
      window.removeEventListener("pagehide", persistScrollPositionImmediately);
      if (scrollPersistFrameId !== 0) {
        window.cancelAnimationFrame(scrollPersistFrameId);
      }
    };
  }, [
    discoverySnapshotKey,
    fallbackDiscoverySnapshotKey,
    snapshotHydrated,
  ]);

  useEffect(() => {
    function restorePreviewSelectionFromSnapshot(event: PageTransitionEvent) {
      if (!event.persisted && !shouldRestoreDiscoveryScroll()) {
        return;
      }

      const snapshot = readPublicDiscoverySnapshot<NearbyVendorsResponseData>(discoverySnapshotKey);
      const fallbackSnapshot = readPublicDiscoverySnapshot<NearbyVendorsResponseData>(fallbackDiscoverySnapshotKey);
      const restoredSnapshot = snapshot ?? fallbackSnapshot;

      if (!restoredSnapshot) {
        return;
      }

      const hasFreshNearbyData = isPublicDiscoverySnapshotFresh(restoredSnapshot);
      const restoredNearbyData = hasFreshNearbyData ? restoredSnapshot.nearbyData : null;
      const snapshotSelectedVendorId = resolveSnapshotSelectedVendorId(restoredSnapshot);
      preferredSelectedVendorIdRef.current = snapshotSelectedVendorId;
      selectedVendorIdRef.current = snapshotSelectedVendorId;
      recordSelectionIntent("restore");
      setSelectedVendorId(snapshotSelectedVendorId);
      if (restoredNearbyData && !nearbyDataRef.current) {
        nearbyDataRef.current = restoredNearbyData;
        nearbyDataUpdatedAtRef.current = restoredSnapshot.nearbyDataUpdatedAt ?? null;
        nearbyDataRequestKeyRef.current = restoredSnapshot.nearbyRequestKey ?? null;
        restoredSnapshotNeedsLiveFetchRef.current = true;
        setNearbyData(restoredNearbyData);
      }
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

        nearbyDataUpdatedAtRef.current = new Date().toISOString();
        nearbyDataRequestKeyRef.current = buildNearbyRequestKey(nextLocation, nextFilters);
        if (nextFilters.search.trim().length === 0) {
          unsearchedNearbyDataCacheRef.current.set(
            buildNearbyBaseDatasetKey(nextLocation, nextFilters),
            {
              data: result,
              requestKey: nearbyDataRequestKeyRef.current,
              updatedAt: nearbyDataUpdatedAtRef.current,
            },
          );
        }
        restoredSnapshotNeedsLiveFetchRef.current = false;
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

    return fallbackDiscoveryLocation;
  }, [fallbackDiscoveryLocation, location, nearbyData]);

  useEffect(() => {
    if (!snapshotHydrated) {
      return;
    }

    return subscribeToPublicDiscoveryVendorInvalidation(() => {
      clearPublicDiscoveryVendorCache();
      hydrateRetentionState();
      nearbyDataUpdatedAtRef.current = null;
      nearbyDataRequestKeyRef.current = null;
      nearbyRequestKeyRef.current = null;
      restoredSnapshotNeedsLiveFetchRef.current = true;

      if (canUseNetwork && isOnline && activeFetchLocation) {
        nearbyRequestKeyRef.current = buildNearbyRequestKey(activeFetchLocation, filters);
        void loadNearbyVendors(activeFetchLocation, filters);
      }
    });
  }, [
    activeFetchLocation,
    canUseNetwork,
    filters,
    hydrateRetentionState,
    isOnline,
    loadNearbyVendors,
    snapshotHydrated,
  ]);

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
    const restoredNearbyDataRequestKey = nearbyData
      ? nearbyDataRequestKeyRef.current
      : null;

    if (shouldSkipPublicDiscoveryFetch({
      existingRequestKey: nearbyRequestKeyRef.current,
      nextRequestKey: requestKey,
      restoredNearbyDataRequestKey,
      requiresAuthoritativeFetch: restoredSnapshotNeedsLiveFetchRef.current,
    })) {
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
      const radiusMatched = normalized.filter((vendor) => vendor.distance_km <= filters.radiusKm);

      return sortDiscoveryVendors(
        radiusMatched as NearbyVendorsResponseData["vendors"],
        filters,
      ) as typeof radiusMatched;
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mobileMediaQuery = window.matchMedia("(max-width: 767px)");
    let frameId = 0;

    const updateVisibility = () => {
      frameId = 0;
      const nextVisible = mobileMediaQuery.matches && window.scrollY > 300;

      setShowBackToTop((current) => (current === nextVisible ? current : nextVisible));
    };

    const scheduleUpdate = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(updateVisibility);
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    mobileMediaQuery.addEventListener("change", scheduleUpdate);
    updateVisibility();

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      mobileMediaQuery.removeEventListener("change", scheduleUpdate);
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useEffect(() => {
    if (activeMobileTab !== "map" || typeof window === "undefined") {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      recordSelectionIntent(selectionSourceRef.current ?? "restore");
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeMobileTab, recordSelectionIntent]);

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
    () =>
      getVendorOpenStateDisplayFromSnapshot({
        isOpenNow: selectedVendor?.is_open_now,
        todayHours: selectedVendor?.today_hours,
      }),
    [selectedVendor?.is_open_now, selectedVendor?.today_hours],
  );
  const selectedVendorCue = useMemo(
    () => (selectedVendor ? getVendorCue(selectedVendor) : null),
    [selectedVendor],
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
  const showNearbyEmptyState =
    snapshotHydrated &&
    vendors.length === 0 &&
    !isLoading &&
    !nearbyError;
  const showMapEmptyState =
    snapshotHydrated &&
    mappableVendors.length === 0 &&
    !isLoading &&
    !nearbyError;
  const emptyStateCopy = useMemo(
    () => getDiscoveryEmptyStateCopy(filters, isOnline),
    [filters, isOnline],
  );
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

  const applyFilters = useCallback((nextFilters: DiscoveryFilters, options?: {
    keepPanelsOpen?: boolean;
  }) => {
    recordSelectionIntent("filter");
    if (
      filters.search.trim().length > 0 &&
      nextFilters.search.trim().length === 0 &&
      activeFetchLocation
    ) {
      const cachedUnsearchedData = unsearchedNearbyDataCacheRef.current.get(
        buildNearbyBaseDatasetKey(activeFetchLocation, nextFilters),
      );

      if (cachedUnsearchedData) {
        nearbyDataRef.current = cachedUnsearchedData.data;
        nearbyDataUpdatedAtRef.current = cachedUnsearchedData.updatedAt;
        nearbyDataRequestKeyRef.current = cachedUnsearchedData.requestKey;
        setNearbyData(cachedUnsearchedData.data);
      }
    }
    setFilters(nextFilters);
    setActiveVendorSection("nearby");
    if (!options?.keepPanelsOpen) {
      setDesktopFiltersOpen(false);
      setMobileFiltersOpen(false);
      setMobileMapFiltersOpen(false);
    }
  }, [activeFetchLocation, filters.search, recordSelectionIntent]);

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
      writePublicDiscoverySnapshot(discoverySnapshotKey, {
        nearbyData: nearbyDataRef.current,
        nearbyDataUpdatedAt: nearbyDataRef.current ? nearbyDataUpdatedAtRef.current : null,
        nearbyRequestKey: nearbyDataRef.current ? nearbyDataRequestKeyRef.current : null,
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

  const refreshMapDiscovery = useCallback(async () => {
    if (!isOnline) {
      setRetryMessage("Still offline");
      setNearbyError(null);
      return;
    }

    if (!activeFetchLocation || isFetchingVendors || locationStatus === "resolving") {
      return;
    }

    setRetryMessage(null);
    setNearbyError(null);
    nearbyRequestKeyRef.current = null;
    restoredSnapshotNeedsLiveFetchRef.current = false;
    setMapRefreshToken((current) => current + 1);
    recordSelectionIntent(selectionSourceRef.current ?? "restore");

    await loadNearbyVendors(activeFetchLocation, filters);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("resize"));
    }
  }, [
    activeFetchLocation,
    filters,
    isFetchingVendors,
    isOnline,
    loadNearbyVendors,
    locationStatus,
    recordSelectionIntent,
  ]);

  const scrollToDiscoveryTop = useCallback(() => {
    discoveryTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  return (
    <main
      className="public-shell public-discovery-shell"
      data-time-theme={timeTheme ?? undefined}
    >
      <section
        ref={discoveryTopRef}
        className="discovery-layout"
        data-mobile-tab={activeMobileTab}
        aria-labelledby="discovery-title"
      >
        <div className="discovery-sidebar">
          <div
            className={
              showBrandLogo
                ? "discovery-heading discovery-heading-branded"
                : "discovery-heading"
            }
          >
            <p className="eyebrow">Abuja pilot</p>
            <span className="discovery-notification-button" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M5.7 8.3a4.3 4.3 0 0 1 8.6 0v3.4l1.2 2H4.5l1.2-2V8.3Z" strokeLinejoin="round" />
                <path d="M8.4 15.6a1.8 1.8 0 0 0 3.2 0" strokeLinecap="round" />
              </svg>
              <span />
            </span>
            <h1 id="discovery-title">
              {showBrandLogo ? (
                <span className="discovery-brand-title">
                  <span className="discovery-brand-icon" aria-hidden="true">
                    <Image
                      alt=""
                      className="discovery-brand-logo"
                      height={512}
                      priority
                      sizes="(max-width: 767px) 44px, 72px"
                      src={LOCALMAN_BRAND_ICON_SRC}
                      width={512}
                    />
                  </span>
                  <span>{title}</span>
                </span>
              ) : (
                title
              )}
            </h1>
            <p>Find Local Food Vendors Near You.</p>
          </div>

          <div className="desktop-discovery-filters">
            <VendorFilters
              categories={categories}
              filters={filters}
              locationSource={activeLocationSource ?? null}
              panelOpen={desktopFiltersOpen}
              variant="desktopFloating"
              onChange={applyFilters}
              onTogglePanel={() => setDesktopFiltersOpen((current) => !current)}
            />
          </div>

          <div className="mobile-discovery-filters" data-testid="mobile-home-filters">
            <VendorFilters
              categories={categories}
              filters={filters}
              locationSource={activeLocationSource ?? null}
              panelOpen={mobileFiltersOpen}
              variant="mobileFloating"
              onChange={applyFilters}
              onTogglePanel={() => setMobileFiltersOpen((current) => !current)}
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
            <span className="location-panel-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 21s6-5.5 6-11a6 6 0 1 0-12 0c0 5.5 6 11 6 11Z" fill="currentColor" fillOpacity="0.14" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.2" fill="currentColor" stroke="none" />
              </svg>
            </span>
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

          <VendorSectionTabs
            activeVendorSection={activeVendorSection}
            className="desktop-vendor-section-nav"
            onChange={setActiveVendorSection}
          />

          <VendorSectionTabs
            activeVendorSection={activeVendorSection}
            className="vendor-section-nav"
            onChange={setActiveVendorSection}
          />

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
                    ? "Open matching vendors nearest first"
                    : filters.openNow
                      ? "Open now nearest first"
                      : "Open now, then nearest vendors"}
              </span>
            </div>
            {nearbyError ? <p className="runtime-error">{nearbyError}</p> : null}
            {showNearbyEmptyState ? (
              <div className="empty-state discovery-empty-state" data-testid="discovery-empty-state">
                <strong>{emptyStateCopy.title}</strong>
                <p>{emptyStateCopy.body}</p>
              </div>
            ) : null}
            {vendors.map((vendor) => (
              <VendorCard
                approximateDistance={isApproximateDistance}
                detailHref={buildVendorDetailHref(
                  vendor.slug,
                  buildDiscoveryReturnTo(
                    pathname,
                    filters,
                    activeLocationSource,
                    defaultFilters.radiusKm,
                  ),
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
                      className="button-secondary compact-button retention-desktop-action"
                      type="button"
                      onClick={() => selectVendorById(vendor.vendor_id, "card")}
                    >
                      Preview
                    </button>
                    <Link
                      className="button-secondary compact-button retention-mobile-action"
                      href={buildVendorDetailHref(
                        vendor.slug,
                        discoveryReturnTo,
                        activeLocationSource ?? null,
                      )}
                      onClick={() => selectVendorById(vendor.vendor_id, "card")}
                    >
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="runtime-note">Popular nearby vendors will appear as usage builds.</p>
            )}
          </section>

          <section
            className="retention-panel retention-panel-muted retention-panel-secondary vendor-section-pane"
            data-desktop-active={activeVendorSection === "lastSelected"}
            data-mobile-active={activeVendorSection === "lastSelected"}
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
                    <>
                      <button
                        className="button-secondary compact-button retention-desktop-action"
                        type="button"
                        onClick={() => selectVendorById(rememberedSelectedVendor.vendor_id, "card")}
                      >
                        Preview again
                      </button>
                      <Link
                        className="button-secondary compact-button retention-mobile-action"
                        href={buildVendorDetailHref(
                          rememberedSelectedVendor.slug,
                          discoveryReturnTo,
                          activeLocationSource ?? null,
                        )}
                        onClick={() => selectVendorById(rememberedSelectedVendor.vendor_id, "card")}
                      >
                        Open
                      </Link>
                    </>
                  ) : (
                    <Link
                      className="button-secondary compact-button"
                      href={buildVendorDetailHref(
                        lastSelectedVendorMemory.slug,
                        discoveryReturnTo,
                        activeLocationSource ?? null,
                      )}
                    >
                      <span className="retention-desktop-label">View details</span>
                      <span className="retention-mobile-label">Open</span>
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
            <div className="mobile-map-discovery-filters" data-testid="mobile-map-filters">
              <VendorFilters
                categories={categories}
                filters={filters}
                locationSource={activeLocationSource ?? null}
                panelOpen={mobileMapFiltersOpen}
                variant="mobileFloating"
                onChange={applyFilters}
                onTogglePanel={() => setMobileMapFiltersOpen((current) => !current)}
              />
            </div>
            <VendorMap
              key={mapRefreshToken}
              selectionActionToken={selectionActionToken}
              selectionSource={selectionSource}
              selectedVendorId={selectedVendorId}
              timeTheme={timeTheme}
              userLocation={resolvedLocation?.coordinates ?? null}
              vendors={mappableVendors}
              onSelectVendor={selectVendorById}
            />
            <button
              className="mobile-map-refresh-button"
              data-testid="mobile-map-refresh"
              disabled={!isOnline || isFetchingVendors || locationStatus === "resolving"}
              type="button"
              onClick={() => void refreshMapDiscovery()}
            >
              {isFetchingVendors ? "Refreshing…" : "Refresh map"}
            </button>
            {showMapEmptyState ? (
              <div
                className="mobile-map-empty-state"
                data-testid="mobile-map-empty-state"
                role="status"
                aria-live="polite"
              >
                <strong>{emptyStateCopy.title}</strong>
                <p>{emptyStateCopy.body}</p>
              </div>
            ) : null}
          </div>

          <SelectedVendorPanel
            activeLocationSource={activeLocationSource ?? null}
            discoveryReturnTo={discoveryReturnTo}
            isApproximateDistance={isApproximateDistance}
            selectedVendor={selectedVendor}
            selectedVendorCue={selectedVendorCue}
            selectedVendorOpenState={selectedVendorOpenState}
          />
        </div>
        <section
          className="mobile-about-view"
          data-testid="mobile-about-view"
          aria-labelledby="mobile-about-title"
        >
          <p className="eyebrow">About Localman</p>
          <h2 id="mobile-about-title">Find useful vendors near you.</h2>
          <p>
            Localman helps you search nearby food and everyday vendors, compare who is open,
            preview them on the map, and open details for calls or directions.
          </p>
          <div className="mobile-about-card">
            <strong>How to use it</strong>
            <p>Search or filter vendors on Home, switch to Map for location context, then open a vendor for details.</p>
          </div>
          <div className="mobile-about-card">
            <strong>Support</strong>
            <p>
              Need help or want to list a vendor? Email{" "}
              <a href={`mailto:${LOCALMAN_SUPPORT_EMAIL}`}>{LOCALMAN_SUPPORT_EMAIL}</a>.
            </p>
            <a href={LOCALMAN_WEBSITE_URL} rel="noreferrer" target="_blank">
              Visit Localman
            </a>
          </div>
          <div className="mobile-about-legal" aria-label="Localman information">
            <p className="mobile-about-legal-note">
              These summaries are provided to explain how Localman works. They may be
              updated as the platform grows.
            </p>
            <div className="mobile-about-legal-accordion">
              <section className="mobile-about-legal-section">
                <button
                  aria-controls="mobile-about-using-content"
                  aria-expanded={openMobileAboutSection === "using"}
                  className="mobile-about-legal-trigger"
                  data-testid="mobile-about-using-toggle"
                  type="button"
                  onClick={() =>
                    setOpenMobileAboutSection((current) =>
                      current === "using" ? null : "using",
                    )
                  }
                >
                  <span>Using Localman</span>
                  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <path
                      d="m5.5 7.5 4.5 4.5 4.5-4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
                <div
                  className="mobile-about-legal-content"
                  data-testid="mobile-about-using-content"
                  hidden={openMobileAboutSection !== "using"}
                  id="mobile-about-using-content"
                >
                  <h3>Discover vendors</h3>
                  <p>
                    Use Home to browse nearby vendors. Search by vendor name, filter
                    results, adjust your search radius, and open vendor profiles when
                    you need more details.
                  </p>
                  <h3>Use the map</h3>
                  <p>
                    Switch to Map for location context. Refresh the map when you need
                    updated nearby results, then tap vendors from the map or list views.
                  </p>
                  <h3>Check vendor details</h3>
                  <p>
                    Vendor profiles show useful information, direct call links,
                    directions, sharing, and rating options.
                  </p>
                  <h3>Request a rider</h3>
                  <p>
                    When you need delivery help, complete the rider request form and
                    choose from available riders. Suggestions depend on rider
                    availability, and WhatsApp is used to coordinate directly with the
                    selected rider.
                  </p>
                  <h3>Share ratings</h3>
                  <p>
                    Rate your experience and add optional rating signals when they fit.
                    Your feedback helps improve discovery quality.
                  </p>
                </div>
              </section>
              <section className="mobile-about-legal-section">
                <button
                  aria-controls="mobile-about-mission-content"
                  aria-expanded={openMobileAboutSection === "mission"}
                  className="mobile-about-legal-trigger"
                  data-testid="mobile-about-mission-toggle"
                  type="button"
                  onClick={() =>
                    setOpenMobileAboutSection((current) =>
                      current === "mission" ? null : "mission",
                    )
                  }
                >
                  <span>Why Localman Exists</span>
                  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <path
                      d="m5.5 7.5 4.5 4.5 4.5-4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
                <div
                  className="mobile-about-legal-content"
                  data-testid="mobile-about-mission-content"
                  hidden={openMobileAboutSection !== "mission"}
                  id="mobile-about-mission-content"
                >
                  <h3>Discover local</h3>
                  <p>
                    Localman exists to help people discover useful local vendors around
                    them, from structured businesses to informal businesses, roadside
                    vendors, and local service providers.
                  </p>
                  <h3>Support local communities</h3>
                  <p>
                    The goal is to connect users, vendors, and independent riders in a
                    simple way that improves visibility and access for the community.
                  </p>
                  <h3>Independent riders</h3>
                  <p>
                    Riders are independent participants who help users coordinate
                    deliveries. Localman is not a dispatch company and does not employ
                    riders.
                  </p>
                  <h3>No platform fees right now</h3>
                  <p>
                    Localman currently does not charge vendors, riders, or customers.
                    Business remains business-as-usual, and vendors are not expected to
                    provide special pricing, special treatment, or special access because
                    of Localman.
                  </p>
                  <h3>Trust and safety</h3>
                  <p>
                    Localman recognizes that platform abuse exists. The platform keeps
                    improving privacy protections, abuse prevention, rider protections,
                    vendor protections, and user protections while keeping the experience
                    simple.
                  </p>
                  <h3>Future</h3>
                  <p>
                    Localman&apos;s long-term mission is to make local discovery easier,
                    more accessible, and more community-focused.
                  </p>
                </div>
              </section>
              <section className="mobile-about-legal-section">
                <button
                  aria-controls="mobile-about-install-content"
                  aria-expanded={openMobileAboutSection === "install"}
                  className="mobile-about-legal-trigger"
                  data-testid="mobile-about-install-toggle"
                  type="button"
                  onClick={() =>
                    setOpenMobileAboutSection((current) =>
                      current === "install" ? null : "install",
                    )
                  }
                >
                  <span>Install Localman as an App</span>
                  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <path
                      d="m5.5 7.5 4.5 4.5 4.5-4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
                <div
                  className="mobile-about-legal-content"
                  data-testid="mobile-about-install-content"
                  hidden={openMobileAboutSection !== "install"}
                  id="mobile-about-install-content"
                >
                  <p>
                    You can add Localman to your phone home screen and open it
                    like a regular app.
                  </p>
                  <h3>Android</h3>
                  <ol>
                    <li>Open Localman in Chrome.</li>
                    <li>Tap the three-dot menu in the top-right corner.</li>
                    <li>Tap &quot;Install app&quot; or &quot;Add to Home screen.&quot;</li>
                    <li>Confirm by tapping &quot;Install&quot; or &quot;Add.&quot;</li>
                    <li>Open Localman from your home screen.</li>
                  </ol>
                  <h3>iPhone / iOS</h3>
                  <ol>
                    <li>Open Localman in Safari.</li>
                    <li>Tap the Share button.</li>
                    <li>Scroll and tap &quot;Add to Home Screen.&quot;</li>
                    <li>Confirm the name and tap &quot;Add.&quot;</li>
                    <li>Open Localman from your home screen.</li>
                  </ol>
                  <p>
                    On iPhone, use Safari for Add to Home Screen. Other browsers
                    may not show the same option.
                  </p>
                </div>
              </section>
              <section className="mobile-about-legal-section">
                <button
                  aria-controls="mobile-about-terms-content"
                  aria-expanded={openMobileAboutSection === "terms"}
                  className="mobile-about-legal-trigger"
                  data-testid="mobile-about-terms-toggle"
                  type="button"
                  onClick={() =>
                    setOpenMobileAboutSection((current) =>
                      current === "terms" ? null : "terms",
                    )
                  }
                >
                  <span>Terms of Use</span>
                  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <path
                      d="m5.5 7.5 4.5 4.5 4.5-4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
                <div
                  className="mobile-about-legal-content"
                  data-testid="mobile-about-terms-content"
                  hidden={openMobileAboutSection !== "terms"}
                  id="mobile-about-terms-content"
                >
                  <p>
                    By using Localman, you agree to use the platform lawfully and
                    responsibly.
                  </p>
                  <ul>
                    <li>
                      Localman helps people discover local food and everyday vendors.
                      Vendor details, prices, hours, menus, and availability can change,
                      so confirm important details with the vendor.
                    </li>
                    <li>
                      Rider Connect is lightweight coordination with independent riders.
                      Localman is not a rideshare, logistics, employment, or dispatch
                      company and does not guarantee delivery or rider performance.
                    </li>
                    <li>
                      WhatsApp handoff happens outside Localman. You are responsible for
                      the details you share and any agreement you make with a vendor or
                      rider.
                    </li>
                    <li>
                      Ratings and feedback should be honest. Do not submit false,
                      abusive, spammy, or misleading information.
                    </li>
                    <li>
                      Localman may change, pause, or interrupt parts of the service and
                      does not guarantee uninterrupted access.
                    </li>
                    <li>
                      To the fullest extent allowed by law, Localman is not responsible
                      for vendor pricing, food quality, rider conduct, delays, outages,
                      or decisions made outside the platform.
                    </li>
                    <li>
                      These terms may be updated over time. For support, email{" "}
                      <a href={`mailto:${LOCALMAN_SUPPORT_EMAIL}`}>
                        {LOCALMAN_SUPPORT_EMAIL}
                      </a>
                      .
                    </li>
                  </ul>
                </div>
              </section>
              <section className="mobile-about-legal-section">
                <button
                  aria-controls="mobile-about-privacy-content"
                  aria-expanded={openMobileAboutSection === "privacy"}
                  className="mobile-about-legal-trigger"
                  data-testid="mobile-about-privacy-toggle"
                  type="button"
                  onClick={() =>
                    setOpenMobileAboutSection((current) =>
                      current === "privacy" ? null : "privacy",
                    )
                  }
                >
                  <span>Privacy Policy</span>
                  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <path
                      d="m5.5 7.5 4.5 4.5 4.5-4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
                <div
                  className="mobile-about-legal-content"
                  data-testid="mobile-about-privacy-content"
                  hidden={openMobileAboutSection !== "privacy"}
                  id="mobile-about-privacy-content"
                >
                  <p>
                    Localman uses information to operate vendor discovery, rider
                    coordination, ratings, sharing, admin management, and abuse
                    prevention.
                  </p>
                  <ul>
                    <li>
                      Localman may handle vendor information, rider information,
                      admin-entered data, rider request details, ratings and signals,
                      approximate location or selected area, and browser or device data.
                    </li>
                    <li>
                      Full rider phone or WhatsApp details are not shown publicly before
                      handoff. Full rider plates are not exposed publicly; a masked plate
                      may appear after rider selection. Internal notes are not public.
                    </li>
                    <li>
                      Continuing to WhatsApp opens a service outside Localman, with its
                      own privacy practices. Necessary contact and request details may be
                      shared with the selected rider for coordination.
                    </li>
                    <li>
                      Localman keeps information as needed for platform operation,
                      support, admin records, abuse prevention, and legal or safety
                      reasons. Exact retention periods may vary.
                    </li>
                    <li>
                      You can choose not to submit rider request details. Vendors and
                      riders may request updates or removal through the available support
                      or admin process.
                    </li>
                    <li>
                      Localman uses reasonable protections, but no internet service can
                      guarantee perfect security.
                    </li>
                    <li>
                      Localman is not intended for children. Minors should use the
                      platform only with a parent or guardian.
                    </li>
                    <li>This policy may be updated as Localman grows.</li>
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </section>
        {showBackToTop ? (
          <button
            type="button"
            aria-label="Back to top"
            className="public-back-to-top"
            onClick={scrollToDiscoveryTop}
          >
            ↑
          </button>
        ) : null}
      </section>
      <nav
        aria-label="Mobile discovery sections"
        className="mobile-discovery-dock"
        data-testid="mobile-discovery-dock"
      >
        <button
          type="button"
          className="mobile-discovery-dock-button"
          data-active={activeMobileTab === "home"}
          data-testid="mobile-discovery-tab-home"
          aria-current={activeMobileTab === "home" ? "page" : undefined}
          onClick={() => setActiveMobileTab("home")}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d="M3 9.2 10 3l7 6.2v7.1a1.4 1.4 0 0 1-1.4 1.4h-3.2v-5.2H7.6v5.2H4.4A1.4 1.4 0 0 1 3 16.3V9.2Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
          </svg>
          <span>Home</span>
        </button>
        <button
          type="button"
          className="mobile-discovery-dock-button"
          data-active={activeMobileTab === "map"}
          data-testid="mobile-discovery-tab-map"
          aria-current={activeMobileTab === "map" ? "page" : undefined}
          onClick={() => setActiveMobileTab("map")}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d="m7 4-4 2v11l4-2 6 2 4-2V4l-4 2-6-2Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
            <path d="M7 4v11M13 6v11" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
          </svg>
          <span>Map</span>
        </button>
        <button
          type="button"
          className="mobile-discovery-dock-button"
          data-active={activeMobileTab === "about"}
          data-testid="mobile-discovery-tab-about"
          aria-current={activeMobileTab === "about" ? "page" : undefined}
          onClick={() => setActiveMobileTab("about")}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10 8.6v5M10 6.1h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
          </svg>
          <span>About</span>
        </button>
      </nav>
    </main>
  );
}

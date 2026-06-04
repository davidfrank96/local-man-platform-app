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
import {
  getPublicLocationDisplayModel,
} from "../../lib/location/display.ts";
import {
  DEFAULT_DISCOVERY_AREA_ID,
  createDiscoveryAreaLocation,
  getDiscoveryAreaById,
  resolveRestoredDiscoveryAreaId,
  type DiscoveryAreaId,
} from "../../lib/location/discovery-areas.ts";
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
  mergeRetainedVendorPreviewWithLiveVendor,
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
import { getActiveLocalmanUpdates } from "../../lib/public/localman-updates.ts";
import {
  formatVendorCardDistance,
  getVendorActiveHoursLabel,
  getVendorCurrentStatusDisplay,
  getVendorCue,
} from "../../lib/vendors/card-display.ts";
import {
  getPopularVendorIds,
  getPopularVendors,
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
import { AboutLocalmanContent } from "../about/about-localman-content.tsx";
import { FloatingAboutPanel } from "../about/floating-about-panel.tsx";
import {
  AREA_DISCOVERY_MODAL_ID,
  AreaDiscoveryModal,
} from "./area-discovery-modal.tsx";
import {
  SelectedVendorPanel,
  VendorSectionTabs,
  type VendorSection,
} from "./public-discovery-sections.tsx";
import { LocalmanUpdatesCenter } from "./localman-updates-center.tsx";
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
const LOCALMAN_WEBSITE_URL =
  process.env.NEXT_PUBLIC_LOCALMAN_WEBSITE_URL ?? "https://localman.app";
const LOCALMAN_SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_LOCALMAN_SUPPORT_EMAIL ?? "support@localman.app";
const LOCALMAN_BRAND_ICON_SRC = "/branding/localman-brand-icon.png";

function isLocalmanBrandTitle(title: string): boolean {
  return title.trim().replace(/\s+/g, "").toLowerCase() === "localman";
}

function shouldRestoreSelectedAreaFromSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const navigationEntry = window.performance
    .getEntriesByType("navigation")
    .at(0) as PerformanceNavigationTiming | undefined;

  return navigationEntry?.type !== "reload";
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
  const [mapRefreshToken, setMapRefreshToken] = useState(0);
  const [showLocationReminder, setShowLocationReminder] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [snapshotHydrated, setSnapshotHydrated] = useState(false);
  const [browserReady, setBrowserReady] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [areaFallbackOpen, setAreaFallbackOpen] = useState(false);
  const [selectedFallbackAreaId, setSelectedFallbackAreaId] =
    useState<DiscoveryAreaId | null>(null);
  const [updatesCenterOpen, setUpdatesCenterOpen] = useState(false);
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
  const selectedFallbackAreaIdRef = useRef<DiscoveryAreaId | null>(null);
  const selectedVendorIdRef = useRef<string | null>(null);
  const selectionActionTokenRef = useRef(0);
  const selectionSourceRef = useRef<VendorSelectionSource>(null);
  const nearbyRequestIdRef = useRef(0);
  const nearbyRequestKeyRef = useRef<string | null>(null);
  const reverseGeocodeRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const hasRestoredScrollRef = useRef(false);
  const discoveryTopRef = useRef<HTMLElement | null>(null);
  const areaFallbackButtonRef = useRef<HTMLButtonElement | null>(null);
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
  const resolvedLocationKey = useMemo(() => {
    if (!location || location.source === "default_city") {
      return null;
    }
    return `${location.source}:${location.coordinates.lat}:${location.coordinates.lng}`;
  }, [location]);
  const activeLocalmanUpdates = useMemo(() => getActiveLocalmanUpdates(), []);
  const hasActiveLocalmanUpdates = activeLocalmanUpdates.length > 0;
  const canUseAreaFallback =
    locationStatus === "denied" ||
    locationStatus === "unavailable" ||
    locationStatus === "error" ||
    locationStatus === "default_city";
  const effectiveFallbackAreaId =
    canUseAreaFallback ? selectedFallbackAreaId ?? DEFAULT_DISCOVERY_AREA_ID : null;
  const isDefaultFallbackAreaActive =
    canUseAreaFallback && !selectedFallbackAreaId && effectiveFallbackAreaId === DEFAULT_DISCOVERY_AREA_ID;
  const selectedFallbackArea = useMemo(
    () =>
      effectiveFallbackAreaId
        ? getDiscoveryAreaById(effectiveFallbackAreaId)
        : null,
    [effectiveFallbackAreaId],
  );
  const selectedFallbackAreaLocation = useMemo<AcquiredUserLocation | null>(
    () =>
      canUseAreaFallback && selectedFallbackArea
        ? createDiscoveryAreaLocation(selectedFallbackArea)
        : null,
    [canUseAreaFallback, selectedFallbackArea],
  );
  const activeFetchLocation = useMemo<AcquiredUserLocation | null>(() => {
    if (location && location.source !== "default_city") {
      return location;
    }

    if (selectedFallbackAreaLocation) {
      return selectedFallbackAreaLocation;
    }

    return null;
  }, [location, selectedFallbackAreaLocation]);
  const activeLocationSource = activeFetchLocation?.source ?? null;
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
    selectedFallbackAreaIdRef.current = selectedFallbackAreaId;
  }, [selectedFallbackAreaId]);

  useEffect(() => {
    if (!canUseAreaFallback || selectedFallbackAreaLocation || activeFetchLocation) {
      return;
    }

    const timeout = window.setTimeout(() => {
      nearbyRequestKeyRef.current = null;
      nearbyDataRef.current = null;
      nearbyDataUpdatedAtRef.current = null;
      nearbyDataRequestKeyRef.current = null;
      preferredSelectedVendorIdRef.current = null;
      selectedVendorIdRef.current = null;
      setNearbyData(null);
      setSelectedVendorId(null);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeFetchLocation, canUseAreaFallback, selectedFallbackAreaLocation]);

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
    isMountedRef.current = true;

    function markDiscoveryMounted() {
      isMountedRef.current = true;
    }

    window.addEventListener("pageshow", markDiscoveryMounted);

    return () => {
      window.removeEventListener("pageshow", markDiscoveryMounted);
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
      const restoredSelectedAreaId = resolveRestoredDiscoveryAreaId({
        currentAreaId: selectedFallbackAreaIdRef.current,
        shouldRestore: shouldRestoreSelectedAreaFromSnapshot(),
        snapshotAreaId: snapshot.selectedAreaId,
      });
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
      selectedFallbackAreaIdRef.current = restoredSelectedAreaId;
      selectedVendorIdRef.current = snapshotSelectedVendorId;
      recordSelectionIntent("restore");
      setSelectedFallbackAreaId(restoredSelectedAreaId);
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
      selectedAreaId: selectedFallbackAreaId,
      selectedVendorId,
      scrollY: window.scrollY,
    });
    if (fallbackDiscoverySnapshotKey !== discoverySnapshotKey) {
      writePublicDiscoverySnapshot(fallbackDiscoverySnapshotKey, {
        nearbyData,
        nearbyDataUpdatedAt: nearbyData ? nearbyDataUpdatedAtRef.current : null,
        nearbyRequestKey: nearbyData ? nearbyDataRequestKeyRef.current : null,
        selectedAreaId: selectedFallbackAreaId,
        selectedVendorId,
        scrollY: window.scrollY,
      });
    }
  }, [
    discoverySnapshotKey,
    fallbackDiscoverySnapshotKey,
    nearbyData,
    selectedFallbackAreaId,
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
        selectedAreaId: selectedFallbackAreaIdRef.current,
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
        selectedAreaId: selectedFallbackAreaIdRef.current,
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
          selectedAreaId: selectedFallbackAreaIdRef.current,
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
      const restoredSelectedAreaId = resolveRestoredDiscoveryAreaId({
        currentAreaId: selectedFallbackAreaIdRef.current,
        shouldRestore: true,
        snapshotAreaId: restoredSnapshot.selectedAreaId,
      });
      const snapshotSelectedVendorId = resolveSnapshotSelectedVendorId(restoredSnapshot);
      preferredSelectedVendorIdRef.current = snapshotSelectedVendorId;
      selectedFallbackAreaIdRef.current = restoredSelectedAreaId;
      selectedVendorIdRef.current = snapshotSelectedVendorId;
      recordSelectionIntent("restore");
      setSelectedFallbackAreaId(restoredSelectedAreaId);
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

    const timeout = window.setTimeout(() => {
      nearbyRequestKeyRef.current = requestKey;
      void loadNearbyVendors(activeFetchLocation, filters);
    }, 0);

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
      if (!activeFetchLocation) {
        return [];
      }

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
    [activeFetchLocation, filters, nearbyData],
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
    () => getPopularVendors(vendors as NearbyVendorsResponseData["vendors"]),
    [vendors],
  );
  const popularScopeLabel =
    selectedFallbackAreaLocation && selectedFallbackArea
      ? `Based on recent usage near ${selectedFallbackArea.displayName}`
      : "Based on recent usage";
  const currentRecentlyViewedVendors = useMemo(
    () =>
      recentlyViewedVendors.map((retainedVendor) => {
        const liveVendor = vendorById.get(retainedVendor.vendor_id);
        return liveVendor
          ? mergeRetainedVendorPreviewWithLiveVendor(retainedVendor, liveVendor)
          : retainedVendor;
      }),
    [recentlyViewedVendors, vendorById],
  );
  const selectedVendor = useMemo(
    () => (selectedVendorId ? vendorById.get(selectedVendorId) ?? null : null),
    [selectedVendorId, vendorById],
  );
  const selectedVendorOpenState = useMemo(
    () =>
      getVendorCurrentStatusDisplay(selectedVendor?.is_open_now),
    [selectedVendor?.is_open_now],
  );
  const selectedVendorActiveHours = useMemo(
    () => getVendorActiveHoursLabel(selectedVendor),
    [selectedVendor],
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
  const currentLastSelectedVendorMemory = useMemo(
    () =>
      lastSelectedVendorMemory && rememberedSelectedVendor
        ? mergeRetainedVendorPreviewWithLiveVendor(
            lastSelectedVendorMemory,
            rememberedSelectedVendor,
          )
        : lastSelectedVendorMemory,
    [lastSelectedVendorMemory, rememberedSelectedVendor],
  );
  const isResolvingLocation = locationStatus === "resolving";
  const isLoading = canUseNetwork && (isResolvingLocation || isFetchingVendors);
  const isApproximateDistance = nearbyData?.location.isApproximate ?? true;
  const showDiscoveryChoiceState =
    canUseAreaFallback && !selectedFallbackAreaLocation && !activeFetchLocation;
  const showAreaDiscoveryPanel = showDiscoveryChoiceState && canUseAreaFallback;
  const showNearbyEmptyState =
    snapshotHydrated &&
    vendors.length === 0 &&
    !isLoading &&
    !nearbyError &&
    !showDiscoveryChoiceState;
  const showMapEmptyState =
    snapshotHydrated &&
    mappableVendors.length === 0 &&
    !isLoading &&
    !nearbyError &&
    !showDiscoveryChoiceState;
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
  const locationPanelHeadline = showDiscoveryChoiceState
    ? "Find vendors near you"
    : showAreaDiscoveryPanel
      ? "Find vendors near you"
    : locationDisplay.headline;
  const locationPanelDetail = showDiscoveryChoiceState
    ? "Turn on location for more accurate nearby results."
    : showAreaDiscoveryPanel
      ? "Turn on location for more accurate nearby results."
    : isDefaultFallbackAreaActive
      ? "Default discovery area. Change area anytime."
    : locationDisplay.detail;
  const locationActionLabel =
    showAreaDiscoveryPanel || selectedFallbackAreaLocation
      ? "Use My Location"
      : "Retry location";
  const showMapOriginPlaceholder = !activeFetchLocation;
  const mapOriginPlaceholderTitle = isResolvingLocation
    ? "Finding your location"
    : "Choose a discovery starting point";
  const mapOriginPlaceholderBody = isResolvingLocation
    ? "The map will appear when Localman has a discovery location."
    : "The map will appear after you use your location or select an area.";

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
        selectedAreaId: selectedFallbackAreaIdRef.current,
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

  const closeAreaFallback = useCallback(() => {
    setAreaFallbackOpen(false);
  }, []);

  const toggleAreaFallback = useCallback(() => {
    setAreaFallbackOpen((current) => !current);
  }, []);

  const handleAreaFallbackChange = useCallback((areaId: DiscoveryAreaId) => {
    selectedFallbackAreaIdRef.current = areaId;
    setSelectedFallbackAreaId(areaId);
    setAreaFallbackOpen(false);
  }, []);

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
            <button
              aria-controls="localman-updates-panel"
              aria-expanded={updatesCenterOpen}
              aria-label="Open Localman updates"
              className="discovery-notification-button"
              data-testid="mobile-updates-button"
              onClick={() => setUpdatesCenterOpen(true)}
              type="button"
            >
              <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M5.7 8.3a4.3 4.3 0 0 1 8.6 0v3.4l1.2 2H4.5l1.2-2V8.3Z" strokeLinejoin="round" />
                <path d="M8.4 15.6a1.8 1.8 0 0 0 3.2 0" strokeLinecap="round" />
              </svg>
              {hasActiveLocalmanUpdates ? (
                <span className="discovery-notification-dot" aria-hidden="true" />
              ) : null}
            </button>
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

          <section
            className={
              showAreaDiscoveryPanel
                ? "location-panel discovery-choice-panel"
                : selectedFallbackAreaLocation
                  ? "location-panel area-active-panel"
                : "location-panel"
            }
            data-testid={showDiscoveryChoiceState ? "discovery-choice-state" : undefined}
            aria-live="polite"
          >
            <span className="location-panel-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 21s6-5.5 6-11a6 6 0 1 0-12 0c0 5.5 6 11 6 11Z" fill="currentColor" fillOpacity="0.14" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.2" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <div className="location-panel-copy">
              {showAreaDiscoveryPanel ? (
                <>
                  <strong className="location-copy-mobile">{locationPanelHeadline}</strong>
                  <strong className="location-copy-desktop">
                    Choose how you&apos;d like to explore Localman
                  </strong>
                </>
              ) : (
                <strong>{locationPanelHeadline}</strong>
              )}
              {locationPanelDetail ? (
                showAreaDiscoveryPanel ? (
                  <>
                    <span className="location-copy-mobile">{locationPanelDetail}</span>
                    <span className="location-copy-desktop">
                      Use your current location for the most accurate results, or browse vendors by area.
                    </span>
                  </>
                ) : selectedFallbackAreaLocation ? (
                  <>
                    <span className="location-copy-mobile">{locationPanelDetail}</span>
                    <span className="location-copy-desktop">
                      Turn on location for accurate nearby results.
                    </span>
                  </>
                ) : (
                  <span>{locationPanelDetail}</span>
                )
              ) : null}
              {!showAreaDiscoveryPanel && locationDisplay.trustLine ? (
                <span className="location-trust-line">{locationDisplay.trustLine}</span>
              ) : null}
            </div>
            <div className="location-panel-actions">
              <button
                className={
                  showDiscoveryChoiceState
                    ? "button-secondary compact-button location-primary-action"
                    : "button-secondary compact-button"
                }
                disabled={!isOnline || locationStatus === "resolving"}
                title={!isOnline ? "Reconnect to retry" : undefined}
                type="button"
                onClick={() => void retryLocation()}
              >
                {showAreaDiscoveryPanel ? (
                  <span className="location-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
                    </svg>
                  </span>
                ) : null}
                {locationActionLabel}
              </button>
            {canUseAreaFallback && !selectedFallbackAreaLocation ? (
              <>
                <button
                  ref={areaFallbackButtonRef}
                  aria-controls={AREA_DISCOVERY_MODAL_ID}
                  aria-expanded={areaFallbackOpen}
                  className="button-secondary compact-button location-area-toggle location-secondary-action"
                  type="button"
                  onClick={toggleAreaFallback}
                >
                  {showAreaDiscoveryPanel ? (
                    <span className="location-action-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                        <path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2Z" strokeLinejoin="round" />
                        <path d="M9 4v14M15 6v14" />
                      </svg>
                    </span>
                  ) : null}
                  Browse By Area
                </button>
              </>
            ) : null}
            </div>
            {selectedFallbackAreaLocation && selectedFallbackArea ? (
              <div className="location-area-feedback" role="status">
                <span className="location-area-status-icon" aria-hidden="true">
                  📍
                </span>
                <span>
                  <span className="location-area-label-mobile">Browsing:</span>
                  <span className="location-area-label-desktop">Browsing:</span>{" "}
                  <strong>{selectedFallbackArea.displayName}</strong>
                </span>
                <button
                  aria-controls={AREA_DISCOVERY_MODAL_ID}
                  aria-expanded={areaFallbackOpen}
                  className="location-area-change"
                  type="button"
                  onClick={toggleAreaFallback}
                >
                  <span className="location-area-change-mobile">Change</span>
                  <span className="location-area-change-desktop">Change</span>
                </button>
              </div>
            ) : null}
          </section>
          {canUseAreaFallback ? (
            <AreaDiscoveryModal
              open={areaFallbackOpen}
              selectedAreaId={effectiveFallbackAreaId}
              onAreaSelect={handleAreaFallbackChange}
              onClose={closeAreaFallback}
            />
          ) : null}
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

          {!showDiscoveryChoiceState ? (
            <>
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
                    {currentRecentlyViewedVendors.length > 0
                      ? `${currentRecentlyViewedVendors.length} saved`
                      : "No recent views yet"}
                  </span>
                </div>
                {currentRecentlyViewedVendors.length > 0 ? (
                  <div className="retention-list">
                    {currentRecentlyViewedVendors.map((vendor) => (
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
                    {popularVendors.length > 0 ? popularScopeLabel : "No popularity signal yet"}
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
                  <span>
                    {currentLastSelectedVendorMemory ? "Saved on this device" : "No saved vendor yet"}
                  </span>
                </div>
                {currentLastSelectedVendorMemory ? (
                  <div className="retention-list">
                    <div className="retention-item">
                      <div className="retention-item-copy">
                        <strong>{currentLastSelectedVendorMemory.name}</strong>
                        <span>
                          {currentLastSelectedVendorMemory.area ?? "Area not set"} • Today:{" "}
                          {currentLastSelectedVendorMemory.today_hours}
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
                            currentLastSelectedVendorMemory.slug,
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
            </>
          ) : null}
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
            {showMapOriginPlaceholder ? (
              <section
                className="discovery-map discovery-map-choice-state"
                data-map-mode="choice"
                data-testid="discovery-map-choice-state"
                role="status"
                aria-live="polite"
              >
                <strong>{mapOriginPlaceholderTitle}</strong>
                <p>{mapOriginPlaceholderBody}</p>
              </section>
            ) : (
              <VendorMap
                key={mapRefreshToken}
                selectionActionToken={selectionActionToken}
                selectionSource={selectionSource}
                selectedVendorId={selectedVendorId}
                timeTheme={timeTheme}
                userLocation={activeFetchLocation?.coordinates ?? null}
                vendors={mappableVendors}
                onSelectVendor={selectVendorById}
              />
            )}
            <button
              className="mobile-map-refresh-button"
              data-testid="mobile-map-refresh"
              disabled={
                !isOnline ||
                !activeFetchLocation ||
                isFetchingVendors ||
                locationStatus === "resolving"
              }
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

          {!showDiscoveryChoiceState ? (
            <SelectedVendorPanel
              activeLocationSource={activeLocationSource ?? null}
              discoveryReturnTo={discoveryReturnTo}
              isApproximateDistance={isApproximateDistance}
              selectedVendor={selectedVendor}
              selectedVendorActiveHours={selectedVendorActiveHours}
              selectedVendorCue={selectedVendorCue}
              selectedVendorOpenState={selectedVendorOpenState}
            />
          ) : null}
        </div>
        <AboutLocalmanContent
          className="mobile-about-view"
          idPrefix="mobile-about"
          rootTestId="mobile-about-view"
          supportEmail={LOCALMAN_SUPPORT_EMAIL}
          testIdPrefix="mobile-about"
          titleId="mobile-about-title"
          websiteUrl={LOCALMAN_WEBSITE_URL}
        />
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
      <FloatingAboutPanel
        supportEmail={LOCALMAN_SUPPORT_EMAIL}
        websiteUrl={LOCALMAN_WEBSITE_URL}
      />
      <LocalmanUpdatesCenter
        onClose={() => setUpdatesCenterOpen(false)}
        open={updatesCenterOpen}
        updates={activeLocalmanUpdates}
      />
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

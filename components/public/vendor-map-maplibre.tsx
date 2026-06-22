"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { Coordinates } from "../../lib/location/distance.ts";
import {
  DEFAULT_VENDOR_MAP_CENTER,
  type NearbyVendor,
  type VendorMapProps,
} from "./vendor-map-types.ts";
import { createStoreMarkerIconElement } from "./vendor-marker-icon.tsx";
import {
  getSelectedVendorCameraTarget,
  getVendorMapCenter,
  isSelectionCameraSource,
  type VendorMapCenter,
} from "./vendor-map-camera.ts";

type MapLibreVendorMapProps = VendorMapProps & {
  onMapError: () => void;
  onMapReady: () => void;
  onMarkersVisible: () => void;
  styleUrl: string;
};

type MapLibreModule = typeof import("maplibre-gl");
type MapInstance = InstanceType<MapLibreModule["Map"]>;
type MarkerInstance = InstanceType<MapLibreModule["Marker"]>;

type VendorMarkerEntry = {
  element: HTMLButtonElement;
  marker: MarkerInstance;
};

type ThemePalette = {
  background: string;
};

type CameraActionSource = "initial" | "filter" | "card" | "map" | "locate" | "debug";

type CameraState = {
  count: number;
  lastAction: {
    kind: "easeTo" | "fitBounds";
    source: CameraActionSource;
  } | null;
};

declare global {
  interface Window {
    __LOCAL_MAN_MAP_DEBUG__?: {
      focusVendor: (vendorId: string) => boolean;
      getClusterCount: () => number;
      getInteractionState: () => {
        boxZoom: boolean;
        doubleClickZoom: boolean;
        dragPan: boolean;
        dragRotate: boolean;
        keyboard: boolean;
        scrollZoom: boolean;
        touchZoomRotate: boolean;
      };
      getCameraState: () => CameraState;
      getRenderedLayerIdsAtVendor: (vendorId: string) => string[];
      getZoom: () => number;
      projectVendor: (vendorId: string) => { x: number; y: number } | null;
    };
  }
}

const MAPLIBRE_LOAD_TIMEOUT_MS = 8_000;
const DEFAULT_VENDOR_MAP_ZOOM = 11.5;
const INITIAL_MAP_FIT_BOUNDS_PADDING = 28;
const INTERACTIVE_MAP_FIT_BOUNDS_PADDING = 44;
const MAPLIBRE_CONTAINER_READY_TIMEOUT_MS = 2_500;
const MAPLIBRE_CONTAINER_RETRY_DELAY_MS = 120;

const THEME_PALETTES: Record<NonNullable<VendorMapProps["timeTheme"]> | "default", ThemePalette> = {
  default: { background: "#edf3ee" },
  morning: { background: "#edf3ee" },
  afternoon: { background: "#f2ebdf" },
  night: { background: "#18273a" },
};

function getThemePalette(timeTheme: VendorMapProps["timeTheme"]): ThemePalette {
  return THEME_PALETTES[timeTheme ?? "default"];
}

function syncUserMarker(
  maplibre: MapLibreModule,
  map: MapInstance,
  userMarkerRef: MutableRefObject<MarkerInstance | null>,
  userLocation: Coordinates,
) {
  if (!userMarkerRef.current) {
    const element = document.createElement("span");
    element.className = "maplibre-user-marker";
    element.setAttribute("aria-label", "Search location");
    element.setAttribute("role", "img");
    element.title = "Search location";

    const pin = document.createElement("span");
    pin.className = "maplibre-user-marker__pin";
    pin.setAttribute("aria-hidden", "true");
    element.append(pin);

    userMarkerRef.current = new maplibre.Marker({
      element,
      anchor: "center",
    })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);

    return;
  }

  userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
}

function recordCameraAction(
  cameraStateRef: MutableRefObject<CameraState>,
  kind: "easeTo" | "fitBounds",
  source: CameraActionSource,
) {
  cameraStateRef.current = {
    count: cameraStateRef.current.count + 1,
    lastAction: {
      kind,
      source,
    },
  };
}

function easeMapTo(
  map: MapInstance,
  cameraStateRef: MutableRefObject<CameraState>,
  source: CameraActionSource,
  options: Parameters<MapInstance["easeTo"]>[0],
) {
  recordCameraAction(cameraStateRef, "easeTo", source);
  map.easeTo(options);
}

function fitMapBounds(
  map: MapInstance,
  cameraStateRef: MutableRefObject<CameraState>,
  source: CameraActionSource,
  bounds: Parameters<MapInstance["fitBounds"]>[0],
  options: Parameters<MapInstance["fitBounds"]>[1],
) {
  recordCameraAction(cameraStateRef, "fitBounds", source);
  map.fitBounds(bounds, options);
}

function fitMapToDiscoveryBounds(
  maplibre: MapLibreModule,
  map: MapInstance,
  cameraStateRef: MutableRefObject<CameraState>,
  userLocation: Coordinates,
  vendors: NearbyVendor[],
  source: "initial" | "filter",
) {
  const vendorCenters = vendors.flatMap((vendor) => {
    const center = getVendorMapCenter(vendor);
    return center ? [center] : [];
  });

  if (vendorCenters.length === 0) {
    easeMapTo(map, cameraStateRef, source, {
      center: [userLocation.lng, userLocation.lat],
      zoom: DEFAULT_VENDOR_MAP_ZOOM,
      duration: source === "initial" ? 0 : 400,
    });
    return;
  }

  const bounds = vendors.reduce(
    (currentBounds, vendor) => {
      const center = getVendorMapCenter(vendor);
      return center ? currentBounds.extend(center) : currentBounds;
    },
    new maplibre.LngLatBounds(
      [userLocation.lng, userLocation.lat],
      [userLocation.lng, userLocation.lat],
    ),
  );

  fitMapBounds(map, cameraStateRef, source, bounds, {
    padding:
      source === "initial"
        ? INITIAL_MAP_FIT_BOUNDS_PADDING
        : INTERACTIVE_MAP_FIT_BOUNDS_PADDING,
    duration: source === "initial" ? 0 : 500,
    maxZoom: source === "initial" ? 14.25 : 15,
  });
}

function applyThemeBackground(map: MapInstance, timeTheme: VendorMapProps["timeTheme"]) {
  const palette = getThemePalette(timeTheme);

  try {
    const backgroundLayerId = map.getStyle()?.layers?.find((layer) => layer.type === "background")?.id;
    if (backgroundLayerId) {
      map.setPaintProperty(backgroundLayerId, "background-color", palette.background);
    }
  } catch {
    // Best-effort only.
  }
}

function hasRenderableContainer(container: HTMLDivElement | null) {
  return Boolean(
    container &&
      container.isConnected &&
      container.clientWidth > 0 &&
      container.clientHeight > 0,
  );
}

function waitForNextAnimationFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function waitForRenderableContainer(
  containerRef: MutableRefObject<HTMLDivElement | null>,
  isCancelled: () => boolean,
) {
  const startedAt = window.performance.now();

  while (window.performance.now() - startedAt < MAPLIBRE_CONTAINER_READY_TIMEOUT_MS) {
    if (isCancelled()) {
      return null;
    }

    const container = containerRef.current;
    if (hasRenderableContainer(container)) {
      return container;
    }

    await waitForNextAnimationFrame();
    if (hasRenderableContainer(containerRef.current)) {
      return containerRef.current;
    }

    await waitForNextAnimationFrame();
    if (hasRenderableContainer(containerRef.current)) {
      return containerRef.current;
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, MAPLIBRE_CONTAINER_RETRY_DELAY_MS);
    });
  }

  return null;
}

function createVendorMarkerEntry(
  maplibre: MapLibreModule,
  map: MapInstance,
  latestSelectVendorRef: MutableRefObject<VendorMapProps["onSelectVendor"]>,
  vendor: NearbyVendor,
  center: VendorMapCenter,
): VendorMarkerEntry {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "maplibre-vendor-marker";
  element.setAttribute("aria-label", `Select ${vendor.name}`);
  element.setAttribute("data-vendor-id", vendor.vendor_id);
  element.title = vendor.name;

  const pin = document.createElement("span");
  pin.className = "maplibre-vendor-marker__pin";
  pin.setAttribute("aria-hidden", "true");

  pin.append(createStoreMarkerIconElement(document, "maplibre-vendor-marker__icon"));
  element.append(pin);

  element.addEventListener("click", () => {
    latestSelectVendorRef.current(vendor.vendor_id, "map");
  });

  const marker = new maplibre.Marker({
    element,
    anchor: "center",
  })
    .setLngLat(center)
    .addTo(map);

  return {
    element,
    marker,
  };
}

function syncVendorMarkers(
  maplibre: MapLibreModule,
  map: MapInstance,
  markersRef: MutableRefObject<Record<string, VendorMarkerEntry>>,
  latestSelectVendorRef: MutableRefObject<VendorMapProps["onSelectVendor"]>,
  vendors: NearbyVendor[],
  selectedVendorId: string | null,
) {
  const mappableVendors = vendors.filter((vendor) => getVendorMapCenter(vendor) !== null);
  const nextVendorIds = new Set(mappableVendors.map((vendor) => vendor.vendor_id));

  for (const [vendorId, entry] of Object.entries(markersRef.current)) {
    if (nextVendorIds.has(vendorId)) {
      continue;
    }

    entry.marker.remove();
    delete markersRef.current[vendorId];
  }

  mappableVendors.forEach((vendor) => {
    const center = getVendorMapCenter(vendor);
    if (!center) {
      return;
    }

    const existingEntry = markersRef.current[vendor.vendor_id];
    const entry =
      existingEntry ??
      createVendorMarkerEntry(maplibre, map, latestSelectVendorRef, vendor, center);

    if (!existingEntry) {
      markersRef.current[vendor.vendor_id] = entry;
    }

    entry.marker.setLngLat(center);
    entry.element.classList.toggle("selected", vendor.vendor_id === selectedVendorId);
    entry.element.setAttribute("aria-pressed", vendor.vendor_id === selectedVendorId ? "true" : "false");
    entry.element.style.zIndex = vendor.vendor_id === selectedVendorId ? "2" : "1";
  });
}

function removeVendorMarkers(markersRef: MutableRefObject<Record<string, VendorMarkerEntry>>) {
  for (const entry of Object.values(markersRef.current)) {
    entry.marker.remove();
  }

  markersRef.current = {};
}

function installMapDebug(
  map: MapInstance,
  cameraStateRef: MutableRefObject<CameraState>,
  latestVendorsRef: MutableRefObject<NearbyVendor[]>,
  markersRef: MutableRefObject<Record<string, VendorMarkerEntry>>,
) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_LOCALMAN_ENABLE_MAP_DEBUG !== "true"
  ) {
    return;
  }

  const interactionHandlers = map as unknown as {
    boxZoom?: { isEnabled: () => boolean };
    doubleClickZoom?: { isEnabled: () => boolean };
    dragPan?: { isEnabled: () => boolean };
    dragRotate?: { isEnabled: () => boolean };
    keyboard?: { isEnabled: () => boolean };
    scrollZoom?: { isEnabled: () => boolean };
    touchZoomRotate?: { isEnabled: () => boolean };
  };

  window.__LOCAL_MAN_MAP_DEBUG__ = {
    focusVendor(vendorId: string) {
      const vendor = latestVendorsRef.current.find((entry) => entry.vendor_id === vendorId);
      if (!vendor) {
        return false;
      }

      const center = getVendorMapCenter(vendor);
      if (!center) {
        return false;
      }

      easeMapTo(map, cameraStateRef, "debug", {
        center,
        zoom: map.getZoom(),
        duration: 0,
      });
      return true;
    },
    getClusterCount() {
      return 0;
    },
    getInteractionState() {
      return {
        boxZoom: Boolean(interactionHandlers.boxZoom?.isEnabled()),
        doubleClickZoom: Boolean(interactionHandlers.doubleClickZoom?.isEnabled()),
        dragPan: Boolean(interactionHandlers.dragPan?.isEnabled()),
        dragRotate: Boolean(interactionHandlers.dragRotate?.isEnabled()),
        keyboard: Boolean(interactionHandlers.keyboard?.isEnabled()),
        scrollZoom: Boolean(interactionHandlers.scrollZoom?.isEnabled()),
        touchZoomRotate: Boolean(interactionHandlers.touchZoomRotate?.isEnabled()),
      };
    },
    getCameraState() {
      return cameraStateRef.current;
    },
    getRenderedLayerIdsAtVendor(vendorId: string) {
      const marker = markersRef.current[vendorId];
      if (!marker) {
        return [];
      }

      return marker.element.classList.contains("selected") ? ["selected-vendor-marker"] : ["vendor-marker"];
    },
    projectVendor(vendorId: string) {
      const vendor = latestVendorsRef.current.find((entry) => entry.vendor_id === vendorId);
      if (!vendor) {
        return null;
      }

      const center = getVendorMapCenter(vendor);
      if (!center) {
        return null;
      }

      const point = map.project(center);
      return { x: point.x, y: point.y };
    },
    getZoom() {
      return map.getZoom();
    },
  };
}

export function MapLibreVendorMap({
  vendors,
  userLocation,
  selectedVendorId,
  selectionActionToken,
  selectionSource,
  timeTheme,
  onSelectVendor,
  onMapError,
  onMapReady,
  onMarkersVisible,
  styleUrl,
}: MapLibreVendorMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadToken, setMapLoadToken] = useState(0);
  const mapRef = useRef<MapInstance | null>(null);
  const maplibreRef = useRef<MapLibreModule | null>(null);
  const userMarkerRef = useRef<MarkerInstance | null>(null);
  const markersRef = useRef<Record<string, VendorMarkerEntry>>({});
  const loadedRef = useRef(false);
  const fallbackTriggeredRef = useRef(false);
  const lastViewportKeyRef = useRef<string | null>(null);
  const lastSelectionCameraTokenRef = useRef<number | null>(null);
  const latestSelectVendorRef = useRef(onSelectVendor);
  const latestMapErrorRef = useRef(onMapError);
  const latestMapReadyRef = useRef(onMapReady);
  const latestMarkersVisibleRef = useRef(onMarkersVisible);
  const latestVendorsRef = useRef(vendors);
  const latestSelectedVendorIdRef = useRef(selectedVendorId);
  const hasReportedVisibleMarkersRef = useRef(false);
  const cameraStateRef = useRef<CameraState>({
    count: 0,
    lastAction: null,
  });
  const resolvedUserLocation = userLocation ?? DEFAULT_VENDOR_MAP_CENTER;
  const activeUserLocationRef = useRef(resolvedUserLocation);
  const latestResolvedUserLocationRef = useRef(resolvedUserLocation);
  const viewportKey = useMemo(() => {
    const vendorKey = vendors
      .map((vendor) => `${vendor.vendor_id}:${vendor.latitude}:${vendor.longitude}`)
      .join("|");

    return `${resolvedUserLocation.lat}:${resolvedUserLocation.lng}:${vendorKey}`;
  }, [resolvedUserLocation.lat, resolvedUserLocation.lng, vendors]);

  useEffect(() => {
    latestSelectVendorRef.current = onSelectVendor;
    latestMapErrorRef.current = onMapError;
    latestMapReadyRef.current = onMapReady;
    latestMarkersVisibleRef.current = onMarkersVisible;
    latestResolvedUserLocationRef.current = resolvedUserLocation;
    latestVendorsRef.current = vendors;
    latestSelectedVendorIdRef.current = selectedVendorId;
  }, [
    onMapError,
    onMapReady,
    onMarkersVisible,
    onSelectVendor,
    resolvedUserLocation,
    selectedVendorId,
    vendors,
  ]);

  useEffect(() => {
    activeUserLocationRef.current = resolvedUserLocation;
  }, [resolvedUserLocation]);

  useEffect(() => {
    let cancelled = false;
    let loadTimeout: number | null = null;
    let readySettleFrame: number | null = null;
    let layoutSettleFrame: number | null = null;
    let hasReportedMapReady = false;

    async function initializeMap() {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || mapRef.current) {
          return;
        }

        const container = await waitForRenderableContainer(
          containerRef,
          () => cancelled,
        );
        if (cancelled || !container || mapRef.current) {
          if (!cancelled && !container) {
            latestMapErrorRef.current();
          }
          return;
        }

        maplibreRef.current = maplibre;
        const map = new maplibre.Map({
          container,
          style: styleUrl,
          center: [
            latestResolvedUserLocationRef.current.lng,
            latestResolvedUserLocationRef.current.lat,
          ],
          zoom: DEFAULT_VENDOR_MAP_ZOOM,
          cooperativeGestures: false,
          fadeDuration: 0,
        });

        mapRef.current = map;
        const geolocateControl = new maplibre.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          showAccuracyCircle: false,
          showUserLocation: false,
          trackUserLocation: true,
        });
        map.addControl(
          new maplibre.NavigationControl({
            showCompass: false,
            visualizePitch: false,
          }),
          "top-right",
        );
        map.addControl(geolocateControl, "top-right");
        map.scrollZoom.enable();
        map.boxZoom.enable();
        map.doubleClickZoom.enable();
        map.dragPan.enable();
        map.dragRotate.disable();
        map.keyboard.enable();
        map.touchZoomRotate.enable();
        map.touchZoomRotate.disableRotation();
        geolocateControl.on("geolocate", (event: { coords: { latitude: number; longitude: number } }) => {
          const nextUserLocation = {
            lat: event.coords.latitude,
            lng: event.coords.longitude,
          };

          activeUserLocationRef.current = nextUserLocation;
          syncUserMarker(maplibre, map, userMarkerRef, nextUserLocation);
          easeMapTo(map, cameraStateRef, "locate", {
            center: [nextUserLocation.lng, nextUserLocation.lat],
            zoom: Math.max(map.getZoom(), DEFAULT_VENDOR_MAP_ZOOM),
            duration: 300,
          });
        });

        const failToFallback = () => {
          if (cancelled || fallbackTriggeredRef.current || loadedRef.current) {
            return;
          }

          fallbackTriggeredRef.current = true;
          latestMapErrorRef.current();
        };

        loadTimeout = window.setTimeout(failToFallback, MAPLIBRE_LOAD_TIMEOUT_MS);
        map.on("error", (event) => {
          console.warn("[vendor-map] non-fatal MapLibre error", event);
        });
        map.once("render", () => {
          if (cancelled || hasReportedMapReady) {
            return;
          }

          hasReportedMapReady = true;
          readySettleFrame = window.requestAnimationFrame(() => {
            if (cancelled) {
              return;
            }

            map.resize();
            setMapReady(true);
            latestMapReadyRef.current();
          });
        });

        map.once("load", () => {
          if (cancelled) {
            return;
          }

          loadedRef.current = true;
          setMapLoadToken((current) => current + 1);
          if (loadTimeout !== null) {
            window.clearTimeout(loadTimeout);
          }

          const settleMapLayout = () => {
            if (cancelled) {
              return;
            }

            applyThemeBackground(map, timeTheme);
            syncUserMarker(maplibre, map, userMarkerRef, activeUserLocationRef.current);
            syncVendorMarkers(
              maplibre,
              map,
              markersRef,
              latestSelectVendorRef,
              latestVendorsRef.current,
              latestSelectedVendorIdRef.current,
            );
            if (
              !hasReportedVisibleMarkersRef.current &&
              Object.keys(markersRef.current).length > 0
            ) {
              hasReportedVisibleMarkersRef.current = true;
              latestMarkersVisibleRef.current();
            }
            fitMapToDiscoveryBounds(
              maplibre,
              map,
              cameraStateRef,
              activeUserLocationRef.current,
              latestVendorsRef.current,
              "initial",
            );
            lastViewportKeyRef.current = viewportKey;
            installMapDebug(map, cameraStateRef, latestVendorsRef, markersRef);
          };

          layoutSettleFrame = window.requestAnimationFrame(settleMapLayout);
        });
      } catch {
        if (!cancelled) {
          latestMapErrorRef.current();
        }
      }
    }

    void initializeMap();

    return () => {
      cancelled = true;
      if (loadTimeout !== null) {
        window.clearTimeout(loadTimeout);
      }
      if (readySettleFrame !== null) {
        window.cancelAnimationFrame(readySettleFrame);
      }
      if (layoutSettleFrame !== null) {
        window.cancelAnimationFrame(layoutSettleFrame);
      }

      removeVendorMarkers(markersRef);
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      maplibreRef.current = null;
      setMapReady(false);
      setMapLoadToken(0);
      loadedRef.current = false;
      fallbackTriggeredRef.current = false;
      lastViewportKeyRef.current = null;
      lastSelectionCameraTokenRef.current = null;
      cameraStateRef.current = {
        count: 0,
        lastAction: null,
      };
      hasReportedVisibleMarkersRef.current = false;
      if (
        process.env.NODE_ENV !== "production" ||
        process.env.NEXT_PUBLIC_LOCALMAN_ENABLE_MAP_DEBUG === "true"
      ) {
        window.__LOCAL_MAN_MAP_DEBUG__ = undefined;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- map init must stay pinned to the style URL
  }, [styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;

    if (!map || !maplibre || !loadedRef.current) {
      return;
    }

    syncUserMarker(maplibre, map, userMarkerRef, activeUserLocationRef.current);
    syncVendorMarkers(
      maplibre,
      map,
      markersRef,
      latestSelectVendorRef,
      vendors,
      selectedVendorId,
    );
    installMapDebug(map, cameraStateRef, latestVendorsRef, markersRef);

    if (lastViewportKeyRef.current !== viewportKey) {
      fitMapToDiscoveryBounds(
        maplibre,
        map,
        cameraStateRef,
        activeUserLocationRef.current,
        vendors,
        "filter",
      );
      lastViewportKeyRef.current = viewportKey;
    }

    if (
      !hasReportedVisibleMarkersRef.current &&
      Object.keys(markersRef.current).length > 0
    ) {
      hasReportedVisibleMarkersRef.current = true;
      latestMarkersVisibleRef.current();
    }
  }, [selectedVendorId, vendors, viewportKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      return;
    }

    applyThemeBackground(map, timeTheme);
  }, [timeTheme]);

  useEffect(() => {
    let resumeResizeFrame: number | null = null;

    const resizeVisibleMap = () => {
      const map = mapRef.current;

      if (!map || !loadedRef.current) {
        return;
      }

      if (resumeResizeFrame !== null) {
        window.cancelAnimationFrame(resumeResizeFrame);
      }

      resumeResizeFrame = window.requestAnimationFrame(() => {
        resumeResizeFrame = null;
        const currentMap = mapRef.current;

        if (!currentMap || !loadedRef.current) {
          return;
        }

        currentMap.resize();
      });
    };

    const handleVisibilityResume = () => {
      if (document.visibilityState === "visible") {
        resizeVisibleMap();
      }
    };

    window.addEventListener("focus", resizeVisibleMap);
    window.addEventListener("pageshow", resizeVisibleMap);
    document.addEventListener("visibilitychange", handleVisibilityResume);

    return () => {
      if (resumeResizeFrame !== null) {
        window.cancelAnimationFrame(resumeResizeFrame);
      }

      window.removeEventListener("focus", resizeVisibleMap);
      window.removeEventListener("pageshow", resizeVisibleMap);
      document.removeEventListener("visibilitychange", handleVisibilityResume);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      return;
    }

    if (!selectedVendorId || !isSelectionCameraSource(selectionSource)) {
      lastSelectionCameraTokenRef.current = null;
      return;
    }

    const selectedVendorCameraTarget = getSelectedVendorCameraTarget(
      latestVendorsRef.current,
      selectedVendorId,
      map.getZoom(),
    );
    if (!selectedVendorCameraTarget) {
      return;
    }

    if (lastSelectionCameraTokenRef.current === selectionActionToken) {
      return;
    }

    lastSelectionCameraTokenRef.current = selectionActionToken;

    easeMapTo(map, cameraStateRef, selectionSource, {
      center: selectedVendorCameraTarget.center,
      zoom: selectedVendorCameraTarget.zoom,
      duration: 350,
    });
  }, [mapLoadToken, selectedVendorId, selectionActionToken, selectionSource]);

  return (
    <section
      className="discovery-map"
      aria-label="Nearby vendor map"
      data-map-mode={mapReady ? "maplibre" : "loading"}
      data-map-ready={mapReady ? "true" : "false"}
      data-time-theme={timeTheme ?? "morning"}
    >
      <div className="maplibre-map-surface" ref={containerRef} />
      <div
        aria-hidden="true"
        className={mapReady ? "map-loading-overlay map-loading-overlay-ready" : "map-loading-overlay"}
      >
        <span>Loading map…</span>
      </div>
      <div className="map-legend">
        <span>Search location</span>
        <span>{vendors.length} vendors</span>
      </div>
    </section>
  );
}

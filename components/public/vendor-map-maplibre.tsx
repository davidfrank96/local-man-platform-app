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

type MapLibreVendorMapProps = VendorMapProps & {
  onMapError: () => void;
  styleUrl: string;
};

type MapLibreModule = typeof import("maplibre-gl");
type MapInstance = InstanceType<MapLibreModule["Map"]>;
type MarkerInstance = InstanceType<MapLibreModule["Marker"]>;

type VendorMarkerEntry = {
  element: HTMLButtonElement;
  label: HTMLSpanElement;
  marker: MarkerInstance;
};

type ThemePalette = {
  background: string;
};

type CameraActionSource = "initial" | "filter" | "card" | "locate" | "debug";

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

const MAPLIBRE_LOAD_TIMEOUT_MS = 4_000;
const DEFAULT_VENDOR_MAP_ZOOM = 12.25;
const MAP_FIT_BOUNDS_PADDING = 44;
const MAPLIBRE_CONTAINER_READY_TIMEOUT_MS = 1_250;
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
  if (vendors.length === 0) {
    easeMapTo(map, cameraStateRef, source, {
      center: [userLocation.lng, userLocation.lat],
      zoom: DEFAULT_VENDOR_MAP_ZOOM,
      duration: 400,
    });
    return;
  }

  const bounds = vendors.reduce(
    (currentBounds, vendor) =>
      currentBounds.extend([vendor.longitude, vendor.latitude] as [number, number]),
    new maplibre.LngLatBounds(
      [userLocation.lng, userLocation.lat],
      [userLocation.lng, userLocation.lat],
    ),
  );

  fitMapBounds(map, cameraStateRef, source, bounds, {
    padding: MAP_FIT_BOUNDS_PADDING,
    duration: 500,
    maxZoom: 15,
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

  const label = document.createElement("span");
  label.className = "maplibre-vendor-marker__label";
  label.setAttribute("aria-hidden", "true");
  pin.append(label);
  element.append(pin);

  element.addEventListener("click", () => {
    latestSelectVendorRef.current(vendor.vendor_id, "map");
  });

  const marker = new maplibre.Marker({
    element,
    anchor: "center",
  })
    .setLngLat([vendor.longitude, vendor.latitude])
    .addTo(map);

  return {
    element,
    label,
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
  const nextVendorIds = new Set(vendors.map((vendor) => vendor.vendor_id));

  for (const [vendorId, entry] of Object.entries(markersRef.current)) {
    if (nextVendorIds.has(vendorId)) {
      continue;
    }

    entry.marker.remove();
    delete markersRef.current[vendorId];
  }

  vendors.forEach((vendor, index) => {
    const existingEntry = markersRef.current[vendor.vendor_id];
    const entry =
      existingEntry ??
      createVendorMarkerEntry(maplibre, map, latestSelectVendorRef, vendor);

    if (!existingEntry) {
      markersRef.current[vendor.vendor_id] = entry;
    }

    entry.marker.setLngLat([vendor.longitude, vendor.latitude]);
    entry.label.textContent = String(index + 1);
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

      easeMapTo(map, cameraStateRef, "debug", {
        center: [vendor.longitude, vendor.latitude],
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

      const point = map.project([vendor.longitude, vendor.latitude]);
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
  styleUrl,
}: MapLibreVendorMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
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
  const latestVendorsRef = useRef(vendors);
  const latestSelectedVendorIdRef = useRef(selectedVendorId);
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
    latestResolvedUserLocationRef.current = resolvedUserLocation;
    latestVendorsRef.current = vendors;
    latestSelectedVendorIdRef.current = selectedVendorId;
  }, [onMapError, onSelectVendor, resolvedUserLocation, selectedVendorId, vendors]);

  useEffect(() => {
    activeUserLocationRef.current = resolvedUserLocation;
  }, [resolvedUserLocation]);

  useEffect(() => {
    let cancelled = false;
    let loadTimeout: number | null = null;
    let layoutSettleFrame: number | null = null;

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

        map.once("load", () => {
          if (cancelled) {
            return;
          }

          loadedRef.current = true;
          if (loadTimeout !== null) {
            window.clearTimeout(loadTimeout);
          }

          const settleMapLayout = () => {
            if (cancelled) {
              return;
            }

            map.resize();
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
            setMapReady(true);
          };

          layoutSettleFrame = window.requestAnimationFrame(() => {
            layoutSettleFrame = window.requestAnimationFrame(settleMapLayout);
          });
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
      loadedRef.current = false;
      fallbackTriggeredRef.current = false;
      lastViewportKeyRef.current = null;
      lastSelectionCameraTokenRef.current = null;
      cameraStateRef.current = {
        count: 0,
        lastAction: null,
      };
      window.__LOCAL_MAN_MAP_DEBUG__ = undefined;
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
  }, [selectedVendorId, vendors, viewportKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      return;
    }

    applyThemeBackground(map, timeTheme);
  }, [timeTheme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      return;
    }

    if (!selectedVendorId || selectionSource !== "card") {
      lastSelectionCameraTokenRef.current = null;
      return;
    }

    const selectedVendor = latestVendorsRef.current.find(
      (vendor) => vendor.vendor_id === selectedVendorId,
    );
    if (!selectedVendor) {
      return;
    }

    if (lastSelectionCameraTokenRef.current === selectionActionToken) {
      return;
    }

    lastSelectionCameraTokenRef.current = selectionActionToken;

    const selectedPoint = map.project([selectedVendor.longitude, selectedVendor.latitude]);
    const container = map.getContainer();
    const paddingX = container.clientWidth * 0.18;
    const paddingY = container.clientHeight * 0.2;
    const alreadyComfortablyVisible =
      selectedPoint.x >= paddingX &&
      selectedPoint.x <= container.clientWidth - paddingX &&
      selectedPoint.y >= paddingY &&
      selectedPoint.y <= container.clientHeight - paddingY;

    if (alreadyComfortablyVisible) {
      return;
    }

    easeMapTo(map, cameraStateRef, "card", {
      center: [selectedVendor.longitude, selectedVendor.latitude],
      zoom: map.getZoom(),
      duration: 250,
    });
  }, [selectedVendorId, selectionActionToken, selectionSource]);

  return (
    <section
      className="discovery-map"
      aria-label="Nearby vendor map"
      data-map-mode={mapReady ? "maplibre" : "loading"}
      data-time-theme={timeTheme ?? "morning"}
    >
      <div className="maplibre-map-surface" ref={containerRef} />
      <div className="map-legend">
        <span>Search location</span>
        <span>{vendors.length} vendors</span>
      </div>
    </section>
  );
}

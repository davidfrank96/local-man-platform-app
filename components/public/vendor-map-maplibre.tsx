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
import {
  CARD_SELECTION_ANIMATION_MS,
  CLUSTER_EXPANSION_ANIMATION_MS,
  MAP_SELECTION_ANIMATION_MS,
  VENDOR_CLUSTER_MAX_ZOOM,
  createSelectedVendorFeatureCollection,
  createVendorFeatureCollection,
  getClusterExpansionCameraOffset,
  getSameLocationGroupForVendor,
  getSameLocationGroups,
  getSelectionCameraOffset,
  getVendorClusterRadius,
  type SameLocationGroup,
  type VendorFeatureCollection,
} from "./vendor-map-clustering.ts";
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
type GeoJSONSourceInstance = InstanceType<MapLibreModule["GeoJSONSource"]>;

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
const MAPLIBRE_CONTAINER_RETRY_DELAY_MS = 120;
const VENDOR_SOURCE_ID = "localman-vendors";
const SELECTED_VENDOR_SOURCE_ID = "localman-selected-vendor";
const VENDOR_CLUSTERS_LAYER_ID = "vendor-clusters";
const VENDOR_CLUSTER_COUNT_LAYER_ID = "vendor-cluster-count";
const VENDOR_UNCLUSTERED_LAYER_ID = "vendor-unclustered";
const VENDOR_UNCLUSTERED_ICON_LAYER_ID = "vendor-unclustered-icon";
const VENDOR_SELECTED_OVERLAY_LAYER_ID = "vendor-selected-overlay";
const VENDOR_SELECTED_OVERLAY_ICON_LAYER_ID = "vendor-selected-overlay-icon";
const VENDOR_STOREFRONT_ICON_IMAGE_ID = "localman-storefront-marker";
const VENDOR_STOREFRONT_ICON_PIXEL_SIZE = 28;
const MOBILE_MAP_MEDIA_QUERY = "(max-width: 767px)";

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
  while (!isCancelled()) {
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

function isMobileMapViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(MOBILE_MAP_MEDIA_QUERY).matches;
}

function getGeoJsonSource(
  map: MapInstance,
  sourceId: string,
): GeoJSONSourceInstance | null {
  const source = map.getSource(sourceId);

  return source && "setData" in source ? source as GeoJSONSourceInstance : null;
}

function createStorefrontIconImage(): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = VENDOR_STOREFRONT_ICON_PIXEL_SIZE;
  canvas.height = VENDOR_STOREFRONT_ICON_PIXEL_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    return new ImageData(
      VENDOR_STOREFRONT_ICON_PIXEL_SIZE,
      VENDOR_STOREFRONT_ICON_PIXEL_SIZE,
    );
  }

  context.fillStyle = "#fffdf8";
  context.fillRect(8, 14, 12, 9);
  context.fillRect(7, 8, 14, 4);
  context.fillRect(6, 12, 4, 3);
  context.fillRect(12, 12, 4, 3);
  context.fillRect(18, 12, 4, 3);
  context.fillRect(9, 6, 10, 3);

  context.globalCompositeOperation = "destination-out";
  context.fillRect(10, 16, 3, 3);
  context.fillRect(15, 16, 3, 7);
  context.globalCompositeOperation = "source-over";

  return context.getImageData(
    0,
    0,
    VENDOR_STOREFRONT_ICON_PIXEL_SIZE,
    VENDOR_STOREFRONT_ICON_PIXEL_SIZE,
  );
}

function ensureStorefrontIconImage(map: MapInstance) {
  if (map.hasImage(VENDOR_STOREFRONT_ICON_IMAGE_ID)) {
    return;
  }

  map.addImage(VENDOR_STOREFRONT_ICON_IMAGE_ID, createStorefrontIconImage(), {
    pixelRatio: 2,
  });
}

function syncVendorSourceData(
  map: MapInstance,
  vendorData: VendorFeatureCollection,
  selectedVendorData: VendorFeatureCollection,
) {
  getGeoJsonSource(map, VENDOR_SOURCE_ID)?.setData(vendorData);
  getGeoJsonSource(map, SELECTED_VENDOR_SOURCE_ID)?.setData(selectedVendorData);
}

function ensureVendorClusterLayers(
  map: MapInstance,
  vendorData: VendorFeatureCollection,
  selectedVendorData: VendorFeatureCollection,
  isMobile: boolean,
) {
  if (!map.getSource(VENDOR_SOURCE_ID)) {
    map.addSource(VENDOR_SOURCE_ID, {
      type: "geojson",
      data: vendorData,
      cluster: true,
      clusterRadius: getVendorClusterRadius(isMobile),
      clusterMaxZoom: VENDOR_CLUSTER_MAX_ZOOM,
    });
  }

  if (!map.getSource(SELECTED_VENDOR_SOURCE_ID)) {
    map.addSource(SELECTED_VENDOR_SOURCE_ID, {
      type: "geojson",
      data: selectedVendorData,
    });
  }

  ensureStorefrontIconImage(map);

  if (!map.getLayer(VENDOR_CLUSTERS_LAYER_ID)) {
    map.addLayer({
      id: VENDOR_CLUSTERS_LAYER_ID,
      type: "circle",
      source: VENDOR_SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#24614f",
          10,
          "#b86b1d",
          50,
          "#793f2d",
        ],
        "circle-radius": [
          "step",
          ["get", "point_count"],
          isMobile ? 20 : 18,
          10,
          isMobile ? 26 : 23,
          50,
          isMobile ? 32 : 28,
        ],
        "circle-stroke-color": "#fffdf8",
        "circle-stroke-width": 2,
        "circle-opacity": 0.95,
      },
    });
  }

  if (!map.getLayer(VENDOR_CLUSTER_COUNT_LAYER_ID)) {
    map.addLayer({
      id: VENDOR_CLUSTER_COUNT_LAYER_ID,
      type: "symbol",
      source: VENDOR_SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": isMobile ? 13 : 12,
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#fffdf8",
      },
    });
  }

  if (!map.getLayer(VENDOR_UNCLUSTERED_LAYER_ID)) {
    map.addLayer({
      id: VENDOR_UNCLUSTERED_LAYER_ID,
      type: "circle",
      source: VENDOR_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": [
          "case",
          [">", ["get", "sameLocationCount"], 1],
          "#b86b1d",
          "#c7582c",
        ],
        "circle-radius": [
          "case",
          [">", ["get", "sameLocationCount"], 1],
          isMobile ? 18 : 16,
          isMobile ? 16 : 14,
        ],
        "circle-stroke-color": "#fffdf8",
        "circle-stroke-width": 2,
        "circle-opacity": 0.96,
      },
    });
  }

  if (!map.getLayer(VENDOR_UNCLUSTERED_ICON_LAYER_ID)) {
    map.addLayer({
      id: VENDOR_UNCLUSTERED_ICON_LAYER_ID,
      type: "symbol",
      source: VENDOR_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      layout: {
        "icon-image": VENDOR_STOREFRONT_ICON_IMAGE_ID,
        "icon-size": isMobile ? 1.08 : 1,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });
  }

  if (!map.getLayer(VENDOR_SELECTED_OVERLAY_LAYER_ID)) {
    map.addLayer({
      id: VENDOR_SELECTED_OVERLAY_LAYER_ID,
      type: "circle",
      source: SELECTED_VENDOR_SOURCE_ID,
      paint: {
        "circle-color": "#24614f",
        "circle-radius": isMobile ? 23 : 20,
        "circle-stroke-color": "#fffdf8",
        "circle-stroke-width": 4,
        "circle-opacity": 0.98,
        "circle-stroke-opacity": 1,
      },
    });
  }

  if (!map.getLayer(VENDOR_SELECTED_OVERLAY_ICON_LAYER_ID)) {
    map.addLayer({
      id: VENDOR_SELECTED_OVERLAY_ICON_LAYER_ID,
      type: "symbol",
      source: SELECTED_VENDOR_SOURCE_ID,
      layout: {
        "icon-image": VENDOR_STOREFRONT_ICON_IMAGE_ID,
        "icon-size": isMobile ? 1.18 : 1.1,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });
  }
}

function setPointerCursor(map: MapInstance, enabled: boolean) {
  map.getCanvas().style.cursor = enabled ? "pointer" : "";
}

function installMapDebug(
  map: MapInstance,
  cameraStateRef: MutableRefObject<CameraState>,
  latestVendorsRef: MutableRefObject<NearbyVendor[]>,
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
      return map
        .querySourceFeatures(VENDOR_SOURCE_ID)
        .filter((feature) => Boolean(feature.properties?.cluster)).length;
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
      const vendor = latestVendorsRef.current.find((entry) => entry.vendor_id === vendorId);
      if (!vendor) {
        return [];
      }

      const center = getVendorMapCenter(vendor);
      if (!center) {
        return [];
      }

      const point = map.project(center);

      return map
        .queryRenderedFeatures(point, {
          layers: [
            VENDOR_SELECTED_OVERLAY_ICON_LAYER_ID,
            VENDOR_SELECTED_OVERLAY_LAYER_ID,
            VENDOR_UNCLUSTERED_ICON_LAYER_ID,
            VENDOR_UNCLUSTERED_LAYER_ID,
            VENDOR_CLUSTERS_LAYER_ID,
          ],
        })
        .map((feature) => feature.layer.id);
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
  const [sameLocationVendorId, setSameLocationVendorId] = useState<string | null>(null);
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
  const sameLocationGroups = useMemo(() => getSameLocationGroups(vendors), [vendors]);
  const vendorFeatureCollection = useMemo(
    () => createVendorFeatureCollection(vendors, sameLocationGroups),
    [sameLocationGroups, vendors],
  );
  const selectedVendorFeatureCollection = useMemo(
    () => createSelectedVendorFeatureCollection(vendors, selectedVendorId),
    [selectedVendorId, vendors],
  );
  const activeSameLocationGroup = useMemo<SameLocationGroup | null>(() => {
    const explicitGroup = getSameLocationGroupForVendor(sameLocationGroups, sameLocationVendorId);
    if (explicitGroup && explicitGroup.vendors.length > 1) {
      return explicitGroup;
    }

    const selectedGroup = getSameLocationGroupForVendor(sameLocationGroups, selectedVendorId);
    return selectedGroup && selectedGroup.vendors.length > 1 ? selectedGroup : null;
  }, [sameLocationGroups, sameLocationVendorId, selectedVendorId]);

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
            const initialSameLocationGroups = getSameLocationGroups(latestVendorsRef.current);
            const initialVendorData = createVendorFeatureCollection(
              latestVendorsRef.current,
              initialSameLocationGroups,
            );
            const initialSelectedVendorData = createSelectedVendorFeatureCollection(
              latestVendorsRef.current,
              latestSelectedVendorIdRef.current,
            );
            ensureVendorClusterLayers(
              map,
              initialVendorData,
              initialSelectedVendorData,
              isMobileMapViewport(),
            );
            if (
              !hasReportedVisibleMarkersRef.current &&
              initialVendorData.features.length > 0
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
            installMapDebug(map, cameraStateRef, latestVendorsRef);

            map.on("click", VENDOR_CLUSTERS_LAYER_ID, (event) => {
              const feature = event.features?.[0];
              const clusterId = Number(feature?.properties?.cluster_id);
              const coordinates =
                feature?.geometry.type === "Point"
                  ? feature.geometry.coordinates
                  : null;

              if (!Number.isFinite(clusterId) || !coordinates) {
                return;
              }

              const source = getGeoJsonSource(map, VENDOR_SOURCE_ID);
              void source?.getClusterExpansionZoom(clusterId).then((zoom) => {
                if (cancelled || !loadedRef.current) {
                  return;
                }

                const offset = getClusterExpansionCameraOffset(isMobileMapViewport());
                easeMapTo(map, cameraStateRef, "map", {
                  center: coordinates as VendorMapCenter,
                  zoom: Math.min(Math.max(zoom + 0.25, map.getZoom()), 16),
                  duration: CLUSTER_EXPANSION_ANIMATION_MS,
                  ...(offset ? { offset: new maplibre.Point(...offset) } : {}),
                });
              });
            });

            map.on("click", VENDOR_UNCLUSTERED_LAYER_ID, (event) => {
              const feature = event.features?.[0];
              const vendorId = feature?.properties?.vendorId;

              if (typeof vendorId !== "string" || vendorId.length === 0) {
                return;
              }

              const sameLocationGroup = getSameLocationGroupForVendor(
                getSameLocationGroups(latestVendorsRef.current),
                vendorId,
              );

              setSameLocationVendorId(
                sameLocationGroup && sameLocationGroup.vendors.length > 1
                  ? vendorId
                  : null,
              );
              latestSelectVendorRef.current(vendorId, "map");
            });

            map.on("mouseenter", VENDOR_CLUSTERS_LAYER_ID, () => setPointerCursor(map, true));
            map.on("mouseleave", VENDOR_CLUSTERS_LAYER_ID, () => setPointerCursor(map, false));
            map.on("mouseenter", VENDOR_UNCLUSTERED_LAYER_ID, () => setPointerCursor(map, true));
            map.on("mouseleave", VENDOR_UNCLUSTERED_LAYER_ID, () => setPointerCursor(map, false));
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
    ensureVendorClusterLayers(
      map,
      vendorFeatureCollection,
      selectedVendorFeatureCollection,
      isMobileMapViewport(),
    );
    syncVendorSourceData(map, vendorFeatureCollection, selectedVendorFeatureCollection);
    installMapDebug(map, cameraStateRef, latestVendorsRef);

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
      vendorFeatureCollection.features.length > 0
    ) {
      hasReportedVisibleMarkersRef.current = true;
      latestMarkersVisibleRef.current();
    }
  }, [
    selectedVendorFeatureCollection,
    vendorFeatureCollection,
    vendors,
    viewportKey,
  ]);

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

    const maplibre = maplibreRef.current;
    const offset = getSelectionCameraOffset(isMobileMapViewport());
    easeMapTo(map, cameraStateRef, selectionSource, {
      center: selectedVendorCameraTarget.center,
      zoom: selectedVendorCameraTarget.zoom,
      duration:
        selectionSource === "card"
          ? CARD_SELECTION_ANIMATION_MS
          : MAP_SELECTION_ANIMATION_MS,
      ...(offset && maplibre ? { offset: new maplibre.Point(...offset) } : {}),
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
      <div className="map-vendor-accessibility-list" aria-label="Map vendors">
        {vendors.map((vendor) => (
          <button
            aria-pressed={vendor.vendor_id === selectedVendorId}
            className={
              vendor.vendor_id === selectedVendorId
                ? "map-vendor-accessibility-button selected"
                : "map-vendor-accessibility-button"
            }
            data-vendor-id={vendor.vendor_id}
            key={vendor.vendor_id}
            type="button"
            onClick={() => onSelectVendor(vendor.vendor_id, "map")}
          >
            Select {vendor.name}
          </button>
        ))}
      </div>
      {activeSameLocationGroup ? (
        <div
          className="map-same-location-panel"
          data-testid="map-same-location-panel"
        >
          <strong>{activeSameLocationGroup.vendors.length} vendors at this location</strong>
          <div className="map-same-location-list">
            {activeSameLocationGroup.vendors.map((vendor) => (
              <button
                aria-current={vendor.vendor_id === selectedVendorId ? "true" : undefined}
                className={
                  vendor.vendor_id === selectedVendorId
                    ? "map-same-location-button selected"
                    : "map-same-location-button"
                }
                data-vendor-id={vendor.vendor_id}
                key={vendor.vendor_id}
                type="button"
                onClick={() => {
                  setSameLocationVendorId(vendor.vendor_id);
                  onSelectVendor(vendor.vendor_id, "map");
                }}
              >
                <span>{vendor.name}</span>
                {vendor.area ? <small>{vendor.area}</small> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="map-legend">
        <span>Search location</span>
        <span>{vendors.length} vendors</span>
      </div>
    </section>
  );
}

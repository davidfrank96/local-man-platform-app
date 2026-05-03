"use client";

import { memo, useEffect, useRef, useState, type ComponentType } from "react";
import {
  browserSupportsVendorMapRendering,
  getPublicMapStyleUrl,
  MAP_FALLBACK_NOTICE,
} from "./vendor-map-config.ts";
import { endDevTimer, startDevTimer } from "../../lib/public/dev-performance.ts";
import { VendorMapFallback } from "./vendor-map-fallback.tsx";
import type { VendorMapProps } from "./vendor-map-types.ts";

type MapLibreVendorMapComponent = ComponentType<
  VendorMapProps & {
    onMapError: () => void;
    onMapReady: () => void;
    onMarkersVisible: () => void;
    styleUrl: string;
  }
>;

function VendorMapComponent(props: VendorMapProps) {
  const mapTheme = props.timeTheme ?? "morning";
  const [MapLibreComponent, setMapLibreComponent] = useState<MapLibreVendorMapComponent | null>(
    null,
  );
  const [fallbackReason, setFallbackReason] = useState<
    "missing_style_url" | "unsupported_browser" | "map_error" | null
  >(() => {
    const styleUrl = getPublicMapStyleUrl();
    return styleUrl.length === 0 ? "missing_style_url" : null;
  });
  const mapStyleUrl = getPublicMapStyleUrl();
  const mapInitReportedRef = useRef(false);
  const markersVisibleReportedRef = useRef(false);

  useEffect(() => {
    startDevTimer("map_init");
    startDevTimer("markers_visible");
  }, []);

  const handleMapReady = () => {
    if (mapInitReportedRef.current) {
      return;
    }

    endDevTimer("map_init");
    mapInitReportedRef.current = true;
  };

  const handleMarkersVisible = () => {
    if (markersVisibleReportedRef.current) {
      return;
    }

    endDevTimer("markers_visible");
    markersVisibleReportedRef.current = true;
  };

  useEffect(() => {
    let cancelled = false;
    let unsupportedBrowserFrame: number | null = null;

    if (fallbackReason || mapStyleUrl.length === 0) {
      return;
    }

    if (!browserSupportsVendorMapRendering()) {
      unsupportedBrowserFrame = window.requestAnimationFrame(() => {
        setFallbackReason("unsupported_browser");
      });
      return () => {
        if (unsupportedBrowserFrame !== null) {
          window.cancelAnimationFrame(unsupportedBrowserFrame);
        }
      };
    }

    void import("./vendor-map-maplibre.tsx")
      .then((module) => {
        if (cancelled) {
          return;
        }

        setMapLibreComponent(() => module.MapLibreVendorMap);
      })
      .catch(() => {
        if (!cancelled) {
          setFallbackReason("map_error");
        }
      });

    return () => {
      cancelled = true;
      if (unsupportedBrowserFrame !== null) {
        window.cancelAnimationFrame(unsupportedBrowserFrame);
      }
    };
  }, [fallbackReason, mapStyleUrl]);

  if (!fallbackReason && mapStyleUrl.length > 0 && !MapLibreComponent) {
    return (
      <div className="vendor-map-theme-shell" data-time-theme={mapTheme}>
        <section
          className="discovery-map waiting-map"
          aria-label="Nearby vendor map"
          data-map-mode="loading"
          data-time-theme={mapTheme}
        >
          <strong>Loading map…</strong>
        </section>
      </div>
    );
  }

  if (fallbackReason || mapStyleUrl.length === 0 || !MapLibreComponent) {
    return (
      <div className="vendor-map-theme-shell" data-time-theme={mapTheme}>
        <VendorMapFallback
          {...props}
          notice={fallbackReason ? MAP_FALLBACK_NOTICE : null}
        />
      </div>
    );
  }

  return (
    <div className="vendor-map-theme-shell" data-time-theme={mapTheme}>
      <MapLibreComponent
        {...props}
        onMapError={() => setFallbackReason("map_error")}
        onMapReady={handleMapReady}
        onMarkersVisible={handleMarkersVisible}
        styleUrl={mapStyleUrl}
      />
    </div>
  );
}

export const VendorMap = memo(VendorMapComponent);

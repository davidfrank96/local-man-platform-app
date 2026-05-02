"use client";

import { useEffect, useState, type ComponentType } from "react";
import {
  browserSupportsVendorMapRendering,
  getPublicMapStyleUrl,
  MAP_FALLBACK_NOTICE,
} from "./vendor-map-config.ts";
import { VendorMapFallback } from "./vendor-map-fallback.tsx";
import type { VendorMapProps } from "./vendor-map-types.ts";

type MapLibreVendorMapComponent = ComponentType<
  VendorMapProps & { onMapError: () => void; styleUrl: string }
>;

export function VendorMap(props: VendorMapProps) {
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
        styleUrl={mapStyleUrl}
      />
    </div>
  );
}

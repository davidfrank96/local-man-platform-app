import type { MouseEvent } from "react";

import type { Coordinates } from "../../lib/location/distance.ts";
import {
  DEFAULT_VENDOR_MAP_CENTER,
  type VendorMapProps,
} from "./vendor-map-types.ts";
import { StoreMarkerIcon } from "./vendor-marker-icon.tsx";

type VendorMapFallbackProps = VendorMapProps & {
  notice?: string | null;
};

function getMarkerStyle(
  point: Coordinates,
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  },
): {
  left: string;
  top: string;
} {
  const lngRange = bounds.maxLng - bounds.minLng || 0.01;
  const latRange = bounds.maxLat - bounds.minLat || 0.01;
  const left = ((point.lng - bounds.minLng) / lngRange) * 78 + 11;
  const top = (1 - (point.lat - bounds.minLat) / latRange) * 72 + 14;

  return {
    left: `${Math.min(92, Math.max(8, left))}%`,
    top: `${Math.min(90, Math.max(8, top))}%`,
  };
}

function getClosestFallbackMarkerVendorId(
  event: MouseEvent<HTMLButtonElement>,
  fallbackVendorId: string,
  selectedVendorId: string | null,
) {
  if (event.clientX === 0 && event.clientY === 0) {
    return fallbackVendorId;
  }

  const grid = event.currentTarget.closest(".discovery-map-grid");
  if (!grid) {
    return fallbackVendorId;
  }

  const markers = Array.from(
    grid.querySelectorAll<HTMLButtonElement>(".vendor-marker[data-vendor-id]"),
  );

  let closestVendorId = fallbackVendorId;
  let closestScore = Number.POSITIVE_INFINITY;

  markers.forEach((marker, index) => {
    const vendorId = marker.dataset.vendorId;
    if (!vendorId) {
      return;
    }

    const rect = marker.getBoundingClientRect();
    const markerCenterX = rect.left + rect.width / 2;
    const markerCenterY = rect.top + rect.height / 2;
    const distanceScore =
      (event.clientX - markerCenterX) ** 2 + (event.clientY - markerCenterY) ** 2;
    const tieBreaker =
      vendorId === selectedVendorId
        ? -0.2
        : vendorId === fallbackVendorId
          ? -0.1
          : index * 0.001;
    const score = distanceScore + tieBreaker;

    if (score < closestScore) {
      closestScore = score;
      closestVendorId = vendorId;
    }
  });

  return closestVendorId;
}

export function VendorMapFallback({
  vendors,
  userLocation,
  selectedVendorId,
  onSelectVendor,
  notice = null,
}: VendorMapFallbackProps) {
  const resolvedUserLocation = userLocation ?? DEFAULT_VENDOR_MAP_CENTER;
  const lats = [resolvedUserLocation.lat, ...vendors.map((vendor) => vendor.latitude)];
  const lngs = [resolvedUserLocation.lng, ...vendors.map((vendor) => vendor.longitude)];
  const bounds = {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };

  return (
    <section className="discovery-map" aria-label="Nearby vendor map" data-map-mode="fallback">
      <div className="discovery-map-grid">
        <span
          aria-label="Search location"
          className="user-marker"
          role="img"
          style={getMarkerStyle(resolvedUserLocation, bounds)}
          title="Search location"
        />
        {vendors.map((vendor, index) => {
          const selected = vendor.vendor_id === selectedVendorId;

          return (
            <button
              aria-label={`Select ${vendor.name}`}
              className={selected ? "vendor-marker selected" : "vendor-marker"}
              data-vendor-id={vendor.vendor_id}
              key={vendor.vendor_id}
              style={{
                ...getMarkerStyle(
                  { lat: vendor.latitude, lng: vendor.longitude },
                  bounds,
                ),
                zIndex: selected ? vendors.length + 3 : vendors.length - index + 2,
              }}
              type="button"
              onClick={(event) =>
                onSelectVendor(
                  getClosestFallbackMarkerVendorId(event, vendor.vendor_id, selectedVendorId),
                  "map",
                )
              }
            >
              <StoreMarkerIcon className="vendor-marker__icon" />
            </button>
          );
        })}
      </div>
      {notice ? <p className="map-fallback-notice">{notice}</p> : null}
      <div className="map-legend">
        <span>Search location</span>
        <span>{vendors.length} vendors</span>
      </div>
    </section>
  );
}

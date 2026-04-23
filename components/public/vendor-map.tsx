import type { Coordinates } from "../../lib/location/distance.ts";
import type { NearbyVendorsResponseData } from "../../types/index.ts";

type NearbyVendor = NearbyVendorsResponseData["vendors"][number];

type VendorMapProps = {
  vendors: NearbyVendor[];
  userLocation: Coordinates;
  selectedVendorId: string | null;
  onSelectVendor: (vendorId: string) => void;
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

export function VendorMap({
  vendors,
  userLocation,
  selectedVendorId,
  onSelectVendor,
}: VendorMapProps) {
  const lats = [userLocation.lat, ...vendors.map((vendor) => vendor.latitude)];
  const lngs = [userLocation.lng, ...vendors.map((vendor) => vendor.longitude)];
  const bounds = {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };

  return (
    <section className="discovery-map" aria-label="Nearby vendor map">
      <div className="discovery-map-grid">
        <span
          aria-label="Search location"
          className="user-marker"
          role="img"
          style={getMarkerStyle(userLocation, bounds)}
          title="Search location"
        />
        {vendors.map((vendor, index) => (
          <button
            aria-label={`Select ${vendor.name}`}
            className={
              vendor.vendor_id === selectedVendorId
                ? "vendor-marker selected"
                : "vendor-marker"
            }
            key={vendor.vendor_id}
            style={getMarkerStyle(
              { lat: vendor.latitude, lng: vendor.longitude },
              bounds,
            )}
            type="button"
            onClick={() => onSelectVendor(vendor.vendor_id)}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <div className="map-legend">
        <span>Search location</span>
        <span>{vendors.length} vendors</span>
      </div>
    </section>
  );
}

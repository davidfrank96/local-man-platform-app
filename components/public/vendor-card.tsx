import Link from "next/link";
import type { NearbyVendorsResponseData } from "../../types/index.ts";
import { VendorActions } from "./vendor-actions.tsx";

type NearbyVendor = NearbyVendorsResponseData["vendors"][number];

type VendorCardProps = {
  vendor: NearbyVendor;
  selected: boolean;
  approximateDistance: boolean;
  onSelect: (vendorId: string) => void;
};

function formatDistance(distanceKm: number, approximateDistance: boolean): string {
  const prefix = approximateDistance ? "About " : "";

  if (distanceKm < 1) {
    return `${prefix}${Math.round(distanceKm * 1000)} m`;
  }

  return `${prefix}${distanceKm.toFixed(1)} km`;
}

function formatRating(averageRating: number, reviewCount: number): string {
  if (reviewCount === 0) return "No ratings yet";

  return `${averageRating.toFixed(1)} from ${reviewCount} ratings`;
}

export function VendorCard({
  vendor,
  selected,
  approximateDistance,
  onSelect,
}: VendorCardProps) {
  return (
    <article className={selected ? "vendor-card selected" : "vendor-card"}>
      <div className="vendor-card-main">
        <span className={vendor.is_open_now ? "status-open" : "status-closed"}>
          {vendor.is_open_now ? "Open now" : "Closed"}
        </span>
        <h3>{vendor.name}</h3>
        <p>{vendor.short_description ?? "Local food vendor"}</p>
        <dl className="vendor-meta">
          <div>
            <dt>Distance</dt>
            <dd>{formatDistance(vendor.distance_km, approximateDistance)}</dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd>{vendor.area ?? "Abuja"}</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd>{formatRating(vendor.average_rating, vendor.review_count)}</dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>{vendor.price_band ?? "Not set"}</dd>
          </div>
        </dl>
      </div>
      <div className="vendor-card-footer">
        <button
          className="button-secondary compact-button"
          type="button"
          onClick={() => onSelect(vendor.vendor_id)}
        >
          Select
        </button>
        <Link className="button-secondary compact-button" href={`/vendors/${vendor.slug}`}>
          Details
        </Link>
        <VendorActions
          latitude={vendor.latitude}
          longitude={vendor.longitude}
          phoneNumber={vendor.phone_number}
        />
      </div>
    </article>
  );
}

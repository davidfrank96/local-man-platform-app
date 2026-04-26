import Link from "next/link";
import type { LocationSource, NearbyVendorsResponseData } from "../../types/index.ts";
import {
  formatVendorCardDistance,
  getVendorOpenStateDisplay,
  formatVendorCardPriceBand,
  formatVendorCardRating,
} from "../../lib/vendors/card-display.ts";
import { VendorActions } from "./vendor-actions.tsx";

type NearbyVendor = NearbyVendorsResponseData["vendors"][number];

type VendorCardProps = {
  vendor: NearbyVendor;
  selected: boolean;
  isPopular: boolean;
  approximateDistance: boolean;
  detailHref: string;
  locationSource?: LocationSource | null;
  onSelect: (vendorId: string, source: "card") => void;
};

function getVendorCue(vendor: NearbyVendor): string | null {
  return vendor.featured_dish?.dish_name ?? vendor.short_description;
}

export function VendorCard({
  vendor,
  selected,
  isPopular,
  approximateDistance,
  detailHref,
  locationSource,
  onSelect,
}: VendorCardProps) {
  const metaLine = [
    formatVendorCardPriceBand(vendor.price_band),
    vendor.area,
  ]
    .filter(Boolean)
    .join(" • ");
  const cue = getVendorCue(vendor);
  const ratingLabel = formatVendorCardRating(
    vendor.average_rating,
    vendor.review_count,
  );
  const openState = getVendorOpenStateDisplay(vendor.is_open_now);

  return (
    <article className={selected ? "vendor-card selected" : "vendor-card"}>
      <button
        aria-label={`Preview ${vendor.name} on map`}
        aria-pressed={selected}
        className="vendor-card-preview"
        type="button"
        onClick={() => onSelect(vendor.vendor_id, "card")}
      >
        <div className="vendor-card-main">
          {isPopular ? <span className="vendor-card-popular-badge">Popular nearby</span> : null}
          <h3>{vendor.name}</h3>
          <p className="vendor-card-status-line">
            <span>{formatVendorCardDistance(vendor.distance_km, approximateDistance)}</span>
            <span aria-hidden="true">•</span>
            <span className={openState.toneClassName}>{openState.label}</span>
          </p>
          <p className="vendor-card-hours-line">
            <span className="vendor-card-hours-label">Today:</span> {vendor.today_hours}
          </p>
          {cue ? <p className="vendor-card-cue">{cue}</p> : null}
          <div className="vendor-card-supporting">
            {metaLine ? <p className="vendor-card-meta-line">{metaLine}</p> : null}
            <span className="vendor-card-rating">{ratingLabel}</span>
          </div>
          <p className="vendor-card-helper" aria-hidden="true">
            Tap to preview on map
          </p>
        </div>
      </button>
      <div className="vendor-card-footer">
        <VendorActions
          latitude={vendor.latitude}
          longitude={vendor.longitude}
          phoneNumber={vendor.phone_number}
          source="card"
          vendorId={vendor.vendor_id}
          vendorSlug={vendor.slug}
          locationSource={locationSource}
        />
        <Link className="vendor-card-detail-link" href={detailHref}>
          View details →
        </Link>
      </div>
    </article>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
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

function CardIcon({ children }: { children: ReactNode }) {
  return <span className="vendor-card-icon" aria-hidden="true">{children}</span>;
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
  const isNewRating = ratingLabel === "New";
  const openState = getVendorOpenStateDisplay(vendor.is_open_now);
  const statusBadgeClassName =
    openState.toneClassName === "vendor-card-status-open"
      ? "vendor-card-status-badge vendor-card-status-open"
      : openState.toneClassName === "vendor-card-status-closed"
        ? "vendor-card-status-badge vendor-card-status-closed"
        : "vendor-card-status-badge vendor-card-status-unavailable";

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
          <div className="vendor-card-shell">
            <div className="vendor-card-copy">
              <div className="vendor-card-head">
                <h3>{vendor.name}</h3>
                <span className={statusBadgeClassName}>{openState.label}</span>
              </div>
              {cue ? (
                <p className="vendor-card-cue">
                  <CardIcon>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M4.5 2.5v11" strokeLinecap="round" />
                      <path d="M8.5 2.5v11" strokeLinecap="round" />
                      <path d="M2.5 5.5h8" strokeLinecap="round" />
                      <path d="M11.5 2.5a2.5 2.5 0 1 1 0 5v4.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </CardIcon>
                  <span>{cue}</span>
                </p>
              ) : null}
              <div className="vendor-card-info-grid">
                <p className="vendor-card-status-line">
                  <CardIcon>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M8 14s4-3.9 4-7A4 4 0 1 0 4 7c0 3.1 4 7 4 7Z" strokeLinejoin="round" />
                      <circle cx="8" cy="7" r="1.5" />
                    </svg>
                  </CardIcon>
                  <span>{formatVendorCardDistance(vendor.distance_km, approximateDistance)}</span>
                  <span className="vendor-card-status-separator" aria-hidden="true">•</span>
                  <span className={`vendor-card-status-text ${openState.toneClassName}`}>{openState.label}</span>
                </p>
                <p className="vendor-card-hours-line">
                  <CardIcon>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <circle cx="8" cy="8" r="5.5" />
                      <path d="M8 4.8v3.6l2.4 1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </CardIcon>
                  <span>
                    <span className="vendor-card-hours-label vendor-card-hours-label-desktop">Active hours:</span>
                    <span className="vendor-card-hours-label vendor-card-hours-label-mobile">Active hours:</span>{" "}
                    {vendor.today_hours}
                  </span>
                </p>
                {metaLine ? (
                  <p className="vendor-card-meta-line">
                    <CardIcon>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M3 4h10" strokeLinecap="round" />
                        <path d="M3 8h10" strokeLinecap="round" />
                        <path d="M3 12h10" strokeLinecap="round" />
                      </svg>
                    </CardIcon>
                    <span>{metaLine}</span>
                  </p>
                ) : null}
                <span className={isNewRating ? "vendor-card-rating vendor-card-rating-new" : "vendor-card-rating"}>
                  <CardIcon>
                    <svg viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1.8 9.8 5.6l4.2.6-3 2.9.7 4.1L8 11.1 4.3 13.2 5 9.1 2 6.2l4.2-.6L8 1.8Z" />
                    </svg>
                  </CardIcon>
                  <span>{ratingLabel}</span>
                </span>
              </div>
              <p className="vendor-card-helper" aria-hidden="true">
                Tap to preview on map
              </p>
            </div>
          </div>
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

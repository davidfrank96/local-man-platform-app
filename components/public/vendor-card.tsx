import Link from "next/link";
import { memo, type ReactNode } from "react";
import type { LocationSource } from "../../types/index.ts";
import {
  formatVendorCardDistance,
  getVendorActiveHoursLabel,
  formatVendorCardPriceBand,
  formatVendorCardRating,
  getVendorCurrentStatusDisplay,
  getVendorCue,
} from "../../lib/vendors/card-display.ts";
import {
  hasValidVendorCoordinates,
  type NormalizedVendor,
} from "../../lib/public/vendor-normalization.ts";
import { VendorActions } from "./vendor-actions.tsx";

type VendorCardProps = {
  vendor: NormalizedVendor;
  selected: boolean;
  isPopular: boolean;
  approximateDistance: boolean;
  detailHref: string;
  locationSource?: LocationSource | null;
  onSelect: (vendorId: string, source: "card") => void;
};

function getDisplayVendorName(vendor: NormalizedVendor): string {
  const raw = vendor?.name;

  if (!raw) return "Unknown Vendor";

  const trimmed = String(raw).trim();

  if (trimmed.length === 0) return "Unknown Vendor";

  return trimmed;
}

function getVendorDistanceLabel(
  vendor: NormalizedVendor,
  approximateDistance: boolean,
): string {
  if (typeof vendor.distanceKm === "number" && Number.isFinite(vendor.distanceKm)) {
    return formatVendorCardDistance(vendor.distanceKm, approximateDistance);
  }

  if (hasValidVendorCoordinates(vendor)) {
    return formatVendorCardDistance(vendor.distance_km, approximateDistance);
  }

  return "Distance unavailable";
}

function CardIcon({ children }: { children: ReactNode }) {
  return <span className="vendor-card-icon" aria-hidden="true">{children}</span>;
}

function formatCategoryFallback(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getCategoryIcon(label: string): string {
  const normalizedLabel = label.toLowerCase();

  if (/\b(rice|swallow|jollof)\b/.test(normalizedLabel)) return "🍚";
  if (/\b(local|african|traditional|native)\b/.test(normalizedLabel)) return "🌍";
  if (/\b(grill|grills|suya|barbecue|bbq)\b/.test(normalizedLabel)) return "🔥";
  if (/\b(chicken|turkey|wings)\b/.test(normalizedLabel)) return "🍗";
  if (/\b(soup|soups|stew|pepper soup)\b/.test(normalizedLabel)) return "🥣";
  if (/\b(snack|snacks|small chops|pastry|pastries)\b/.test(normalizedLabel)) return "🥟";
  if (/\b(drink|drinks|juice|smoothie|beverage)\b/.test(normalizedLabel)) return "🥤";

  return "🍛";
}

function getVendorCategoryTags(vendor: NormalizedVendor): Array<{ label: string; icon: string }> {
  const categories = Array.isArray(vendor.categories) ? vendor.categories : [];
  const seenLabels = new Set<string>();

  return categories.flatMap((category) => {
    const rawName = typeof category.name === "string" ? category.name.trim() : "";
    const rawSlug = typeof category.slug === "string" ? category.slug.trim() : "";
    const label = rawName || (rawSlug ? formatCategoryFallback(rawSlug) : "");

    if (!label) return [];

    const normalizedLabel = label.toLowerCase();

    if (seenLabels.has(normalizedLabel)) return [];

    seenLabels.add(normalizedLabel);

    return [{
      label,
      icon: getCategoryIcon(label),
    }];
  }).slice(0, 2);
}

function VendorCardComponent({
  vendor,
  selected,
  isPopular,
  approximateDistance,
  detailHref,
  locationSource,
  onSelect,
}: VendorCardProps) {
  const vendorId = vendor.vendor_id || vendor.id;
  const vendorName = getDisplayVendorName(vendor);
  const vendorArea =
    typeof vendor.area === "string" && vendor.area.trim().length > 0
      ? vendor.area.trim()
      : null;
  const vendorTodayHours = getVendorActiveHoursLabel(vendor);
  const metaLine = [
    formatVendorCardPriceBand(vendor.price_band),
    vendorArea,
  ]
    .filter(Boolean)
    .join(" • ");
  const cue = getVendorCue(vendor);
  const categoryTags = getVendorCategoryTags(vendor);
  const ratingLabel = formatVendorCardRating(
    vendor.average_rating,
    vendor.review_count,
  );
  const isNewRating = ratingLabel === "New";
  const openState = getVendorCurrentStatusDisplay(vendor.is_open_now);
  const statusBadgeClassName =
    openState.toneClassName === "vendor-card-status-open"
      ? "vendor-card-status-badge vendor-card-status-open"
      : openState.toneClassName === "vendor-card-status-closed"
        ? "vendor-card-status-badge vendor-card-status-closed"
        : "vendor-card-status-badge vendor-card-status-unavailable";

  return (
    <article
      className={selected ? "vendor-card selected" : "vendor-card"}
      data-vendor-id={vendorId}
    >
      <button
        aria-label={`Preview ${vendorName} on map`}
        aria-pressed={selected}
        className="vendor-card-preview"
        type="button"
        onClick={() => onSelect(vendorId, "card")}
      >
        <div className="vendor-card-main">
          {isPopular ? <span className="vendor-card-popular-badge">Popular nearby</span> : null}
          <div className="vendor-card-shell">
            <div className="vendor-card-copy">
              <div className="vendor-card-head">
                <h3>{vendorName}</h3>
                <span className={statusBadgeClassName}>{openState.label}</span>
              </div>
              {categoryTags.length > 0 ? (
                <div className="vendor-card-tags" aria-label="Vendor categories">
                  {categoryTags.map((tag) => (
                    <span className="vendor-card-category-tag" key={tag.label}>
                      <span aria-hidden="true">{tag.icon}</span>
                      <span>{tag.label}</span>
                    </span>
                  ))}
                </div>
              ) : null}
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
                  <span>{getVendorDistanceLabel(vendor, approximateDistance)}</span>
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
                    {vendorTodayHours}
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
        {hasValidVendorCoordinates(vendor) ? (
          <VendorActions
            latitude={vendor.latitude}
            longitude={vendor.longitude}
            phoneNumber={vendor.phone_number}
            source="card"
            vendorId={vendorId}
            vendorSlug={vendor.slug}
            locationSource={locationSource}
          />
        ) : null}
        <Link className="vendor-card-detail-link" href={detailHref}>
          View details →
        </Link>
      </div>
    </article>
  );
}

export const VendorCard = memo(VendorCardComponent);

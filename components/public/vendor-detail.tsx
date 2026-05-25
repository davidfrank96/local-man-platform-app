import Link from "next/link";
import type { LocationSource, VendorDetailResponseData } from "../../types/index.ts";
import { selectPrimaryVendorImage } from "../../lib/vendors/images.ts";
import { formatVendorHoursRange } from "../../lib/vendors/time-display.ts";
import { VendorActions } from "./vendor-actions.tsx";
import { VendorDetailTracker } from "./vendor-detail-tracker.tsx";
import { VendorHeroImage } from "./vendor-hero-image.tsx";
import { VendorRating } from "./vendor-rating.tsx";
import { RiderConnectModal } from "./rider-connect-modal.tsx";
import { VendorShareActions } from "./vendor-share-actions.tsx";
import { formatVendorCardRating } from "../../lib/vendors/card-display.ts";
import { resolveVendorOpenState } from "../../lib/vendors/hours.ts";

type VendorDetailProps = {
  vendor: VendorDetailResponseData;
  returnTo?: string;
  locationSource?: LocationSource | null;
};

function readLocationSourceFromReturnTo(returnTo: string): LocationSource | null {
  try {
    const url = new URL(returnTo, "http://localhost");
    const locationSource = url.searchParams.get("location_source");

    return locationSource === "precise" ||
      locationSource === "approximate" ||
      locationSource === "default_city"
      ? locationSource
      : null;
  } catch {
    return null;
  }
}

const dayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatCount(count: number, singularLabel: string): string {
  return count === 1 ? `1 ${singularLabel}` : `${count} ${singularLabel}s`;
}

type VendorDetailSummaryIcon =
  | "status"
  | "area"
  | "phone"
  | "price"
  | "ratings"
  | "dishes";

function SummaryIcon({ icon }: { icon: VendorDetailSummaryIcon }) {
  if (icon === "status") {
    return (
      <span className="vendor-detail-summary-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="8" cy="8" r="4.8" fill="currentColor" fillOpacity="0.16" />
          <circle cx="8" cy="8" r="2.4" fill="currentColor" stroke="none" />
        </svg>
      </span>
    );
  }

  if (icon === "area") {
    return (
      <span className="vendor-detail-summary-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M8 14s4.5-4 4.5-8A4.5 4.5 0 0 0 3.5 6c0 4 4.5 8 4.5 8Z" />
          <circle cx="8" cy="6.1" r="1.5" />
        </svg>
      </span>
    );
  }

  if (icon === "phone") {
    return (
      <span className="vendor-detail-summary-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M5.1 2.4 6.2 5c.2.5.1 1-.3 1.3l-.7.7c.8 1.7 2.1 3 3.8 3.8l.7-.7c.4-.4.9-.5 1.3-.3l2.6 1.1c.4.2.7.6.7 1v1.3c0 .6-.5 1.1-1.1 1.1C6.9 14.3 1.8 9.1 1.8 2.9c0-.6.5-1.1 1.1-1.1h1.3c.4 0 .8.2.9.6Z" />
        </svg>
      </span>
    );
  }

  if (icon === "price") {
    return (
      <span className="vendor-detail-summary-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M2.5 7.9 8 13.4l5.2-5.2V3.5H8.5L2.5 7.9Z" />
          <circle cx="11" cy="5.7" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      </span>
    );
  }

  if (icon === "ratings") {
    return (
      <span className="vendor-detail-summary-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="m8 2.4 1.6 3.2 3.5.5-2.6 2.5.7 3.5L8 10.4l-3.2 1.7.7-3.5L2.9 6.1l3.5-.5L8 2.4Z" fill="currentColor" fillOpacity="0.18" />
        </svg>
      </span>
    );
  }

  return (
    <span className="vendor-detail-summary-icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 7.2h8a3.7 3.7 0 0 1-3.7 3.7h-.6A3.7 3.7 0 0 1 4 7.2Z" />
        <path d="M8 4.1v-2" />
        <path d="M3.1 12.9h9.8" />
      </svg>
    </span>
  );
}

function AreaPinIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeWidth="1.7"
      viewBox="0 0 16 16"
    >
      <path d="M8 14s4.2-3.9 4.2-8A4.2 4.2 0 0 0 3.8 6c0 4.1 4.2 8 4.2 8Z" />
      <circle cx="8" cy="6.1" r="1.35" />
    </svg>
  );
}

export function VendorDetail({
  vendor,
  returnTo = "/",
  locationSource: explicitLocationSource = null,
}: VendorDetailProps) {
  const heroImage = selectPrimaryVendorImage(vendor.images);
  const locationSource = explicitLocationSource ?? readLocationSourceFromReturnTo(returnTo);
  const hasHours = vendor.hours.length > 0;
  const resolvedIsOpenNow = resolveVendorOpenState({
    hours: vendor.hours,
    override: vendor.is_open_override,
    isOpenNow: vendor.is_open_now,
    todayHours: vendor.today_hours,
  });
  const statusLabel =
    vendor.is_open_override === null && !hasHours
      ? "Hours not set"
      : resolvedIsOpenNow
        ? "Open now"
        : "Closed now";
  const statusTone =
    vendor.is_open_override === null && !hasHours
      ? "status-neutral"
      : resolvedIsOpenNow
        ? "status-open"
        : "status-closed";
  const featuredDishLabel =
    vendor.featured_dishes.length > 0
      ? formatCount(vendor.featured_dishes.length, "featured dish")
      : "No featured dishes yet";
  const primaryFeaturedDish = vendor.featured_dishes[0] ?? null;
  const additionalFeaturedDishes = vendor.featured_dishes.slice(1);
  const todayHours = vendor.today_hours;

  return (
    <main className="vendor-detail-shell">
      <VendorDetailTracker
        isOpenNow={resolvedIsOpenNow === true}
        locationSource={locationSource}
        todayHours={todayHours}
        vendorArea={vendor.area}
        vendorId={vendor.id}
        vendorName={vendor.name}
        vendorSlug={vendor.slug}
      />
      <section className="vendor-detail-hero">
        <div className="vendor-detail-copy">
          <div className="vendor-detail-topline">
            <Link
              className="button-secondary compact-button vendor-detail-back-link"
              href={returnTo}
            >
              Back to map
            </Link>
            <p className="eyebrow vendor-detail-area-label">
              <AreaPinIcon />
              {vendor.area ?? "Area not set"}
            </p>
          </div>
          <h1>{vendor.name}</h1>
          <p className="vendor-detail-intro">
            {vendor.short_description ??
              "No description added yet. Check the hours and featured dishes below."}
          </p>
          <dl className="vendor-detail-summary">
            <div className="vendor-detail-summary-card vendor-detail-summary-status">
              <SummaryIcon icon="status" />
              <dt>Status</dt>
              <dd>
                <span className={statusTone}>{statusLabel}</span>
              </dd>
            </div>
            <div className="vendor-detail-summary-card">
              <SummaryIcon icon="area" />
              <dt>Area</dt>
              <dd>{vendor.area ?? "Area not set"}</dd>
            </div>
            <div className="vendor-detail-summary-card vendor-detail-summary-phone">
              <SummaryIcon icon="phone" />
              <dt>Phone</dt>
              <dd>{vendor.phone_number ?? "No phone yet"}</dd>
            </div>
            <div className="vendor-detail-summary-card">
              <SummaryIcon icon="price" />
              <dt>Price</dt>
              <dd>{vendor.price_band ?? "Price not set"}</dd>
            </div>
            <div className="vendor-detail-summary-card">
              <SummaryIcon icon="ratings" />
              <dt>Ratings</dt>
              <dd>
                {formatVendorCardRating(
                  vendor.rating_summary.average_rating,
                  vendor.rating_summary.review_count,
                )}
                {vendor.rating_badges.length > 0 ? (
                  <span
                    aria-label="Localman confidence badges"
                    className="vendor-confidence-badges"
                  >
                    {vendor.rating_badges.map((badge) => (
                      <span className="vendor-confidence-badge" key={badge.slug}>
                        {badge.label}
                      </span>
                    ))}
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="vendor-detail-summary-card">
              <SummaryIcon icon="dishes" />
              <dt>Featured dishes</dt>
              <dd>{featuredDishLabel}</dd>
            </div>
          </dl>
          <div className="vendor-detail-actions">
            <VendorActions
              latitude={vendor.latitude}
              longitude={vendor.longitude}
              phoneNumber={vendor.phone_number}
              source="detail"
              vendorId={vendor.id}
              vendorSlug={vendor.slug}
              locationSource={locationSource}
            />
            <RiderConnectModal vendorName={vendor.name} vendorSlug={vendor.slug} />
          </div>
          <p className="vendor-detail-note">
            {hasHours
              ? "Hours below reflect the posted weekly schedule."
              : "No hours listed yet. Call before visiting."}
          </p>
        </div>
        <div className="vendor-detail-image">
          {heroImage ? (
            <span className="vendor-detail-featured-badge">
              <svg
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                viewBox="0 0 16 16"
              >
                <path
                  d="m8 2.4 1.5 3 3.3.5-2.4 2.3.6 3.3L8 9.9l-3 1.6.6-3.3-2.4-2.3 3.3-.5L8 2.4Z"
                  fill="currentColor"
                  fillOpacity="0.18"
                />
              </svg>
              Featured
            </span>
          ) : null}
          <VendorHeroImage
            alt={`${vendor.name} food or storefront`}
            imageUrl={heroImage?.image_url ?? null}
            storageObjectPath={heroImage?.storage_object_path ?? null}
          />
          {heroImage ? (
            <span className="vendor-detail-image-dots" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
          ) : null}
        </div>
      </section>

      <section className="vendor-detail-grid">
        <div className="vendor-detail-section vendor-hours-section">
          <p className="eyebrow">Hours</p>
          <h2>Weekly hours</h2>
          <ul className="hours-list">
            {vendor.hours.map((hours) => (
              <li className={hours.is_closed ? "is-closed" : undefined} key={hours.id}>
                <strong>{dayLabels[hours.day_of_week]}</strong>
                <span>
                  {hours.is_closed
                    ? "Closed"
                    : formatVendorHoursRange(hours.open_time, hours.close_time)}
                </span>
              </li>
            ))}
            {!hasHours ? (
              <li>
                <strong>No hours listed yet</strong>
                <span>Call before visiting.</span>
              </li>
            ) : null}
          </ul>
        </div>

        <div className="vendor-detail-section vendor-featured-dish-section">
          <p className="eyebrow">Featured dish</p>
          <h2>{primaryFeaturedDish?.dish_name ?? "Food cues"}</h2>
          {primaryFeaturedDish ? (
            <p className="vendor-featured-dish-description">
              {primaryFeaturedDish.description ?? "Featured by admin"}
            </p>
          ) : null}
          {additionalFeaturedDishes.length > 0 ? (
            <ul className="dish-list">
              {additionalFeaturedDishes.map((dish) => (
                <li key={dish.id}>
                  <strong>{dish.dish_name}</strong>
                  <span>{dish.description ?? "Featured by admin"}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {vendor.featured_dishes.length === 0 ? (
            <ul className="dish-list">
              <li>
                <strong>No featured dishes listed yet</strong>
                <span>Check back later.</span>
              </li>
            </ul>
          ) : null}
        </div>

        <div className="vendor-detail-section vendor-address-section">
          <p className="eyebrow">Address</p>
          <h2>Location</h2>
          <p>{vendor.address_text ?? "Address not added yet"}</p>
          <p>
            {vendor.city ?? "Abuja"}
            {vendor.state ? `, ${vendor.state}` : ""}
          </p>
          <p>{vendor.area ?? "Area not set"}</p>
          <span className="vendor-address-illustration" aria-hidden="true">
            <svg viewBox="0 0 120 70" fill="none">
              <path d="M0 12h120M0 36h120M0 60h120M24 0v70M58 0v70M92 0v70" stroke="currentColor" strokeOpacity="0.1" />
              <path d="M24 52c17-21 35 10 54-10 8-8 14-9 22-5" stroke="currentColor" strokeOpacity="0.18" strokeWidth="3" strokeDasharray="6 7" />
              <path d="M74 29c0 13-14 25-14 25S46 42 46 29a14 14 0 1 1 28 0Z" fill="currentColor" fillOpacity="0.9" />
              <circle cx="60" cy="29" r="5" fill="#fff" />
            </svg>
          </span>
        </div>

        <div className="vendor-detail-section vendor-categories-section">
          <p className="eyebrow">Categories</p>
          <h2>Tags</h2>
          <div className="category-row">
            {vendor.categories.map((category) => (
              <span key={category.id}>{category.name}</span>
            ))}
            {vendor.categories.length === 0 ? <span>No categories added yet</span> : null}
          </div>
        </div>

        <div className="vendor-detail-section vendor-share-section">
          <p className="eyebrow">Share</p>
          <h2>Share this vendor with a friend</h2>
          <VendorShareActions vendorName={vendor.name} vendorSlug={vendor.slug} />
        </div>

        <div className="vendor-detail-section vendor-rating-section">
          <p className="eyebrow">Ratings</p>
          <h2>Rate this vendor</h2>
          <VendorRating
            key={vendor.id}
            vendorId={vendor.id}
            vendorSlug={vendor.slug}
            initialAverageRating={vendor.rating_summary.average_rating}
            initialReviewCount={vendor.rating_summary.review_count}
          />
        </div>
      </section>
    </main>
  );
}

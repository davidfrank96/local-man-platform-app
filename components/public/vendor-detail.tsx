import Link from "next/link";
import type { VendorDetailResponseData } from "../../types/index.ts";
import { isVendorOpenNow } from "../../lib/vendors/nearby.ts";
import { VendorActions } from "./vendor-actions.tsx";
import { VendorHeroImage } from "./vendor-hero-image.tsx";

type VendorDetailProps = {
  vendor: VendorDetailResponseData;
};

const dayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatTime(time: string | null): string {
  if (!time) return "";

  return time.slice(0, 5);
}

function formatCount(count: number, singularLabel: string): string {
  return count === 1 ? `1 ${singularLabel}` : `${count} ${singularLabel}s`;
}

export function VendorDetail({ vendor }: VendorDetailProps) {
  const heroImage = vendor.images[0];
  const hasHours = vendor.hours.length > 0;
  const openNow = isVendorOpenNow(vendor.hours, vendor.is_open_override);
  const statusLabel =
    vendor.is_open_override === true
      ? "Open now"
      : vendor.is_open_override === false
        ? "Closed now"
        : hasHours
          ? openNow
            ? "Open now"
            : "Closed now"
          : "Hours not set";
  const statusTone =
    vendor.is_open_override === null && !hasHours
      ? "status-neutral"
      : openNow
        ? "status-open"
        : "status-closed";
  const featuredDishLabel =
    vendor.featured_dishes.length > 0
      ? formatCount(vendor.featured_dishes.length, "featured dish")
      : "No featured dishes yet";

  return (
    <main className="vendor-detail-shell">
      <section className="vendor-detail-hero">
        <div className="vendor-detail-copy">
          <Link className="button-secondary compact-button" href="/">
            Back to map
          </Link>
          <p className="eyebrow">{vendor.area ?? "Area not set"}</p>
          <h1>{vendor.name}</h1>
          <p>
            {vendor.short_description ??
              "No description added yet. Check the hours and featured dishes below."}
          </p>
          <dl className="vendor-detail-summary">
            <div>
              <dt>Status</dt>
              <dd>
                <span className={statusTone}>{statusLabel}</span>
              </dd>
            </div>
            <div>
              <dt>Area</dt>
              <dd>{vendor.area ?? "Area not set"}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{vendor.phone_number ?? "No phone yet"}</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd>{vendor.price_band ?? "Price not set"}</dd>
            </div>
            <div>
              <dt>Ratings</dt>
              <dd>
                {vendor.rating_summary.review_count > 0
                  ? `${vendor.rating_summary.average_rating.toFixed(1)} from ${formatCount(vendor.rating_summary.review_count, "rating")}`
                  : "No ratings yet"}
              </dd>
            </div>
            <div>
              <dt>Featured dishes</dt>
              <dd>{featuredDishLabel}</dd>
            </div>
          </dl>
          <p className="vendor-detail-note">
            {hasHours
              ? "Hours below reflect the posted weekly schedule."
              : "Hours are not set yet. Call before visiting."}
          </p>
          <VendorActions
            latitude={vendor.latitude}
            longitude={vendor.longitude}
            phoneNumber={vendor.phone_number}
          />
        </div>
        <div className="vendor-detail-image">
          <VendorHeroImage
            alt={`${vendor.name} food or storefront`}
            imageUrl={heroImage?.image_url ?? null}
          />
        </div>
      </section>

      <section className="vendor-detail-grid">
        <div className="vendor-detail-section">
          <p className="eyebrow">Hours</p>
          <h2>Weekly hours</h2>
          <ul className="hours-list">
            {vendor.hours.map((hours) => (
              <li key={hours.id}>
                <strong>{dayLabels[hours.day_of_week]}</strong>
                <span>
                  {hours.is_closed
                    ? "Closed"
                    : `${formatTime(hours.open_time)} - ${formatTime(hours.close_time)}`}
                </span>
              </li>
            ))}
            {!hasHours ? (
              <li>
                <strong>No hours yet</strong>
                <span>Call before visiting.</span>
              </li>
            ) : null}
          </ul>
        </div>

        <div className="vendor-detail-section">
          <p className="eyebrow">Featured dishes</p>
          <h2>Food cues</h2>
          <ul className="dish-list">
            {vendor.featured_dishes.map((dish) => (
              <li key={dish.id}>
                <strong>{dish.dish_name}</strong>
                <span>{dish.description ?? "Featured by admin"}</span>
              </li>
            ))}
            {vendor.featured_dishes.length === 0 ? (
              <li>
                <strong>No featured dishes added yet</strong>
                <span>Check back after admin data completion.</span>
              </li>
            ) : null}
          </ul>
        </div>

        <div className="vendor-detail-section">
          <p className="eyebrow">Address</p>
          <h2>Location</h2>
          <p>{vendor.address_text ?? "Address not added yet"}</p>
          <p>
            {vendor.city ?? "Abuja"}
            {vendor.state ? `, ${vendor.state}` : ""}
          </p>
          <p>{vendor.area ?? "Area not set"}</p>
        </div>

        <div className="vendor-detail-section">
          <p className="eyebrow">Categories</p>
          <h2>Tags</h2>
          <div className="category-row">
            {vendor.categories.map((category) => (
              <span key={category.id}>{category.name}</span>
            ))}
            {vendor.categories.length === 0 ? <span>No categories added yet</span> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

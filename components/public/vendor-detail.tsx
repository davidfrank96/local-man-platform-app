import Link from "next/link";
import type { VendorDetailResponseData } from "../../types/index.ts";
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

export function VendorDetail({ vendor }: VendorDetailProps) {
  const heroImage = vendor.images[0];

  return (
    <main className="vendor-detail-shell">
      <section className="vendor-detail-hero">
        <div className="vendor-detail-copy">
          <Link className="button-secondary compact-button" href="/">
            Back to map
          </Link>
          <p className="eyebrow">{vendor.area ?? "Abuja"}</p>
          <h1>{vendor.name}</h1>
          <p>{vendor.short_description ?? "Local food vendor"}</p>
          <div className="vendor-detail-meta">
            <span>{vendor.price_band ?? "Price not set"}</span>
            <span>{vendor.rating_summary.review_count} ratings</span>
            <span>{vendor.rating_summary.average_rating.toFixed(1)} average</span>
          </div>
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
            {vendor.hours.length === 0 ? (
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
                <strong>No featured dishes yet</strong>
                <span>Check back after admin data completion.</span>
              </li>
            ) : null}
          </ul>
        </div>

        <div className="vendor-detail-section">
          <p className="eyebrow">Address</p>
          <h2>Location</h2>
          <p>{vendor.address_text ?? vendor.area ?? "Abuja"}</p>
          <p>
            {vendor.city ?? "Abuja"}
            {vendor.state ? `, ${vendor.state}` : ""}
          </p>
        </div>

        <div className="vendor-detail-section">
          <p className="eyebrow">Categories</p>
          <h2>Tags</h2>
          <div className="category-row">
            {vendor.categories.map((category) => (
              <span key={category.id}>{category.name}</span>
            ))}
            {vendor.categories.length === 0 ? <span>No categories</span> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

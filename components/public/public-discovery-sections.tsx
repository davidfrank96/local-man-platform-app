"use client";

import Link from "next/link";
import { VendorActions } from "./vendor-actions.tsx";
import { formatVendorCardDistance, type VendorOpenStateDisplay } from "../../lib/vendors/card-display.ts";
import { hasValidVendorCoordinates, type NormalizedVendor } from "../../lib/public/vendor-normalization.ts";
import { buildVendorDetailHref } from "../../lib/public/discovery-state.ts";
import type { LocationSource } from "../../types/index.ts";

export type VendorSection = "nearby" | "recent" | "popular" | "lastSelected";

function VendorSectionTabIcon({ section }: { section: VendorSection }) {
  if (section === "nearby") {
    return (
      <span className="vendor-section-tab-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M13.5 2.5 7.3 13.2 6.1 8.8 2.5 7.1 13.5 2.5Z" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  if (section === "recent") {
    return (
      <span className="vendor-section-tab-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 4.9v3.5l2.2 1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  if (section === "popular") {
    return (
      <span className="vendor-section-tab-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M8.7 1.8c.3 2-.7 3.2-1.8 4.5-.9 1-1.7 2-1.7 3.5A3.3 3.3 0 0 0 8.5 13c2 0 3.6-1.5 3.6-3.5 0-1.6-.8-2.9-2-4.1-.3 1-.9 1.7-1.7 2.3.2-1.9-.5-3.5-1.9-5.2Z" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  return (
    <span className="vendor-section-tab-icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="m8 2.2 1.7 3.5 3.8.5-2.8 2.7.7 3.8L8 10.8l-3.4 1.9.7-3.8-2.8-2.7 3.8-.5L8 2.2Z" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function VendorSectionTabs({
  activeVendorSection,
  className,
  onChange,
}: {
  activeVendorSection: VendorSection;
  className: string;
  onChange: (section: VendorSection) => void;
}) {
  return (
    <section className={className} aria-label="Vendor sections">
      <button
        aria-pressed={activeVendorSection === "nearby"}
        className={
          activeVendorSection === "nearby"
            ? "vendor-section-tab active"
            : "vendor-section-tab"
        }
        type="button"
        onClick={() => onChange("nearby")}
      >
        <VendorSectionTabIcon section="nearby" />
        <span>Nearby</span>
      </button>
      <button
        aria-pressed={activeVendorSection === "recent"}
        className={
          activeVendorSection === "recent"
            ? "vendor-section-tab active"
            : "vendor-section-tab"
        }
        type="button"
        onClick={() => onChange("recent")}
      >
        <VendorSectionTabIcon section="recent" />
        <span>Recent</span>
      </button>
      <button
        aria-pressed={activeVendorSection === "popular"}
        className={
          activeVendorSection === "popular"
            ? "vendor-section-tab active"
            : "vendor-section-tab"
        }
        type="button"
        onClick={() => onChange("popular")}
      >
        <VendorSectionTabIcon section="popular" />
        <span>Popular</span>
      </button>
      <button
        aria-pressed={activeVendorSection === "lastSelected"}
        className={
          activeVendorSection === "lastSelected"
            ? "vendor-section-tab active"
            : "vendor-section-tab"
        }
        type="button"
        onClick={() => onChange("lastSelected")}
      >
        <VendorSectionTabIcon section="lastSelected" />
        <span>Last selected</span>
      </button>
    </section>
  );
}

export function SelectedVendorPanel({
  activeLocationSource,
  discoveryReturnTo,
  isApproximateDistance,
  selectedVendor,
  selectedVendorCue,
  selectedVendorOpenState,
}: {
  activeLocationSource: LocationSource | null;
  discoveryReturnTo: string;
  isApproximateDistance: boolean;
  selectedVendor: NormalizedVendor | null;
  selectedVendorCue: string | null;
  selectedVendorOpenState: VendorOpenStateDisplay;
}) {
  return (
    <section className="selected-vendor-panel">
      <p className="eyebrow">Selected vendor</p>
      {selectedVendor ? (
        <>
          <h2>{selectedVendor.name}</h2>
          <div className="selected-vendor-summary">
            <p className="selected-vendor-status-line">
              <span className="selected-vendor-chip">
                <span className="selected-vendor-chip-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M8 14s4-3.9 4-7A4 4 0 1 0 4 7c0 3.1 4 7 4 7Z" strokeLinejoin="round" />
                    <circle cx="8" cy="7" r="1.5" />
                  </svg>
                </span>
                {formatVendorCardDistance(
                  selectedVendor.distanceKm ?? selectedVendor.distance_km,
                  isApproximateDistance,
                )}
              </span>
              <span
                className={
                  selectedVendorOpenState.toneClassName === "vendor-card-status-open"
                    ? "selected-vendor-chip selected-vendor-status-open"
                    : selectedVendorOpenState.toneClassName === "vendor-card-status-closed"
                      ? "selected-vendor-chip selected-vendor-status-closed"
                      : "selected-vendor-chip selected-vendor-status-unavailable"
                }
              >
                <span className="selected-vendor-chip-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="8" cy="8" r="5.5" />
                    <path d="M8 4.8v3.6l2.4 1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {selectedVendorOpenState.label}
              </span>
            </p>
            <p className="selected-vendor-hours-line">
              <span className="selected-vendor-summary-icon" aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="8" cy="8" r="5.5" />
                  <path d="M8 4.8v3.6l2.4 1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="selected-vendor-label">Active hours:</span> {selectedVendor.today_hours}
            </p>
            {selectedVendorCue ? (
              <p className="selected-vendor-slug-line">
                <span className="selected-vendor-summary-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4.5 2.5v11" strokeLinecap="round" />
                    <path d="M8.5 2.5v11" strokeLinecap="round" />
                    <path d="M2.5 5.5h8" strokeLinecap="round" />
                    <path d="M11.5 2.5a2.5 2.5 0 1 1 0 5v4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="selected-vendor-slug-value">{selectedVendorCue}</span>
              </p>
            ) : null}
            {selectedVendor.area ? (
              <p className="selected-vendor-area-line">
                <span className="selected-vendor-summary-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 4h10" strokeLinecap="round" />
                    <path d="M3 8h10" strokeLinecap="round" />
                    <path d="M3 12h10" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="selected-vendor-label">Area:</span> {selectedVendor.area}
              </p>
            ) : null}
          </div>
          <div className="selected-vendor-actions">
            {hasValidVendorCoordinates(selectedVendor) ? (
              <VendorActions
                latitude={selectedVendor.latitude}
                longitude={selectedVendor.longitude}
                phoneNumber={selectedVendor.phone_number}
                source="selected_preview"
                vendorId={selectedVendor.vendor_id}
                vendorSlug={selectedVendor.slug}
                locationSource={activeLocationSource}
              />
            ) : null}
            <Link
              className="button-secondary compact-button selected-vendor-detail-link"
              href={buildVendorDetailHref(
                selectedVendor.slug,
                discoveryReturnTo,
                activeLocationSource,
              )}
            >
              View details
            </Link>
          </div>
        </>
      ) : (
        <>
          <h2>No vendor selected</h2>
          <p>Select a marker or vendor result.</p>
        </>
      )}
    </section>
  );
}

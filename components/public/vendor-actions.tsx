"use client";

import type { LocationSource } from "../../types/index.ts";
import {
  getDirectionsUrl,
  getPhoneHref,
} from "../../lib/vendors/public-api-client.ts";
import { trackPublicUserAction } from "../../lib/public/user-action-tracking.ts";

type VendorActionsProps = {
  latitude: number;
  longitude: number;
  phoneNumber: string | null;
  vendorId?: string;
  vendorSlug?: string;
  source?: "card" | "selected_preview" | "detail";
  locationSource?: LocationSource | null;
};

function PhoneActionIcon() {
  return (
    <svg
      aria-hidden="true"
      className="vendor-action-icon"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.1 2.4 6.2 5c.2.5.1 1-.3 1.3l-.7.7c.8 1.7 2.1 3 3.8 3.8l.7-.7c.4-.4.9-.5 1.3-.3l2.6 1.1c.4.2.7.6.7 1v1.3c0 .6-.5 1.1-1.1 1.1C6.9 14.3 1.8 9.1 1.8 2.9c0-.6.5-1.1 1.1-1.1h1.3c.4 0 .8.2.9.6Z" />
    </svg>
  );
}

function DirectionsActionIcon() {
  return (
    <svg
      aria-hidden="true"
      className="vendor-action-icon"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.8 14.2 8 8 14.2 1.8 8 8 1.8Z" />
      <path d="M6.1 9.8V7.7c0-.7.5-1.2 1.2-1.2h2.5" />
      <path d="m8.7 5.4 1.4 1.1-1.4 1.2" />
    </svg>
  );
}

export function VendorActions({
  latitude,
  longitude,
  phoneNumber,
  vendorId,
  vendorSlug,
  source,
  locationSource,
}: VendorActionsProps) {
  const phoneHref = getPhoneHref(phoneNumber);
  const directionsHref = getDirectionsUrl(latitude, longitude);
  const showInlineActionIcons = source === "card" || source === "selected_preview";
  const metadata: Record<string, string | number | boolean | null> = source
    ? { source }
    : {};
  const navigateAfterTracking = (
    href: string,
    target: "self" | "blank",
  ) => {
    if (typeof window === "undefined") {
      return;
    }

    const trackingWindow = window as typeof window & {
      __LOCALMAN_SUPPRESS_ACTION_NAVIGATION__?: boolean;
    };

    if (trackingWindow.__LOCALMAN_SUPPRESS_ACTION_NAVIGATION__ === true) {
      return;
    }

    window.setTimeout(() => {
      if (target === "blank") {
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }

      window.location.assign(href);
    }, 80);
  };
  const trackVendorAction = (eventType: "call_clicked" | "directions_clicked") => {
    void trackPublicUserAction({
      event_type: eventType,
      vendor_id: vendorId,
      location_source: locationSource ?? null,
      vendor_slug: vendorSlug,
      page_path:
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/",
      metadata,
      filters: {},
    });
  };

  return (
    <div className="vendor-actions">
      {phoneHref ? (
        <a
          className="button-primary compact-button vendor-action-button"
          href={phoneHref}
          onClick={(event) => {
            event.preventDefault();
            trackVendorAction("call_clicked");
            navigateAfterTracking(phoneHref, "self");
          }}
        >
          {showInlineActionIcons ? <PhoneActionIcon /> : null}
          Call
        </a>
      ) : (
        <span className="button-disabled">No phone</span>
      )}
      <a
        className="button-secondary compact-button vendor-action-button"
        href={directionsHref}
        rel="noreferrer"
        target="_blank"
        onClick={(event) => {
          event.preventDefault();
          trackVendorAction("directions_clicked");
          navigateAfterTracking(directionsHref, "blank");
        }}
      >
        {showInlineActionIcons ? <DirectionsActionIcon /> : null}
        Directions
      </a>
    </div>
  );
}

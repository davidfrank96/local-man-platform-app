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
          className="button-primary compact-button"
          href={phoneHref}
          onClick={(event) => {
            event.preventDefault();
            trackVendorAction("call_clicked");
            navigateAfterTracking(phoneHref, "self");
          }}
        >
          Call
        </a>
      ) : (
        <span className="button-disabled">No phone</span>
      )}
      <a
        className="button-secondary compact-button"
        href={directionsHref}
        rel="noreferrer"
        target="_blank"
        onClick={(event) => {
          event.preventDefault();
          trackVendorAction("directions_clicked");
          navigateAfterTracking(directionsHref, "blank");
        }}
      >
        Directions
      </a>
    </div>
  );
}

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
  const metadata: Record<string, string | number | boolean | null> = source
    ? { source }
    : {};

  return (
    <div className="vendor-actions">
      {phoneHref ? (
        <a
          className="button-primary compact-button"
          href={phoneHref}
          onClick={() =>
            trackPublicUserAction({
              event_type: "call_clicked",
              vendor_id: vendorId,
              location_source: locationSource ?? null,
              vendor_slug: vendorSlug,
              page_path:
                typeof window !== "undefined"
                  ? `${window.location.pathname}${window.location.search}`
                  : "/",
              metadata,
              filters: {},
            })
          }
        >
          Call
        </a>
      ) : (
        <span className="button-disabled">No phone</span>
      )}
      <a
        className="button-secondary compact-button"
        href={getDirectionsUrl(latitude, longitude)}
        rel="noreferrer"
        target="_blank"
        onClick={() =>
          trackPublicUserAction({
            event_type: "directions_clicked",
            vendor_id: vendorId,
            location_source: locationSource ?? null,
            vendor_slug: vendorSlug,
            page_path:
              typeof window !== "undefined"
                ? `${window.location.pathname}${window.location.search}`
                : "/",
            metadata,
            filters: {},
          })
        }
      >
        Directions
      </a>
    </div>
  );
}

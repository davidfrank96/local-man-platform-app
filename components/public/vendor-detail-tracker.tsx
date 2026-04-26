"use client";

import type { LocationSource } from "../../types/index.ts";
import { useEffect } from "react";
import {
  ensurePublicTrackingSession,
  trackPublicUserAction,
} from "../../lib/public/user-action-tracking.ts";

type VendorDetailTrackerProps = {
  vendorId: string;
  vendorSlug: string;
  locationSource?: LocationSource | null;
};

export function VendorDetailTracker({
  vendorId,
  vendorSlug,
  locationSource,
}: VendorDetailTrackerProps) {
  useEffect(() => {
    void ensurePublicTrackingSession({
      page_path:
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : `/vendors/${vendorSlug}`,
      location_source: locationSource ?? null,
    });
  }, [locationSource, vendorSlug]);

  useEffect(() => {
    trackPublicUserAction({
      event_type: "vendor_detail_opened",
      vendor_id: vendorId,
      location_source: locationSource ?? null,
      vendor_slug: vendorSlug,
      page_path:
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : `/vendors/${vendorSlug}`,
      metadata: {},
      filters: {},
    });
  }, [locationSource, vendorId, vendorSlug]);

  return null;
}

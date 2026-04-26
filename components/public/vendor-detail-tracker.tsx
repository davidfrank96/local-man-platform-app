"use client";

import type { LocationSource } from "../../types/index.ts";
import { useEffect } from "react";
import {
  ensurePublicTrackingSession,
  trackPublicUserAction,
} from "../../lib/public/user-action-tracking.ts";
import {
  createRetainedVendorPreview,
  rememberRecentlyViewedVendor,
} from "../../lib/public/vendor-retention.ts";

type VendorDetailTrackerProps = {
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  vendorArea: string | null;
  todayHours: string;
  isOpenNow: boolean;
  locationSource?: LocationSource | null;
};

export function VendorDetailTracker({
  vendorId,
  vendorSlug,
  vendorName,
  vendorArea,
  todayHours,
  isOpenNow,
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

    rememberRecentlyViewedVendor(
      createRetainedVendorPreview({
        vendor_id: vendorId,
        slug: vendorSlug,
        name: vendorName,
        area: vendorArea,
        today_hours: todayHours,
        is_open_now: isOpenNow,
      }),
    );
  }, [isOpenNow, locationSource, todayHours, vendorArea, vendorId, vendorName, vendorSlug]);

  return null;
}

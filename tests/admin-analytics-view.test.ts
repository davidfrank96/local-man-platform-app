import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnalyticsMetricCards,
  formatAnalyticsEventLabel,
  hasAnalyticsVendorPerformance,
  hasRecentAnalyticsEvents,
} from "../lib/admin/analytics-view.ts";
import type { AdminAnalyticsResponseData } from "../types/index.ts";

const emptyAnalytics: AdminAnalyticsResponseData = {
  range: "7d",
  summary: {
    total_sessions: 0,
    total_events: 0,
    vendor_selections: 0,
    vendor_detail_opens: 0,
    call_clicks: 0,
    directions_clicks: 0,
    searches_used: 0,
    filters_applied: 0,
  },
  vendor_performance: {
    most_selected_vendors: [],
    most_viewed_vendor_details: [],
    most_call_clicks: [],
    most_directions_clicks: [],
  },
  dropoff: {
    session_metrics_available: false,
    sessions_without_meaningful_interaction: null,
    sessions_with_search_without_vendor_click: null,
    sessions_with_detail_without_action: null,
  },
  recent_events: [],
};

test("analytics view helpers handle empty data safely", () => {
  const metricCards = buildAnalyticsMetricCards(emptyAnalytics.summary);

  assert.equal(metricCards.length, 8);
  assert.equal(hasAnalyticsVendorPerformance(emptyAnalytics), false);
  assert.equal(hasRecentAnalyticsEvents(emptyAnalytics), false);
});

test("analytics view helpers expose recent activity and vendor performance", () => {
  const analytics: AdminAnalyticsResponseData = {
    ...emptyAnalytics,
    vendor_performance: {
      ...emptyAnalytics.vendor_performance,
      most_selected_vendors: [
        {
          vendor_id: "00000000-0000-4000-8000-000000000001",
          vendor_name: "Test Vendor",
          vendor_slug: "test-vendor",
          count: 1,
        },
      ],
    },
    recent_events: [
      {
        id: "10000000-0000-4000-8000-000000000001",
        event_type: "vendor_selected",
        vendor_id: "00000000-0000-4000-8000-000000000001",
        vendor_name: "Test Vendor",
        vendor_slug: "test-vendor",
        device_type: "mobile",
        location_source: "precise",
        timestamp: "2026-04-26T10:00:00.000Z",
      },
    ],
  };

  assert.equal(hasAnalyticsVendorPerformance(analytics), true);
  assert.equal(hasRecentAnalyticsEvents(analytics), true);
  assert.equal(formatAnalyticsEventLabel("vendor_selected"), "Vendor Selected");
});

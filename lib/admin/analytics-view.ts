import type { AdminAnalyticsResponseData } from "../../types/index.ts";

export function formatAnalyticsEventLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function buildAnalyticsMetricCards(summary: AdminAnalyticsResponseData["summary"]) {
  return [
    { label: "Total sessions", value: summary.total_sessions, note: "Tracked session starts or session groups" },
    { label: "Total events", value: summary.total_events, note: "Read-only internal usage stream" },
    { label: "Vendor selections", value: summary.vendor_selections, note: "List or map selection intent" },
    { label: "Detail opens", value: summary.vendor_detail_opens, note: "Vendor detail page opens" },
    { label: "Call clicks", value: summary.call_clicks, note: "Direct phone intent" },
    { label: "Directions clicks", value: summary.directions_clicks, note: "Navigation intent" },
    { label: "Searches used", value: summary.searches_used, note: "Search submissions" },
    { label: "Filters applied", value: summary.filters_applied, note: "Search and filter refinement" },
  ];
}

export function hasAnalyticsVendorPerformance(data: AdminAnalyticsResponseData): boolean {
  return (
    data.vendor_performance.most_selected_vendors.length > 0 ||
    data.vendor_performance.most_viewed_vendor_details.length > 0 ||
    data.vendor_performance.most_call_clicks.length > 0 ||
    data.vendor_performance.most_directions_clicks.length > 0
  );
}

export function hasRecentAnalyticsEvents(data: AdminAnalyticsResponseData): boolean {
  return data.recent_events.length > 0;
}

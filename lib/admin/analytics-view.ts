import type { AdminAnalyticsResponseData } from "../../types/index.ts";

export function formatAnalyticsEventLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function formatAnalyticsMetricValue(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const absoluteValue = Math.abs(value);

  if (absoluteValue < 1_000) {
    return String(Math.trunc(value));
  }

  const units = [
    { threshold: 1_000_000, suffix: "M" },
    { threshold: 1_000, suffix: "k" },
  ] as const;

  for (const unit of units) {
    if (absoluteValue < unit.threshold) {
      continue;
    }

    const scaled = value / unit.threshold;
    const rounded = Math.round(scaled * 10) / 10;
    const wholeNumber = Math.abs(rounded - Math.trunc(rounded)) < 0.05;

    return `${wholeNumber ? Math.trunc(rounded) : rounded.toFixed(1)}${unit.suffix}`;
  }

  return String(Math.trunc(value));
}

export function buildAnalyticsMetricCards(summary: AdminAnalyticsResponseData["summary"]) {
  return [
    { label: "Total sessions", value: formatAnalyticsMetricValue(summary.total_sessions), note: "Tracked session starts or session groups" },
    { label: "Total events", value: formatAnalyticsMetricValue(summary.total_events), note: "Read-only internal usage stream" },
    { label: "Vendor selections", value: formatAnalyticsMetricValue(summary.vendor_selections), note: "List or map selection intent" },
    { label: "Detail opens", value: formatAnalyticsMetricValue(summary.vendor_detail_opens), note: "Vendor detail page opens" },
    { label: "Call clicks", value: formatAnalyticsMetricValue(summary.call_clicks), note: "Direct phone intent" },
    { label: "Directions clicks", value: formatAnalyticsMetricValue(summary.directions_clicks), note: "Navigation intent" },
    { label: "Searches used", value: formatAnalyticsMetricValue(summary.searches_used), note: "Search submissions" },
    { label: "Filters applied", value: formatAnalyticsMetricValue(summary.filters_applied), note: "Search and filter refinement" },
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

export function getVisibleRecentAnalyticsEvents<T>(
  events: T[],
  visibleCount: number,
): T[] {
  return events.slice(0, Math.max(visibleCount, 0));
}

export function getNextRecentAnalyticsEventCount(
  currentCount: number,
  totalCount: number,
  pageSize: number,
): number {
  return Math.min(totalCount, currentCount + pageSize);
}

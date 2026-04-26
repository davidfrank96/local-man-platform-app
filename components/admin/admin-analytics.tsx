"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  fetchAdminAnalytics,
} from "../../lib/admin/api-client.ts";
import {
  buildAnalyticsMetricCards,
  formatAnalyticsEventLabel,
} from "../../lib/admin/analytics-view.ts";
import { useAdminSession } from "./admin-session-provider.tsx";
import type {
  AdminAnalyticsRange,
  AdminAnalyticsResponseData,
} from "../../types/index.ts";

const analyticsRanges: Array<{ value: AdminAnalyticsRange; label: string }> = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

type AdminAnalyticsProps = {
  initialData?: AdminAnalyticsResponseData | null;
};

type AdminAnalyticsViewProps = {
  analytics: AdminAnalyticsResponseData | null;
  range: AdminAnalyticsRange;
  status: string;
  isLoading: boolean;
  onSelectRange: (range: AdminAnalyticsRange) => void;
};

function formatAdminErrorStatus(error: unknown, fallbackMessage: string): string {
  if (error instanceof AdminApiError) {
    return `${error.code}: ${error.message.replace(/^[A-Z_]+:\s*/, "")}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

function formatTimestamp(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function AnalyticsRankingTable({
  title,
  emptyCopy,
  rows,
}: {
  title: string;
  emptyCopy: string;
  rows: AdminAnalyticsResponseData["vendor_performance"]["most_selected_vendors"];
}) {
  return (
    <section className="admin-panel analytics-panel" aria-labelledby={title}>
      <div className="admin-section-header">
        <div>
          <h2 id={title}>{title}</h2>
          <span>Top vendors for this action in the selected time range.</span>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="analytics-empty-state">
          <strong>No usage data yet</strong>
          <p>{emptyCopy}</p>
        </div>
      ) : (
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th scope="col">Vendor</th>
                <th scope="col">Slug</th>
                <th scope="col">Count</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${title}-${row.vendor_id ?? row.vendor_slug ?? row.vendor_name ?? "unknown"}`}>
                  <td>{row.vendor_name ?? "Unknown vendor"}</td>
                  <td>
                    <span className="analytics-badge">{row.vendor_slug ?? "n/a"}</span>
                  </td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function AdminAnalyticsView({
  analytics,
  range,
  status,
  isLoading,
  onSelectRange,
}: AdminAnalyticsViewProps) {
  const metricCards = useMemo(
    () => (analytics ? buildAnalyticsMetricCards(analytics.summary) : []),
    [analytics],
  );

  const recentEvents = analytics?.recent_events ?? [];
  const dropoff = analytics?.dropoff ?? null;

  return (
    <div className="admin-console">
      <section className="admin-panel analytics-filter-panel" aria-labelledby="analytics-controls">
        <div className="admin-section-header">
          <div>
            <h2 id="analytics-controls">Usage signals</h2>
            <span>Read-only analytics from the internal `user_events` stream.</span>
          </div>
        </div>

        <div className="analytics-filter-bar" role="group" aria-label="Analytics date range">
          {analyticsRanges.map((option) => (
            <button
              key={option.value}
              className={range === option.value ? "analytics-filter-pill active" : "analytics-filter-pill"}
              type="button"
              aria-pressed={range === option.value}
              onClick={() => {
                onSelectRange(option.value);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section
        className={`admin-panel admin-status-panel ${status.toLowerCase().includes("unable") ? "admin-status-panel-error" : status === "Analytics loaded." || status === "No usage data yet." ? "admin-status-panel-success" : "admin-status-panel-neutral"}`}
        aria-live="polite"
      >
        <div className="admin-status-heading">
          <strong>Status</strong>
          <p className="admin-status-copy">{status}</p>
        </div>
        <div className="analytics-status-meta">
          <span>Analytics access</span>
          <strong>Admin only</strong>
        </div>
        <div className="analytics-status-meta">
          <span>Tracking mode</span>
          <strong>Fire-and-forget</strong>
        </div>
      </section>

      {analytics ? (
        <>
          <section className="analytics-summary-grid" aria-label="Analytics summary cards">
            {metricCards.map((metric) => (
              <article className="admin-metric-panel" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.note}</small>
              </article>
            ))}
          </section>

          <div className="analytics-layout">
            <section className="admin-panel analytics-panel" aria-labelledby="dropoff-signals">
              <div className="admin-section-header">
                <div>
                  <h2 id="dropoff-signals">Drop-off signals</h2>
                  <span>Where users stop before taking the next meaningful step.</span>
                </div>
              </div>

              {!dropoff?.session_metrics_available ? (
                <div className="analytics-empty-state">
                  <strong>Session flow data is not available yet</strong>
                  <p>
                    This environment has event-level data, but it does not yet have complete
                    `session_id` coverage for exact session drop-off analysis.
                  </p>
                </div>
              ) : (
                <div className="analytics-dropoff-grid">
                  <article className="analytics-signal-card">
                    <strong>{dropoff.sessions_without_meaningful_interaction ?? 0}</strong>
                    <span>Sessions with no meaningful interaction</span>
                  </article>
                  <article className="analytics-signal-card">
                    <strong>{dropoff.sessions_with_search_without_vendor_click ?? 0}</strong>
                    <span>Sessions with search but no vendor click</span>
                  </article>
                  <article className="analytics-signal-card">
                    <strong>{dropoff.sessions_with_detail_without_action ?? 0}</strong>
                    <span>Sessions with detail opened but no call or directions</span>
                  </article>
                </div>
              )}
            </section>

            <section className="admin-panel analytics-panel" aria-labelledby="recent-activity">
              <div className="admin-section-header">
                <div>
                  <h2 id="recent-activity">Recent activity</h2>
                  <span>Latest events captured in the selected range.</span>
                </div>
              </div>

              {recentEvents.length === 0 ? (
                <div className="analytics-empty-state">
                  <strong>No usage data yet</strong>
                  <p>Recent events will appear here after real public activity is tracked.</p>
                </div>
              ) : (
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th scope="col">Event</th>
                        <th scope="col">Vendor</th>
                        <th scope="col">Device</th>
                        <th scope="col">Location</th>
                        <th scope="col">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEvents.map((event) => (
                        <tr key={event.id}>
                          <td>{formatAnalyticsEventLabel(event.event_type)}</td>
                          <td>{event.vendor_name ?? event.vendor_slug ?? "—"}</td>
                          <td>
                            <span className="analytics-badge">{event.device_type}</span>
                          </td>
                          <td>
                            <span className="analytics-badge">
                              {event.location_source ?? "unknown"}
                            </span>
                          </td>
                          <td>{formatTimestamp(event.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="analytics-performance-grid">
            <AnalyticsRankingTable
              title="Most selected vendors"
              emptyCopy="No vendor selections in this period."
              rows={analytics.vendor_performance.most_selected_vendors}
            />
            <AnalyticsRankingTable
              title="Most viewed vendor details"
              emptyCopy="No vendor detail opens in this period."
              rows={analytics.vendor_performance.most_viewed_vendor_details}
            />
            <AnalyticsRankingTable
              title="Most call clicks"
              emptyCopy="No call clicks in this period."
              rows={analytics.vendor_performance.most_call_clicks}
            />
            <AnalyticsRankingTable
              title="Most directions clicks"
              emptyCopy="No directions clicks in this period."
              rows={analytics.vendor_performance.most_directions_clicks}
            />
          </div>
        </>
      ) : (
        !isLoading && (
          <section className="admin-panel analytics-panel" aria-labelledby="analytics-empty">
            <div className="analytics-empty-state">
              <strong id="analytics-empty">No usage data yet</strong>
              <p>Analytics will populate here after public activity is tracked.</p>
            </div>
          </section>
        )
      )}
    </div>
  );
}

export function AdminAnalytics({ initialData = null }: AdminAnalyticsProps) {
  const { session, signOut } = useAdminSession();
  const accessToken = session?.accessToken ?? null;
  const initialRange = initialData?.range ?? "7d";
  const [range, setRange] = useState<AdminAnalyticsRange>(initialRange);
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponseData | null>(initialData);
  const [status, setStatus] = useState(
    initialData ? "Analytics loaded." : "Load usage signals when ready.",
  );
  const [isLoading, setIsLoading] = useState(!initialData);

  const loadAnalytics = useCallback(async (nextRange: AdminAnalyticsRange) => {
    if (!accessToken) {
      setStatus("Admin session is missing. Sign in again.");
      return;
    }

    setRange(nextRange);
    setIsLoading(true);
    setStatus("Loading analytics…");

    try {
      const result = await fetchAdminAnalytics(
        { range: nextRange },
        { accessToken },
      );
      setAnalytics(result);
      setStatus(
        result.summary.total_events > 0
          ? "Analytics loaded."
          : "No usage data yet.",
      );
    } catch (error) {
      if (
        error instanceof AdminApiError &&
        (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
      ) {
        setStatus(formatAdminErrorStatus(error, "Admin session expired. Sign in again."));
        void signOut();
      } else {
        setStatus(formatAdminErrorStatus(error, "Unable to load analytics."));
      }
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, signOut]);

  useEffect(() => {
    if (initialData) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadAnalytics(initialRange);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [initialData, initialRange, loadAnalytics]);

  return (
    <AdminAnalyticsView
      analytics={analytics}
      range={range}
      status={status}
      isLoading={isLoading}
      onSelectRange={(nextRange) => {
        void loadAnalytics(nextRange);
      }}
    />
  );
}

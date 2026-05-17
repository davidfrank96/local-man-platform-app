"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  fetchAdminAnalytics,
} from "../../lib/admin/api-client.ts";
import { handleAppError } from "../../lib/errors/ui-error.ts";
import {
  buildAnalyticsMetricCards,
  buildRiderAnalyticsMetricCards,
  formatAnalyticsEventLabel,
  formatAnalyticsMetricValue,
} from "../../lib/admin/analytics-view.ts";
import { useAdminSession } from "./admin-session-provider.tsx";
import {
  readAnalyticsCache,
  writeAnalyticsCache,
} from "../../lib/admin/workspace-cache.ts";
import { AdminScrollPanel } from "./admin-scroll-panel.tsx";
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
  analyticsErrorMessage: string | null;
  isLoading: boolean;
  onSelectRange: (range: AdminAnalyticsRange) => void;
};

function formatAdminErrorStatus(error: unknown, fallbackMessage: string): string {
  try {
    const visibleError = handleAppError(error, {
      fallbackMessage,
      role: "admin",
      context: "admin_analytics",
      toast: false,
    });
    const message = typeof visibleError.message === "string" && visibleError.message.trim()
      ? visibleError.message
      : fallbackMessage;

    return visibleError.code ? `${message} (${visibleError.code})` : message;
  } catch {
    return fallbackMessage;
  }
}

function getAnalyticsAccessErrorMessage(error: { code: string; message: string }): string {
  if (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED") {
    return "You do not have access to analytics";
  }

  return error.message;
}

function getAnalyticsEmptyStateMessage(range: AdminAnalyticsRange): string {
  return range === "all" ? "No usage data yet." : "No activity in selected time range.";
}

function getAnalyticsEmptyStateDescription(range: AdminAnalyticsRange): string {
  return range === "all"
    ? "Analytics will populate here after public activity is tracked."
    : "Try a wider time range to view older activity.";
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
        <AdminScrollPanel className="admin-scroll-panel-ranking" ariaLabelledBy={title}>
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
                    <td>{formatAnalyticsMetricValue(row.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminScrollPanel>
      )}
    </section>
  );
}

const AdminAnalyticsView = memo(function AdminAnalyticsView({
  analytics,
  range,
  status,
  analyticsErrorMessage,
  isLoading,
  onSelectRange,
}: AdminAnalyticsViewProps) {
  const metricCards = useMemo(
    () => (analytics ? buildAnalyticsMetricCards(analytics.summary) : []),
    [analytics],
  );
  const riderMetricCards = useMemo(
    () => (analytics ? buildRiderAnalyticsMetricCards(analytics.rider_metrics) : []),
    [analytics],
  );
  const recentEvents = analytics?.recent_events;
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
        className={`admin-panel admin-status-panel ${status.toLowerCase().includes("unable") ? "admin-status-panel-error" : status === "Analytics loaded." || status === "No usage data yet." || status === "No activity in selected time range." ? "admin-status-panel-success" : "admin-status-panel-neutral"}`}
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

          <section className="admin-panel analytics-panel" aria-labelledby="rider-connect-analytics">
            <div className="admin-section-header">
              <div>
                <h2 id="rider-connect-analytics">Rider Connect</h2>
                <span>Admin-only rider profile status counts.</span>
              </div>
            </div>
            <div className="analytics-summary-grid" aria-label="Rider Connect analytics cards">
              {riderMetricCards.map((metric) => (
                <article className="admin-metric-panel" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.note}</small>
                </article>
              ))}
            </div>
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
                    <strong>{formatAnalyticsMetricValue(dropoff.sessions_without_meaningful_interaction ?? 0)}</strong>
                    <span>Sessions with no meaningful interaction</span>
                  </article>
                  <article className="analytics-signal-card">
                    <strong>{formatAnalyticsMetricValue(dropoff.sessions_with_search_without_vendor_click ?? 0)}</strong>
                    <span>Sessions with search but no vendor click</span>
                  </article>
                  <article className="analytics-signal-card">
                    <strong>{formatAnalyticsMetricValue(dropoff.sessions_with_detail_without_action ?? 0)}</strong>
                    <span>Sessions with detail opened but no call or directions</span>
                  </article>
                </div>
              )}
            </section>

            <section className="admin-panel analytics-panel" aria-labelledby="recent-activity">
              <div className="admin-section-header">
                <div>
                  <h2 id="recent-activity">Recent user events</h2>
                  <span>Latest public usage events captured in the selected range.</span>
                </div>
              </div>

              {(recentEvents?.length ?? 0) === 0 ? (
                <div className="analytics-empty-state">
                  <strong>{getAnalyticsEmptyStateMessage(range).replace(/\.$/, "")}</strong>
                  <p>{getAnalyticsEmptyStateDescription(range)}</p>
                </div>
              ) : (
                <AdminScrollPanel className="admin-scroll-panel-events" ariaLabelledBy="recent-activity">
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
                        {recentEvents?.map((event) => (
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
                </AdminScrollPanel>
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
      ) : analyticsErrorMessage ? (
        !isLoading && (
          <section className="admin-panel analytics-panel" aria-labelledby="analytics-error">
            <div className="analytics-empty-state">
              <strong id="analytics-error">Analytics unavailable</strong>
              <p>{analyticsErrorMessage}</p>
            </div>
          </section>
        )
      ) : (
        !isLoading && (
          <section className="admin-panel analytics-panel" aria-labelledby="analytics-empty">
            <div className="analytics-empty-state">
              <strong id="analytics-empty">{getAnalyticsEmptyStateMessage(range).replace(/\.$/, "")}</strong>
              <p>{getAnalyticsEmptyStateDescription(range)}</p>
            </div>
          </section>
        )
      )}
    </div>
  );
});

export function AdminAnalytics({ initialData = null }: AdminAnalyticsProps) {
  const { session, signOut } = useAdminSession();
  const initialRange = initialData?.range ?? "7d";
  const initialAnalytics = initialData ?? readAnalyticsCache(initialRange);
  const [range, setRange] = useState<AdminAnalyticsRange>(initialRange);
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponseData | null>(initialAnalytics);
  const [status, setStatus] = useState(
    initialAnalytics ? "Analytics loaded." : "Load usage signals when ready.",
  );
  const [analyticsErrorMessage, setAnalyticsErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialAnalytics);

  const logAnalyticsFetch = useCallback((payload: {
    scope: "analytics";
    count: number;
    duration: number;
    status: "success" | "error" | "cache_hit";
  }) => {
    console.warn({
      type: "ANALYTICS_FETCH",
      ...payload,
    });
  }, []);

  const setSafeAnalyticsFallbackState = useCallback((message: string) => {
    setAnalytics(null);
    setAnalyticsErrorMessage(message);
    setStatus(message);
    setIsLoading(false);
  }, []);

  const loadAnalytics = useCallback(async (nextRange: AdminAnalyticsRange) => {
    if (!session) {
      setStatus("Admin session is missing. Sign in again.");
      return;
    }

    const cachedAnalytics = readAnalyticsCache(nextRange);
    setRange(nextRange);

    if (cachedAnalytics) {
      logAnalyticsFetch({
        scope: "analytics",
        count: cachedAnalytics.recent_events.length,
        duration: 0,
        status: "cache_hit",
      });
      setAnalytics(cachedAnalytics);
      setAnalyticsErrorMessage(null);
      setStatus(
        cachedAnalytics.summary.total_events > 0
          ? "Analytics loaded."
          : getAnalyticsEmptyStateMessage(nextRange),
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setAnalyticsErrorMessage(null);
    setStatus("Loading analytics…");

    try {
      const startedAt = performance.now();
      const result = await fetchAdminAnalytics({ range: nextRange });
      if (result.error) {
        logAnalyticsFetch({
          scope: "analytics",
          count: 0,
          duration: performance.now() - startedAt,
          status: "error",
        });
        const accessMessage = getAnalyticsAccessErrorMessage(
          result.error,
        );
        handleAppError(result.error, {
          fallbackMessage: accessMessage === result.error.message
            ? "Unable to load activity right now"
            : accessMessage,
          role: "admin",
          context: "admin_analytics_load",
        });
        setSafeAnalyticsFallbackState(
          result.error.code === "FORBIDDEN" || result.error.code === "UNAUTHORIZED"
            ? accessMessage
            : "Unable to load activity right now",
        );

        if (result.error.code === "UNAUTHORIZED") {
          void signOut();
        }
        return;
      }

      if (!result.data) {
        logAnalyticsFetch({
          scope: "analytics",
          count: 0,
          duration: performance.now() - startedAt,
          status: "error",
        });
        setSafeAnalyticsFallbackState("Unable to load activity right now");
        return;
      }

      const analytics = result.data;
      logAnalyticsFetch({
        scope: "analytics",
        count: analytics.recent_events.length,
        duration: performance.now() - startedAt,
        status: "success",
      });
      writeAnalyticsCache(nextRange, analytics);
      setAnalytics(analytics);
      setAnalyticsErrorMessage(null);
      setStatus(
        analytics.summary.total_events > 0
          ? "Analytics loaded."
          : getAnalyticsEmptyStateMessage(nextRange),
      );
    } catch (error) {
      if (
        error instanceof AdminApiError &&
        (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
      ) {
        const accessMessage = getAnalyticsAccessErrorMessage(error);
        handleAppError(error, {
          fallbackMessage: accessMessage,
          role: "admin",
          context: "admin_analytics_load",
        });
        setSafeAnalyticsFallbackState(accessMessage);

        if (error.code === "UNAUTHORIZED") {
          void signOut();
        }
      } else {
        const visibleError = handleAppError(error, {
          fallbackMessage: "Unable to load activity right now",
          role: "admin",
          context: "admin_analytics_load",
        });
        const nextStatus = formatAdminErrorStatus(
          error,
          visibleError.message || "Unable to load activity right now",
        );
        setSafeAnalyticsFallbackState(nextStatus);
      }
    } finally {
      setIsLoading(false);
    }
  }, [logAnalyticsFetch, session, setSafeAnalyticsFallbackState, signOut]);

  const runAnalyticsLoadSafely = useCallback(async (nextRange: AdminAnalyticsRange) => {
    try {
      await loadAnalytics(nextRange);
    } catch (error) {
      const visibleError = handleAppError(error, {
        fallbackMessage: "Unable to load activity right now",
        role: "admin",
        context: "admin_analytics_run",
      });
      setSafeAnalyticsFallbackState(visibleError.message || "Unable to load activity right now");
    }
  }, [loadAnalytics, setSafeAnalyticsFallbackState]);

  useEffect(() => {
    if (initialAnalytics) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void runAnalyticsLoadSafely(initialRange);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [initialAnalytics, initialRange, runAnalyticsLoadSafely]);

  return (
    <AdminAnalyticsView
      analytics={analytics}
      range={range}
      status={status}
      analyticsErrorMessage={analyticsErrorMessage}
      isLoading={isLoading}
      onSelectRange={(nextRange) => {
        void runAnalyticsLoadSafely(nextRange);
      }}
    />
  );
}

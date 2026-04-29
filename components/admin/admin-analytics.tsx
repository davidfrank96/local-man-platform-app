"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  fetchAdminAnalytics,
  fetchAdminAuditLogs,
} from "../../lib/admin/api-client.ts";
import { handleAppError } from "../../lib/errors/ui-error.ts";
import {
  buildAnalyticsMetricCards,
  formatAnalyticsEventLabel,
  getNextRecentAnalyticsEventCount,
  getVisibleRecentAnalyticsEvents,
} from "../../lib/admin/analytics-view.ts";
import { useAdminSession } from "./admin-session-provider.tsx";
import {
  createAuditLogCacheKey,
  readAnalyticsCache,
  readAuditLogCache,
  writeAnalyticsCache,
  writeAuditLogCache,
} from "../../lib/admin/workspace-cache.ts";
import type {
  AdminAnalyticsRange,
  AdminAnalyticsResponseData,
  AdminRole,
  AuditActionType,
  AuditLog,
} from "../../types/index.ts";

const analyticsRanges: Array<{ value: AdminAnalyticsRange; label: string }> = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];
const recentEventsPageSize = 8;
const auditLogsPageSize = 10;
const auditRoleOptions: Array<{ value: "all" | AdminRole; label: string }> = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admins" },
  { value: "agent", label: "Agents" },
];
const auditActionOptions: Array<{ value: "all" | AuditActionType; label: string }> = [
  { value: "all", label: "All actions" },
  { value: "CREATE_VENDOR", label: "Vendor created" },
  { value: "UPDATE_VENDOR", label: "Vendor updated" },
  { value: "UPDATE_VENDOR_STATUS", label: "Vendor status changed" },
  { value: "DELETE_VENDOR", label: "Vendor deleted" },
  { value: "UPLOAD_VENDOR_IMAGE", label: "Vendor image uploaded" },
  { value: "CREATE_ADMIN_USER", label: "Workspace user created" },
  { value: "UPDATE_ADMIN_USER", label: "Workspace user updated" },
  { value: "DELETE_ADMIN_USER", label: "Workspace user deleted" },
  { value: "CHANGE_ADMIN_USER_ROLE", label: "Role changed" },
];

type AuditLogFilterState = {
  userRole: "all" | AdminRole;
  action: "all" | AuditActionType;
};

type AdminAnalyticsProps = {
  initialData?: AdminAnalyticsResponseData | null;
};

type AdminAnalyticsViewProps = {
  analytics: AdminAnalyticsResponseData | null;
  auditLogs: AuditLog[];
  auditFilters: AuditLogFilterState;
  auditStatus: string;
  auditErrorMessage: string | null;
  auditHasMore: boolean;
  isAuditLoading: boolean;
  range: AdminAnalyticsRange;
  status: string;
  analyticsErrorMessage: string | null;
  isLoading: boolean;
  onSelectRange: (range: AdminAnalyticsRange) => void;
  onAuditFilterChange: (filters: AuditLogFilterState) => void;
  onLoadMoreAuditLogs: () => void;
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

function isAuditLog(value: unknown): value is AuditLog {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuditLog>;

  return typeof candidate.id === "string" &&
    typeof candidate.action === "string" &&
    typeof candidate.user_role === "string" &&
    typeof candidate.created_at === "string";
}

function isAuditLogListResult(
  value: unknown,
): value is { auditLogs: AuditLog[]; pagination: { has_more: boolean; next_cursor: string | null } } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    auditLogs?: unknown;
    pagination?: { has_more?: unknown; next_cursor?: unknown };
  };

  return Array.isArray(candidate.auditLogs) &&
    candidate.auditLogs.every(isAuditLog) &&
    typeof candidate.pagination?.has_more === "boolean" &&
    (typeof candidate.pagination?.next_cursor === "string" || candidate.pagination?.next_cursor === null);
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

function formatAuditActionLabel(log: AuditLog): string {
  const targetRole = typeof log.metadata.target_role === "string"
    ? log.metadata.target_role
    : "workspace user";

  switch (log.action) {
    case "CREATE_ADMIN_USER":
      return `created ${targetRole}`;
    case "UPDATE_ADMIN_USER":
      return `updated ${targetRole}`;
    case "DELETE_ADMIN_USER":
      return `deleted ${targetRole}`;
    case "CHANGE_ADMIN_USER_ROLE":
      return `changed ${targetRole} role`;
    default:
      return log.action
        .toLowerCase()
        .replaceAll("_", " ");
  }
}

function getAuditActorLabel(log: AuditLog): string {
  const actor = log.admin_user;
  const metadataActor = typeof log.metadata.actor_label === "string"
    ? log.metadata.actor_label
    : null;

  return actor?.full_name?.trim() ||
    actor?.email ||
    metadataActor ||
    (log.user_role === "admin" ? "Admin user" : "Agent user");
}

function getAuditTargetLabel(log: AuditLog): string {
  const metadata = log.metadata;

  if (typeof metadata.target_name === "string" && metadata.target_name.trim()) {
    return metadata.target_name;
  }

  if (typeof metadata.target_email === "string" && metadata.target_email.trim()) {
    return metadata.target_email;
  }

  if (typeof metadata.target_slug === "string" && metadata.target_slug.trim()) {
    return metadata.target_slug;
  }

  return log.entity_id ??
    (log.entity_type === "admin_user" ? "Admin user" : "Vendor");
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

const AdminAnalyticsView = memo(function AdminAnalyticsView({
  analytics,
  auditLogs,
  auditFilters,
  auditStatus,
  auditErrorMessage,
  auditHasMore,
  isAuditLoading,
  range,
  status,
  analyticsErrorMessage,
  isLoading,
  onSelectRange,
  onAuditFilterChange,
  onLoadMoreAuditLogs,
}: AdminAnalyticsViewProps) {
  const metricCards = useMemo(
    () => (analytics ? buildAnalyticsMetricCards(analytics.summary) : []),
    [analytics],
  );
  const [visibleRecentEventsCount, setVisibleRecentEventsCount] = useState(recentEventsPageSize);
  const recentEvents = analytics?.recent_events;
  const visibleRecentEvents = useMemo(
    () => getVisibleRecentAnalyticsEvents(recentEvents ?? [], visibleRecentEventsCount),
    [recentEvents, visibleRecentEventsCount],
  );
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
                <>
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
                        {visibleRecentEvents.map((event) => (
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
                  {visibleRecentEvents.length < (recentEvents?.length ?? 0) ? (
                    <div className="analytics-load-more">
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={() =>
                          setVisibleRecentEventsCount((current) =>
                            getNextRecentAnalyticsEventCount(
                              current,
                              recentEvents?.length ?? 0,
                              recentEventsPageSize,
                            ),
                          )
                        }
                      >
                      View more activity
                      </button>
                      <span>
                        Showing {visibleRecentEvents.length} of {recentEvents?.length ?? 0}
                      </span>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </div>

          <section className="admin-panel analytics-panel" aria-labelledby="audit-activity">
            <div className="admin-section-header">
              <div>
                <h2 id="audit-activity">Recent team activity</h2>
                <span>Admin and agent actions written to the audit log.</span>
              </div>
            </div>

            <div className="analytics-audit-filter-bar" role="group" aria-label="Audit log filters">
              <label className="analytics-filter-field">
                <span>Role</span>
                <select
                  className="admin-user-inline-input"
                  value={auditFilters.userRole}
                  onChange={(event) =>
                    onAuditFilterChange({
                      ...auditFilters,
                      userRole: event.target.value as AuditLogFilterState["userRole"],
                    })
                  }
                >
                  {auditRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="analytics-filter-field">
                <span>Action</span>
                <select
                  className="admin-user-inline-input"
                  value={auditFilters.action}
                  onChange={(event) =>
                    onAuditFilterChange({
                      ...auditFilters,
                      action: event.target.value as AuditLogFilterState["action"],
                    })
                  }
                >
                  {auditActionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="analytics-audit-status" aria-live="polite">
              {auditStatus}
            </p>

            {auditLogs.length === 0 ? (
              <div className="analytics-empty-state">
                <strong>{auditErrorMessage ? "Team activity unavailable" : "No team activity yet"}</strong>
                <p>
                  {auditErrorMessage
                    ? auditErrorMessage
                    : "Audit log entries will appear here after admin or agent actions are completed."}
                </p>
              </div>
            ) : (
              <>
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th scope="col">User</th>
                        <th scope="col">Role</th>
                        <th scope="col">Action</th>
                        <th scope="col">Target</th>
                        <th scope="col">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td>{getAuditActorLabel(log)}</td>
                          <td>
                            <span className="analytics-badge">{log.user_role}</span>
                          </td>
                          <td>{formatAuditActionLabel(log)}</td>
                          <td>{getAuditTargetLabel(log)}</td>
                          <td>{formatTimestamp(log.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {auditHasMore ? (
                  <div className="analytics-load-more">
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={onLoadMoreAuditLogs}
                      disabled={isAuditLoading}
                    >
                      {isAuditLoading ? "Loading…" : "View more activity"}
                    </button>
                    <span>Showing {auditLogs.length} recent audit entries</span>
                  </div>
                ) : null}
              </>
            )}
          </section>

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
  const accessToken = session?.accessToken ?? null;
  const initialRange = initialData?.range ?? "7d";
  const initialAnalytics = initialData ?? readAnalyticsCache(initialRange);
  const initialAuditCache = readAuditLogCache(
    createAuditLogCacheKey({
      userRole: "all",
      action: "all",
      cursor: null,
      limit: auditLogsPageSize,
    }),
  );
  const [range, setRange] = useState<AdminAnalyticsRange>(initialRange);
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponseData | null>(initialAnalytics);
  const [status, setStatus] = useState(
    initialAnalytics ? "Analytics loaded." : "Load usage signals when ready.",
  );
  const [analyticsErrorMessage, setAnalyticsErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialAnalytics);
  const [auditFilters, setAuditFilters] = useState<AuditLogFilterState>({
    userRole: "all",
    action: "all",
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => initialAuditCache?.auditLogs ?? []);
  const [auditStatus, setAuditStatus] = useState(
    initialAuditCache?.auditLogs.length
      ? "Admin activity loaded."
      : "Load admin activity when ready.",
  );
  const [auditErrorMessage, setAuditErrorMessage] = useState<string | null>(null);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditHasMore, setAuditHasMore] = useState(initialAuditCache?.pagination.has_more ?? false);
  const [auditCursor, setAuditCursor] = useState<string | null>(initialAuditCache?.pagination.next_cursor ?? null);

  const logAnalyticsFetch = useCallback((payload: {
    scope: "analytics" | "audit_logs";
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

  const setSafeAuditFallbackState = useCallback((
    message: string,
    options?: { append?: boolean },
  ) => {
    if (!options?.append) {
      setAuditLogs([]);
    }
    setAuditErrorMessage(message);
    setAuditStatus(message);
    setAuditHasMore(false);
    setAuditCursor(null);
    setIsAuditLoading(false);
  }, []);

  const loadAnalytics = useCallback(async (nextRange: AdminAnalyticsRange) => {
    if (!accessToken) {
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
      const result = await fetchAdminAnalytics(
        { range: nextRange },
        { accessToken },
      );
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
  }, [accessToken, logAnalyticsFetch, setSafeAnalyticsFallbackState, signOut]);

  const loadAuditLogs = useCallback(async (
    filters: AuditLogFilterState,
    options?: { append?: boolean; cursor?: string | null; offset?: number },
  ) => {
    if (!accessToken) {
      setAuditStatus("Admin session is missing. Sign in again.");
      return;
    }

    const append = options?.append ?? false;
    const nextCursor = options?.cursor ?? null;
    const nextOffset = options?.offset ?? 0;
    const auditLogCacheKey = createAuditLogCacheKey({
      userRole: filters.userRole,
      action: filters.action,
      cursor: nextCursor,
      limit: auditLogsPageSize,
    });

    if (!append) {
      const cachedAuditLogs = readAuditLogCache(auditLogCacheKey);

      if (cachedAuditLogs) {
        logAnalyticsFetch({
          scope: "audit_logs",
          count: cachedAuditLogs.auditLogs.length,
          duration: 0,
          status: "cache_hit",
        });
        setAuditLogs(cachedAuditLogs.auditLogs);
        setAuditErrorMessage(null);
        setAuditHasMore(cachedAuditLogs.pagination.has_more);
        setAuditCursor(cachedAuditLogs.pagination.next_cursor);
        setAuditStatus(
          cachedAuditLogs.auditLogs.length > 0
            ? "Admin activity loaded."
            : "No admin activity found for the current filters.",
        );
        setIsAuditLoading(false);
        return;
      }
    }

    setIsAuditLoading(true);
    setAuditErrorMessage(null);
    setAuditStatus(append ? "Loading more admin activity…" : "Loading admin activity…");

    try {
      const startedAt = performance.now();
      const response = await fetchAdminAuditLogs(
        {
          limit: auditLogsPageSize,
          cursor: nextCursor ?? undefined,
          offset: nextOffset,
          user_role: filters.userRole === "all" ? undefined : filters.userRole,
          action: filters.action === "all" ? undefined : filters.action,
        },
        { accessToken },
      );
      if (response.error) {
        logAnalyticsFetch({
          scope: "audit_logs",
          count: 0,
          duration: performance.now() - startedAt,
          status: "error",
        });
        const accessMessage = getAnalyticsAccessErrorMessage(
          response.error,
        );
        handleAppError(response.error, {
          fallbackMessage: accessMessage === response.error.message
            ? "Unable to load activity right now"
            : accessMessage,
          role: "admin",
          context: "admin_audit_logs_load",
        });
        setSafeAuditFallbackState(
          response.error.code === "FORBIDDEN" || response.error.code === "UNAUTHORIZED"
            ? accessMessage
            : "Unable to load activity right now",
          { append },
        );

        if (response.error.code === "UNAUTHORIZED") {
          void signOut();
        }
        return;
      }

      if (!response.data || !isAuditLogListResult(response.data)) {
        logAnalyticsFetch({
          scope: "audit_logs",
          count: 0,
          duration: performance.now() - startedAt,
          status: "error",
        });
        const malformedMessage = "Unable to load activity right now";
        setSafeAuditFallbackState(malformedMessage, { append });
        return;
      }
      const result = response.data;
      logAnalyticsFetch({
        scope: "audit_logs",
        count: result.auditLogs.length,
        duration: performance.now() - startedAt,
        status: "success",
      });
      writeAuditLogCache(auditLogCacheKey, result);
      setAuditLogs((current) => {
        if (!append) {
          return result.auditLogs;
        }

        const seen = new Set(current.map((log) => log.id));
        const appended = result.auditLogs.filter((log) => !seen.has(log.id));
        return [...current, ...appended];
      });
      setAuditErrorMessage(null);
      setAuditHasMore(result.pagination.has_more);
      setAuditCursor(result.pagination.next_cursor);
      setAuditStatus(
        result.auditLogs.length > 0 || append
          ? "Admin activity loaded."
          : "No admin activity found for the current filters.",
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
          context: "admin_audit_logs_load",
        });
        setSafeAuditFallbackState(accessMessage, { append });

        if (error.code === "UNAUTHORIZED") {
          void signOut();
        }
      } else {
        const visibleError = handleAppError(error, {
          fallbackMessage: "Unable to load activity right now",
          role: "admin",
          context: "admin_audit_logs_load",
        });
        const nextStatus = formatAdminErrorStatus(
          error,
          visibleError.message || "Unable to load activity right now",
        );
        setSafeAuditFallbackState(nextStatus, { append });
      }
    } finally {
      setIsAuditLoading(false);
    }
  }, [accessToken, logAnalyticsFetch, setSafeAuditFallbackState, signOut]);

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

  const runAuditLoadSafely = useCallback(async (
    filters: AuditLogFilterState,
    options?: { append?: boolean; cursor?: string | null; offset?: number },
  ) => {
    try {
      await loadAuditLogs(filters, options);
    } catch (error) {
      const visibleError = handleAppError(error, {
        fallbackMessage: "Unable to load activity right now",
        role: "admin",
        context: "admin_audit_logs_run",
      });
      setSafeAuditFallbackState(
        visibleError.message || "Unable to load activity right now",
        { append: options?.append },
      );
    }
  }, [loadAuditLogs, setSafeAuditFallbackState]);

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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void runAuditLoadSafely(auditFilters);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [auditFilters, runAuditLoadSafely]);

  return (
    <AdminAnalyticsView
      analytics={analytics}
      auditLogs={auditLogs}
      auditFilters={auditFilters}
      auditStatus={auditStatus}
      auditErrorMessage={auditErrorMessage}
      auditHasMore={auditHasMore}
      isAuditLoading={isAuditLoading}
      range={range}
      status={status}
      analyticsErrorMessage={analyticsErrorMessage}
      isLoading={isLoading}
      onSelectRange={(nextRange) => {
        void runAnalyticsLoadSafely(nextRange);
      }}
      onAuditFilterChange={(nextFilters) => {
        setAuditFilters(nextFilters);
      }}
      onLoadMoreAuditLogs={() => {
        void runAuditLoadSafely(auditFilters, {
          append: true,
          cursor: auditCursor,
          offset: auditLogs.length,
        });
      }}
    />
  );
}

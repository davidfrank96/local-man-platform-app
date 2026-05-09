"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  fetchAdminOperationalLogs,
} from "../../lib/admin/api-client.ts";
import { handleAppError } from "../../lib/errors/ui-error.ts";
import { AdminScrollPanel } from "./admin-scroll-panel.tsx";
import type {
  OperationalEvent,
  OperationalEventLevel,
  OperationalEventTimeWindow,
} from "../../types/index.ts";

const operationalLogsPageSize = 25;
const operationalLogLevelOptions: Array<{
  value: "all" | OperationalEventLevel;
  label: string;
}> = [
  { value: "all", label: "All levels" },
  { value: "error", label: "Errors" },
  { value: "warn", label: "Warnings" },
  { value: "info", label: "Important info" },
];
const operationalLogAreaOptions = [
  { value: "all", label: "All areas" },
  { value: "auth", label: "Auth" },
  { value: "admin", label: "Admin" },
  { value: "analytics", label: "Analytics" },
  { value: "api", label: "API" },
  { value: "public_discovery", label: "Public discovery" },
  { value: "ratings", label: "Ratings" },
  { value: "storage", label: "Storage" },
  { value: "abuse", label: "Abuse protection" },
  { value: "db", label: "Database" },
  { value: "cache", label: "Cache" },
  { value: "map", label: "Map" },
] as const;
const operationalLogTimeWindowOptions: Array<{
  value: OperationalEventTimeWindow;
  label: string;
}> = [
  { value: "1h", label: "Last hour" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

type AdminLogFilterState = {
  level: "all" | OperationalEventLevel;
  area: "all" | string;
  event: string;
  route: string;
  timeWindow: OperationalEventTimeWindow;
};

type AdminLogsBoardProps = {
  headingId?: string;
  title?: string;
  subtitle?: string;
};

const defaultLogFilters: AdminLogFilterState = {
  level: "all",
  area: "all",
  event: "",
  route: "",
  timeWindow: "24h",
};

function formatAdminErrorStatus(error: unknown, fallbackMessage: string): string {
  try {
    const visibleError = handleAppError(error, {
      fallbackMessage,
      role: "admin",
      context: "admin_logs",
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

function getLogsAccessErrorMessage(error: { code: string; message: string }): string {
  if (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED") {
    return "You do not have access to logs";
  }

  return error.message;
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

function formatDuration(value: number | null): string {
  if (typeof value !== "number") {
    return "—";
  }

  return `${value} ms`;
}

function hasActiveFilters(filters: AdminLogFilterState): boolean {
  return filters.level !== "all" ||
    filters.area !== "all" ||
    filters.event.trim().length > 0 ||
    filters.route.trim().length > 0 ||
    filters.timeWindow !== "24h";
}

function formatLogDetails(log: OperationalEvent): string {
  return JSON.stringify(log.metadata ?? {}, null, 2);
}

function getLogMessage(log: OperationalEvent): string {
  if (typeof log.message === "string" && log.message.trim()) {
    return log.message;
  }

  return "No additional summary provided.";
}

function truncateText(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 1).trimEnd()}…`;
}

function getLogSummaryMessage(log: OperationalEvent): string {
  return truncateText(getLogMessage(log), 132);
}

function formatRequestId(value: string | null): string {
  if (!value) {
    return "Unavailable";
  }

  return value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

function formatOptionalValue(value: string | null): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "—";
  }

  return value;
}

function getExpandedLogFieldCount(log: OperationalEvent): number {
  return [
    typeof log.method === "string" && log.method.trim().length > 0,
    typeof log.actor_role === "string" && log.actor_role.trim().length > 0,
    typeof log.actor_id === "string" && log.actor_id.trim().length > 0,
    typeof log.vendor_slug === "string" && log.vendor_slug.trim().length > 0,
    typeof log.vendor_id === "string" && log.vendor_id.trim().length > 0,
  ].filter(Boolean).length;
}

function mergeOperationalEvents(
  current: OperationalEvent[],
  next: OperationalEvent[],
): OperationalEvent[] {
  const merged = new Map<string, OperationalEvent>();

  for (const event of current) {
    merged.set(event.id, event);
  }

  for (const event of next) {
    merged.set(event.id, event);
  }

  return [...merged.values()];
}

const AdminLogsBoardView = memo(function AdminLogsBoardView({
  logs,
  draftFilters,
  status,
  errorMessage,
  hasMore,
  isLoading,
  headingId,
  title,
  subtitle,
  onDraftFilterChange,
  onApplyFilters,
  onClearFilters,
  onLoadMore,
  onRetry,
  expandedLogIds,
  onToggleLog,
}: {
  logs: OperationalEvent[];
  draftFilters: AdminLogFilterState;
  status: string;
  errorMessage: string | null;
  hasMore: boolean;
  isLoading: boolean;
  headingId: string;
  title: string;
  subtitle: string;
  onDraftFilterChange: (filters: AdminLogFilterState) => void;
  onApplyFilters: (event: FormEvent<HTMLFormElement>) => void;
  onClearFilters: () => void;
  onLoadMore: () => void;
  onRetry: () => void;
  expandedLogIds: ReadonlySet<string>;
  onToggleLog: (logId: string) => void;
}) {
  return (
    <section className="admin-panel analytics-panel" aria-labelledby={headingId}>
      <div className="admin-section-header">
        <div>
          <h2 id={headingId}>{title}</h2>
          <span>{subtitle}</span>
        </div>
      </div>

      <form className="analytics-audit-filter-bar admin-logs-filter-bar" onSubmit={onApplyFilters}>
        <label className="analytics-filter-field">
          <span>Level</span>
          <select
            className="admin-user-inline-input"
            value={draftFilters.level}
            onChange={(event) =>
              onDraftFilterChange({
                ...draftFilters,
                level: event.target.value as AdminLogFilterState["level"],
              })}
          >
            {operationalLogLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="analytics-filter-field">
          <span>Area</span>
          <select
            className="admin-user-inline-input"
            value={draftFilters.area}
            onChange={(event) =>
              onDraftFilterChange({
                ...draftFilters,
                area: event.target.value,
              })}
          >
            {operationalLogAreaOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="analytics-filter-field">
          <span>Event</span>
          <input
            className="admin-user-inline-input"
            type="text"
            value={draftFilters.event}
            onChange={(event) =>
              onDraftFilterChange({
                ...draftFilters,
                event: event.target.value,
              })}
            placeholder="PUBLIC_VENDOR_RATING_FAILED"
          />
        </label>

        <label className="analytics-filter-field">
          <span>Route</span>
          <input
            className="admin-user-inline-input"
            type="text"
            value={draftFilters.route}
            onChange={(event) =>
              onDraftFilterChange({
                ...draftFilters,
                route: event.target.value,
              })}
            placeholder="/api/vendors/nearby"
          />
        </label>

        <label className="analytics-filter-field">
          <span>Time window</span>
          <select
            className="admin-user-inline-input"
            value={draftFilters.timeWindow}
            onChange={(event) =>
              onDraftFilterChange({
                ...draftFilters,
                timeWindow: event.target.value as OperationalEventTimeWindow,
              })}
          >
            {operationalLogTimeWindowOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="admin-logs-filter-actions">
          <button className="button-primary" type="submit" disabled={isLoading}>
            {isLoading ? "Loading…" : "Apply filters"}
          </button>
          <button className="button-secondary" type="button" onClick={onClearFilters} disabled={isLoading}>
            Clear
          </button>
        </div>
      </form>

      <p className="analytics-audit-status" aria-live="polite">
        {status}
      </p>

      {logs.length === 0 ? (
        <div className="analytics-empty-state">
          <strong>{errorMessage ? "Unable to load logs right now" : "No logs found"}</strong>
          <p>
            {errorMessage
              ? errorMessage
              : hasActiveFilters(draftFilters)
                ? "No operational events matched the current filters."
                : "Operational warnings, degraded responses, and failures will appear here when storage is enabled."}
          </p>
          {errorMessage ? (
            <div className="analytics-load-more">
              <button className="button-secondary" type="button" onClick={onRetry} disabled={isLoading}>
                {isLoading ? "Retrying…" : "Retry"}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <AdminScrollPanel className="admin-scroll-panel-logs" ariaLabelledBy={headingId}>
            <div className="admin-log-list">
              {logs.map((log) => (
                <AdminLogRow
                  key={log.id}
                  log={log}
                  expanded={expandedLogIds.has(log.id)}
                  onToggle={onToggleLog}
                />
              ))}
            </div>
          </AdminScrollPanel>

          {hasMore ? (
            <div className="analytics-load-more">
              <button
                className="button-secondary"
                type="button"
                onClick={onLoadMore}
                disabled={isLoading}
              >
                {isLoading ? "Loading…" : "Load more logs"}
              </button>
              <span>Showing {logs.length} recent operational events</span>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
});

function AdminLogRow({
  log,
  expanded,
  onToggle,
}: {
  log: OperationalEvent;
  expanded: boolean;
  onToggle: (logId: string) => void;
}) {
  const detailId = useId();
  const hasMetadata = Object.keys(log.metadata ?? {}).length > 0;
  const expandedFieldCount = getExpandedLogFieldCount(log);
  const summaryMessage = getLogSummaryMessage(log);

  return (
    <article
      className="admin-log-item"
      key={log.id}
      data-log-level={log.level}
      data-expanded={expanded ? "true" : "false"}
    >
      <button
        className="admin-log-toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls={detailId}
        aria-describedby={`${detailId}-summary`}
        onClick={() => onToggle(log.id)}
      >
        <div className="admin-log-item-header">
          <div className="admin-log-item-badges">
            <span className={`admin-log-level-badge admin-log-level-badge-${log.level}`}>
              {log.level}
            </span>
            <span className="analytics-badge">{log.area}</span>
            <span className="analytics-badge">{log.event}</span>
          </div>
          <div className="admin-log-item-header-meta">
            <time dateTime={log.created_at}>{formatTimestamp(log.created_at)}</time>
            <span className="admin-log-toggle-indicator">
              {expanded ? "Collapse" : "Expand"}
            </span>
          </div>
        </div>

        <p className="admin-log-item-message" id={`${detailId}-summary`}>
          {summaryMessage}
        </p>

        <div className="admin-log-summary-grid" aria-label={`Summary for ${log.event}`}>
          <div>
            <span>Route</span>
            <strong>{formatOptionalValue(log.route)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{typeof log.status === "number" ? `HTTP ${log.status}` : "—"}</strong>
          </div>
          <div>
            <span>Duration</span>
            <strong>{formatDuration(log.duration_ms)}</strong>
          </div>
          <div>
            <span>Request ID</span>
            <strong title={log.request_id ?? "Unavailable"}>{formatRequestId(log.request_id)}</strong>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="admin-log-expanded" id={detailId} aria-labelledby={`${detailId}-summary`}>
          <div className="admin-log-expanded-block">
            <span>Full message</span>
            <p className="admin-log-item-message">{getLogMessage(log)}</p>
          </div>

          <div
            className={
              expandedFieldCount > 0
                ? "admin-log-field-grid admin-log-field-grid-expanded"
                : "admin-log-field-grid"
            }
          >
            <div>
              <span>Route</span>
              <strong>{formatOptionalValue(log.route)}</strong>
            </div>
            <div>
              <span>Method</span>
              <strong>{formatOptionalValue(log.method)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{typeof log.status === "number" ? `HTTP ${log.status}` : "—"}</strong>
            </div>
            <div>
              <span>Duration</span>
              <strong>{formatDuration(log.duration_ms)}</strong>
            </div>
            <div>
              <span>Request ID</span>
              <strong>{log.request_id ?? "Unavailable"}</strong>
            </div>
            <div>
              <span>Actor role</span>
              <strong>{formatOptionalValue(log.actor_role)}</strong>
            </div>
            <div>
              <span>Actor ID</span>
              <strong>{formatOptionalValue(log.actor_id)}</strong>
            </div>
            <div>
              <span>Vendor slug</span>
              <strong>{formatOptionalValue(log.vendor_slug)}</strong>
            </div>
            <div>
              <span>Vendor ID</span>
              <strong>{formatOptionalValue(log.vendor_id)}</strong>
            </div>
          </div>

          {hasMetadata ? (
            <details className="admin-log-details">
              <summary>View sanitized metadata</summary>
              <pre>{formatLogDetails(log)}</pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function AdminLogsBoard({
  headingId = "admin-logs",
  title = "Recent platform logs",
  subtitle = "Operational warnings, failures, degraded responses, and slow requests captured in structured storage.",
}: AdminLogsBoardProps) {
  const requestSequence = useRef(0);
  const logsRef = useRef<OperationalEvent[]>([]);
  const [filters, setFilters] = useState<AdminLogFilterState>(defaultLogFilters);
  const [draftFilters, setDraftFilters] = useState<AdminLogFilterState>(defaultLogFilters);
  const [logs, setLogs] = useState<OperationalEvent[]>([]);
  const [status, setStatus] = useState("Load platform logs when ready.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(() => new Set());

  const loadLogs = useCallback(async ({
    nextCursorValue = null,
    merge = false,
    activeFilters = filters,
  }: {
    nextCursorValue?: string | null;
    merge?: boolean;
    activeFilters?: AdminLogFilterState;
  } = {}) => {
    const requestId = ++requestSequence.current;
    const offset = nextCursorValue ? Number.parseInt(nextCursorValue, 10) || 0 : 0;
    setIsLoading(true);
    setStatus(
      merge
        ? "Loading more platform logs…"
        : hasActiveFilters(activeFilters)
          ? "Applying log filters…"
          : "Loading platform logs…",
    );

    const result = await fetchAdminOperationalLogs({
      limit: operationalLogsPageSize,
      offset,
      level: activeFilters.level === "all" ? undefined : activeFilters.level,
      area: activeFilters.area === "all" ? undefined : activeFilters.area,
      event: activeFilters.event.trim() || undefined,
      route: activeFilters.route.trim() || undefined,
      time_window: activeFilters.timeWindow,
    });

    if (requestSequence.current !== requestId) {
      return;
    }

    if (result.error) {
      setErrorMessage(
        formatAdminErrorStatus(
          result.error,
          getLogsAccessErrorMessage(result.error),
        ),
      );
      setStatus("Unable to load logs right now.");
      setHasMore(false);
      setNextCursor(null);

      if (!merge) {
        logsRef.current = [];
        setLogs([]);
        setExpandedLogIds(new Set());
      }

      setIsLoading(false);
      return;
    }

    const nextLogs = merge
      ? mergeOperationalEvents(logsRef.current, result.data.operationalEvents)
      : result.data.operationalEvents;

    logsRef.current = nextLogs;
    setLogs(nextLogs);
    setExpandedLogIds((current) => {
      if (current.size === 0) {
        return current;
      }

      const visibleIds = new Set(nextLogs.map((entry) => entry.id));
      const nextExpanded = new Set([...current].filter((logId) => visibleIds.has(logId)));
      return nextExpanded.size === current.size ? current : nextExpanded;
    });
    setHasMore(result.data.pagination.has_more);
    setNextCursor(result.data.pagination.next_cursor);
    setErrorMessage(null);
    setStatus(
      nextLogs.length === 0
        ? hasActiveFilters(activeFilters)
          ? "No logs match these filters."
          : "No logs stored yet."
        : merge
          ? "More platform logs loaded."
          : "Platform logs loaded.",
    );
    setIsLoading(false);
  }, [filters]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLogs({
        nextCursorValue: null,
        merge: false,
        activeFilters: filters,
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filters, loadLogs]);

  const handleApplyFilters = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({
      level: draftFilters.level,
      area: draftFilters.area,
      event: draftFilters.event.trim(),
      route: draftFilters.route.trim(),
      timeWindow: draftFilters.timeWindow,
    });
  }, [draftFilters]);

  const handleClearFilters = useCallback(() => {
    setDraftFilters(defaultLogFilters);
    setFilters(defaultLogFilters);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor || isLoading) {
      return;
    }

    void loadLogs({
      nextCursorValue: nextCursor,
      merge: true,
      activeFilters: filters,
    });
  }, [filters, isLoading, loadLogs, nextCursor]);

  const handleRetry = useCallback(() => {
    void loadLogs({
      nextCursorValue: null,
      merge: false,
      activeFilters: filters,
    });
  }, [filters, loadLogs]);

  const handleToggleLog = useCallback((logId: string) => {
    setExpandedLogIds((current) => {
      const nextExpanded = new Set(current);

      if (nextExpanded.has(logId)) {
        nextExpanded.delete(logId);
      } else {
        nextExpanded.add(logId);
      }

      return nextExpanded;
    });
  }, []);

  return (
    <AdminLogsBoardView
      logs={logs}
      draftFilters={draftFilters}
      status={status}
      errorMessage={errorMessage}
      hasMore={hasMore}
      isLoading={isLoading}
      headingId={headingId}
      title={title}
      subtitle={subtitle}
      onDraftFilterChange={setDraftFilters}
      onApplyFilters={handleApplyFilters}
      onClearFilters={handleClearFilters}
      onLoadMore={handleLoadMore}
      onRetry={handleRetry}
      expandedLogIds={expandedLogIds}
      onToggleLog={handleToggleLog}
    />
  );
}

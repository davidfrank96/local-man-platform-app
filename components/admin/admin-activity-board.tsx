"use client";

import { memo, useCallback, useEffect, useState } from "react";
import {
  AdminApiError,
  fetchAdminAuditLogs,
} from "../../lib/admin/api-client.ts";
import { handleAppError } from "../../lib/errors/ui-error.ts";
import { useAdminSession } from "./admin-session-provider.tsx";
import {
  createAuditLogCacheKey,
  readAuditLogCache,
  writeAuditLogCache,
} from "../../lib/admin/workspace-cache.ts";
import { AdminScrollPanel } from "./admin-scroll-panel.tsx";
import type {
  AdminRole,
  AuditActionType,
  AuditLog,
} from "../../types/index.ts";

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

type AdminActivityBoardProps = {
  headingId?: string;
  title?: string;
  subtitle?: string;
};

type AdminActivityBoardViewProps = {
  auditLogs: AuditLog[];
  auditFilters: AuditLogFilterState;
  auditStatus: string;
  auditErrorMessage: string | null;
  auditHasMore: boolean;
  isAuditLoading: boolean;
  headingId: string;
  title: string;
  subtitle: string;
  onAuditFilterChange: (filters: AuditLogFilterState) => void;
  onLoadMoreAuditLogs: () => void;
};

function formatAdminErrorStatus(error: unknown, fallbackMessage: string): string {
  try {
    const visibleError = handleAppError(error, {
      fallbackMessage,
      role: "admin",
      context: "admin_activity",
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

function getActivityAccessErrorMessage(error: { code: string; message: string }): string {
  if (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED") {
    return "You do not have access to activity";
  }

  return error.message;
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

const AdminActivityBoardView = memo(function AdminActivityBoardView({
  auditLogs,
  auditFilters,
  auditStatus,
  auditErrorMessage,
  auditHasMore,
  isAuditLoading,
  headingId,
  title,
  subtitle,
  onAuditFilterChange,
  onLoadMoreAuditLogs,
}: AdminActivityBoardViewProps) {
  return (
    <section className="admin-panel analytics-panel" aria-labelledby={headingId}>
      <div className="admin-section-header">
        <div>
          <h2 id={headingId}>{title}</h2>
          <span>{subtitle}</span>
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
              })}
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
              })}
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
          <AdminScrollPanel className="admin-scroll-panel-activity" ariaLabelledBy={headingId}>
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
          </AdminScrollPanel>

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
  );
});

export function AdminActivityBoard({
  headingId = "audit-activity",
  title = "Recent team activity",
  subtitle = "Admin and agent actions written to the audit log.",
}: AdminActivityBoardProps) {
  const { session, signOut } = useAdminSession();
  const initialAuditCache = readAuditLogCache(
    createAuditLogCacheKey({
      userRole: "all",
      action: "all",
      cursor: null,
      limit: auditLogsPageSize,
    }),
  );
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

  const logActivityFetch = useCallback((payload: {
    scope: "audit_logs";
    count: number;
    duration: number;
    status: "success" | "error" | "cache_hit";
  }) => {
    console.warn({
      type: "ANALYTICS_FETCH",
      ...payload,
    });
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

  const loadAuditLogs = useCallback(async (
    filters: AuditLogFilterState,
    options?: { append?: boolean; cursor?: string | null; offset?: number },
  ) => {
    if (!session) {
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
        logActivityFetch({
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
      const response = await fetchAdminAuditLogs({
        limit: auditLogsPageSize,
        cursor: nextCursor ?? undefined,
        offset: nextOffset,
        user_role: filters.userRole === "all" ? undefined : filters.userRole,
        action: filters.action === "all" ? undefined : filters.action,
      });

      if (response.error) {
        logActivityFetch({
          scope: "audit_logs",
          count: 0,
          duration: performance.now() - startedAt,
          status: "error",
        });
        const accessMessage = getActivityAccessErrorMessage(response.error);
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
        logActivityFetch({
          scope: "audit_logs",
          count: 0,
          duration: performance.now() - startedAt,
          status: "error",
        });
        setSafeAuditFallbackState("Unable to load activity right now", { append });
        return;
      }

      const result = response.data;
      logActivityFetch({
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
        const accessMessage = getActivityAccessErrorMessage(error);
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
  }, [logActivityFetch, session, setSafeAuditFallbackState, signOut]);

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
    const timeout = window.setTimeout(() => {
      void runAuditLoadSafely(auditFilters);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [auditFilters, runAuditLoadSafely]);

  return (
    <AdminActivityBoardView
      auditLogs={auditLogs}
      auditFilters={auditFilters}
      auditStatus={auditStatus}
      auditErrorMessage={auditErrorMessage}
      auditHasMore={auditHasMore}
      isAuditLoading={isAuditLoading}
      headingId={headingId}
      title={title}
      subtitle={subtitle}
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

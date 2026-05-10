import { AdminLogsBoard } from "../../../components/admin/admin-logs-board.tsx";
import { AdminRouteGuard } from "../../../components/admin/admin-route-guard.tsx";
import { AdminShell } from "../../../components/admin/admin-shell.tsx";
import { getAdminDatabaseConsistencyStatus } from "../../../lib/runtime/db-consistency.ts";

export default async function AdminLogsPage() {
  const consistencyStatus = await getAdminDatabaseConsistencyStatus();
  const logsBlocked = consistencyStatus.severity === "critical";

  return (
    <AdminRouteGuard requiredPermission="platform_logs:read">
      <AdminShell
        title="Logs"
        intro="Inspect recent platform warnings, failures, degraded responses, rate-limit blocks, and slow requests without mixing them with team activity."
      >
        {logsBlocked ? (
          <section className="admin-panel analytics-panel" aria-labelledby="logs-blocked">
            <div className="analytics-empty-state">
              <strong id="logs-blocked">System configuration error</strong>
              <p>Contact admin.</p>
            </div>
          </section>
        ) : (
          <AdminLogsBoard />
        )}
      </AdminShell>
    </AdminRouteGuard>
  );
}

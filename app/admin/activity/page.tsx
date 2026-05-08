import { AdminActivityBoard } from "../../../components/admin/admin-activity-board.tsx";
import { AdminRouteGuard } from "../../../components/admin/admin-route-guard.tsx";
import { AdminShell } from "../../../components/admin/admin-shell.tsx";
import { getAdminDatabaseConsistencyStatus } from "../../../lib/runtime/db-consistency.ts";

export default async function AdminActivityPage() {
  const consistencyStatus = await getAdminDatabaseConsistencyStatus();
  const activityBlocked = consistencyStatus.severity === "critical";

  return (
    <AdminRouteGuard requiredPermission="audit_logs:read">
      <AdminShell
        title="Activity"
        intro="Review recent admin and agent actions captured in the audit log without leaving the workspace."
      >
        {activityBlocked ? (
          <section className="admin-panel analytics-panel" aria-labelledby="activity-blocked">
            <div className="analytics-empty-state">
              <strong id="activity-blocked">System configuration error</strong>
              <p>Contact admin.</p>
            </div>
          </section>
        ) : (
          <AdminActivityBoard />
        )}
      </AdminShell>
    </AdminRouteGuard>
  );
}

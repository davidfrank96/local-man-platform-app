import { AdminAnalytics } from "../../../components/admin/admin-analytics.tsx";
import { AdminRouteGuard } from "../../../components/admin/admin-route-guard.tsx";
import { AdminShell } from "../../../components/admin/admin-shell.tsx";
import { getAdminDatabaseConsistencyStatus } from "../../../lib/runtime/db-consistency.ts";

export default async function AdminAnalyticsPage() {
  const consistencyStatus = await getAdminDatabaseConsistencyStatus();
  const analyticsBlocked = consistencyStatus.severity === "critical";

  return (
    <AdminRouteGuard requiredPermission="analytics:read">
      <AdminShell
        title="Analytics"
        intro="Review lightweight usage signals, vendor engagement, and drop-off patterns without leaving the admin workspace."
      >
        {analyticsBlocked ? (
          <section className="admin-panel analytics-panel" aria-labelledby="analytics-blocked">
            <div className="analytics-empty-state">
              <strong id="analytics-blocked">System configuration error</strong>
              <p>Contact admin.</p>
            </div>
          </section>
        ) : (
          <AdminAnalytics />
        )}
      </AdminShell>
    </AdminRouteGuard>
  );
}

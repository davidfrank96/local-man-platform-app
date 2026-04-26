import { AdminAnalytics } from "../../../components/admin/admin-analytics.tsx";
import { AdminRouteGuard } from "../../../components/admin/admin-route-guard.tsx";
import { AdminShell } from "../../../components/admin/admin-shell.tsx";

export default function AdminAnalyticsPage() {
  return (
    <AdminRouteGuard>
      <AdminShell
        title="Analytics"
        intro="Review lightweight usage signals, vendor engagement, and drop-off patterns without leaving the admin workspace."
      >
        <AdminAnalytics />
      </AdminShell>
    </AdminRouteGuard>
  );
}

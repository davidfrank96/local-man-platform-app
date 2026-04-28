import { AdminShell } from "../../../components/admin/admin-shell.tsx";
import { AdminConsole } from "../../../components/admin/admin-console.tsx";
import { AdminRouteGuard } from "../../../components/admin/admin-route-guard.tsx";

export default function AdminDashboardPage() {
  return (
    <AdminRouteGuard allowedRoles={["admin"]} redirectUnauthorizedRoleToHome>
      <AdminShell
        title="Dashboard"
        intro="Track vendor readiness, spot missing data, and jump into the next operational task."
      >
        <AdminConsole mode="dashboard" />
      </AdminShell>
    </AdminRouteGuard>
  );
}

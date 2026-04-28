import { AdminShell } from "../../../components/admin/admin-shell.tsx";
import { AdminConsole } from "../../../components/admin/admin-console.tsx";
import { AdminRouteGuard } from "../../../components/admin/admin-route-guard.tsx";

export default function AgentDashboardPage() {
  return (
    <AdminRouteGuard allowedRoles={["agent"]} redirectUnauthorizedRoleToHome>
      <AdminShell
        title="Agent dashboard"
        intro="Create vendors, review completeness, and move directly into editing without exposing admin-only tools."
      >
        <AdminConsole mode="agent" />
      </AdminShell>
    </AdminRouteGuard>
  );
}

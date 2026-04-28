import { AdminShell } from "../../../components/admin/admin-shell.tsx";
import { AdminRouteGuard } from "../../../components/admin/admin-route-guard.tsx";
import { AdminUserManagement } from "../../../components/admin/admin-user-management.tsx";

export default function AdminTeamPage() {
  return (
    <AdminRouteGuard requiredPermission="admin_users:manage">
      <AdminShell
        title="Team access"
        intro="Create admin or agent accounts and keep role assignment explicit."
      >
        <AdminUserManagement />
      </AdminShell>
    </AdminRouteGuard>
  );
}

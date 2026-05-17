import { AdminShell } from "../../../components/admin/admin-shell.tsx";
import { AdminRouteGuard } from "../../../components/admin/admin-route-guard.tsx";
import { AdminRiderManagement } from "../../../components/admin/admin-rider-management.tsx";

export default function AdminRidersPage() {
  return (
    <AdminRouteGuard requiredPermission="riders:manage">
      <AdminShell
        title="Riders"
        intro="Review independent rider applications and control future rider suggestion visibility."
      >
        <AdminRiderManagement />
      </AdminShell>
    </AdminRouteGuard>
  );
}

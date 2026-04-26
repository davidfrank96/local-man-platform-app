import { AdminShell } from "../../../components/admin/admin-shell.tsx";
import { AdminConsole } from "../../../components/admin/admin-console.tsx";
import { AdminRouteGuard } from "../../../components/admin/admin-route-guard.tsx";

export default function AdminVendorsPage() {
  return (
    <AdminRouteGuard>
      <AdminShell
        title="Manage vendors"
        intro="Search the vendor registry, review completeness, and move directly into editing."
      >
        <AdminConsole mode="vendors" />
      </AdminShell>
    </AdminRouteGuard>
  );
}

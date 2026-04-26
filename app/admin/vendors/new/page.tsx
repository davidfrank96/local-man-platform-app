import { AdminShell } from "../../../../components/admin/admin-shell.tsx";
import { AdminConsole } from "../../../../components/admin/admin-console.tsx";
import { AdminRouteGuard } from "../../../../components/admin/admin-route-guard.tsx";

export default function AdminVendorCreatePage() {
  return (
    <AdminRouteGuard>
      <AdminShell
        title="Create vendor"
        intro="Create the base vendor record, capture essential identity fields, and acknowledge any missing linked data intentionally."
      >
        <AdminConsole mode="create" />
      </AdminShell>
    </AdminRouteGuard>
  );
}

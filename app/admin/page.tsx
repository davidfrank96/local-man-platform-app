import Link from "next/link";
import { AdminConsole } from "../../components/admin/admin-console.tsx";
import { AdminRouteGuard } from "../../components/admin/admin-route-guard.tsx";

export default function AdminPage() {
  return (
    <AdminRouteGuard>
      <main className="page-shell">
        <p className="eyebrow">Phase 4B admin workspace</p>
        <h1>Admin workspace</h1>
        <p className="page-intro">Manage Abuja vendor records.</p>
        <div className="action-row admin-route-links">
          <Link className="button-secondary" href="/admin/vendors">
            Vendor list
          </Link>
          <Link className="button-secondary" href="/admin/vendors/new">
            Create vendor
          </Link>
        </div>
        <AdminConsole />
      </main>
    </AdminRouteGuard>
  );
}

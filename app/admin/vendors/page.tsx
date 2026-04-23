import Link from "next/link";
import { AdminConsole } from "../../../components/admin/admin-console.tsx";

export default function AdminVendorsPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Admin vendors</p>
      <h1>Vendor list</h1>
      <p className="page-intro">Review and manage Abuja vendor records.</p>
      <div className="action-row admin-route-links">
        <Link className="button-secondary" href="/admin">
          Admin home
        </Link>
        <Link className="button-secondary" href="/admin/vendors/new">
          Create vendor
        </Link>
      </div>
      <AdminConsole />
    </main>
  );
}

import Link from "next/link";
import { AdminConsole } from "../../../../components/admin/admin-console.tsx";

export default function AdminVendorCreatePage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Admin vendors</p>
      <h1>Create vendor</h1>
      <p className="page-intro">Create a vendor and complete the related data.</p>
      <div className="action-row admin-route-links">
        <Link className="button-secondary" href="/admin">
          Admin home
        </Link>
        <Link className="button-secondary" href="/admin/vendors">
          Vendor list
        </Link>
      </div>
      <AdminConsole />
    </main>
  );
}

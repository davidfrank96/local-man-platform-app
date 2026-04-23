import Link from "next/link";
import { AdminConsole } from "../../../../components/admin/admin-console.tsx";

type AdminVendorEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminVendorEditPage({
  params,
}: AdminVendorEditPageProps) {
  const { id } = await params;

  return (
    <main className="page-shell">
      <p className="eyebrow">Admin vendors</p>
      <h1>Edit vendor</h1>
      <p className="page-intro">Load vendors to select and update this record.</p>
      <div className="action-row admin-route-links">
        <Link className="button-secondary" href="/admin">
          Admin home
        </Link>
        <Link className="button-secondary" href="/admin/vendors">
          Vendor list
        </Link>
      </div>
      <AdminConsole initialSelectedVendorId={id} />
    </main>
  );
}

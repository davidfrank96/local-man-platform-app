import { AdminShell } from "../../../../components/admin/admin-shell.tsx";
import { AdminConsole } from "../../../../components/admin/admin-console.tsx";
import { AdminRouteGuard } from "../../../../components/admin/admin-route-guard.tsx";

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
    <AdminRouteGuard>
      <AdminShell
        title="Edit vendor"
        intro="Manage one vendor across details, hours, featured dishes, and profile images from a dedicated editing workspace."
      >
        <AdminConsole initialSelectedVendorId={id} mode="edit" />
      </AdminShell>
    </AdminRouteGuard>
  );
}

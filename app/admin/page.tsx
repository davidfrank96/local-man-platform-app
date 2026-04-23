import { AdminConsole } from "../../components/admin/admin-console.tsx";

export default function AdminPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Phase 2B admin foundation</p>
      <h1>Admin workspace</h1>
      <p className="page-intro">Manage Abuja vendor records.</p>
      <AdminConsole />
    </main>
  );
}

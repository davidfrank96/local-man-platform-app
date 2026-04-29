import type { ReactNode } from "react";
import { AdminSessionProvider } from "../../components/admin/admin-session-provider.tsx";
import { getAdminDatabaseConsistencyStatus } from "../../lib/runtime/db-consistency.ts";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const consistencyStatus = await getAdminDatabaseConsistencyStatus();

  return (
    <AdminSessionProvider>
      {consistencyStatus.message ? (
        <div
          className={`admin-runtime-warning admin-runtime-warning-${consistencyStatus.severity ?? "low"}`}
          role="alert"
        >
          <strong>{consistencyStatus.title ?? "Database warning"}</strong>
          <p>{consistencyStatus.message}</p>
        </div>
      ) : null}
      {children}
    </AdminSessionProvider>
  );
}

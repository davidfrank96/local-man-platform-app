import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AdminSessionProvider } from "../../components/admin/admin-session-provider.tsx";
import {
  ADMIN_ACCESS_COOKIE_NAME,
  ADMIN_REFRESH_COOKIE_NAME,
} from "../../lib/admin/session-cookies.ts";
import { getAdminDatabaseConsistencyStatus } from "../../lib/runtime/db-consistency.ts";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const consistencyStatus = await getAdminDatabaseConsistencyStatus();
  const cookieStore = await cookies();
  const hasInitialSessionCookie =
    cookieStore.has(ADMIN_ACCESS_COOKIE_NAME) || cookieStore.has(ADMIN_REFRESH_COOKIE_NAME);

  return (
    <AdminSessionProvider hasInitialSessionCookie={hasInitialSessionCookie}>
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

import type { ReactNode } from "react";
import { AdminSessionProvider } from "../../components/admin/admin-session-provider.tsx";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminSessionProvider>{children}</AdminSessionProvider>;
}

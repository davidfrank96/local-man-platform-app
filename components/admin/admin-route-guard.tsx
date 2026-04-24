"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminSession } from "./admin-session-provider.tsx";

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, error, signOut } = useAdminSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      const next = pathname && pathname !== "/admin" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/admin/login${next}`);
    }
  }, [pathname, router, status]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="page-shell">
        <p className="eyebrow">Admin access</p>
        <h1>Checking session</h1>
        <p className="page-intro">Verifying admin access before loading the workspace.</p>
      </main>
    );
  }

  if (status === "forbidden") {
    return (
      <main className="page-shell">
        <p className="eyebrow">Admin access</p>
        <h1>Access denied</h1>
        <p className="page-intro">{error ?? "Authenticated account is not an admin."}</p>
        <div className="action-row">
          <button className="button-primary" type="button" onClick={() => void signOut()}>
            Sign out
          </button>
          <Link className="button-secondary" href="/">
            Back to app
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

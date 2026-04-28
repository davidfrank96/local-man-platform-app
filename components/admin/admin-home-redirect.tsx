"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminSession } from "./admin-session-provider.tsx";
import { getAdminHomePath } from "../../lib/admin/navigation.ts";

export function AdminHomeRedirect() {
  const router = useRouter();
  const { status, session, error, signOut } = useAdminSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/admin/login");
      return;
    }

    if (status === "authenticated" && session) {
      router.replace(getAdminHomePath(session.adminUser.role));
    }
  }, [router, session, status]);

  if (status === "loading" || status === "unauthenticated" || status === "authenticated") {
    return (
      <main className="page-shell">
        <p className="eyebrow">Admin access</p>
        <h1>Opening workspace</h1>
        <p className="page-intro">Routing this account to the correct operations workspace.</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <p className="eyebrow">Admin access</p>
      <h1>Access denied</h1>
      <p className="page-intro">
        {error ?? "Authenticated account is not authorized for this workspace."}
      </p>
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

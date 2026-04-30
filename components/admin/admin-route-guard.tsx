"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminSession } from "./admin-session-provider.tsx";
import {
  getAdminRoleLabel,
  hasAdminPermission,
  type AdminPermission,
} from "../../lib/admin/rbac.ts";
import type { AdminRole } from "../../types/index.ts";
import { getAdminHomePath } from "../../lib/admin/navigation.ts";

export function AdminRouteGuard({
  children,
  requiredPermission,
  allowedRoles,
  redirectUnauthorizedRoleToHome = false,
}: {
  children: ReactNode;
  requiredPermission?: AdminPermission;
  allowedRoles?: AdminRole[];
  redirectUnauthorizedRoleToHome?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, error, session, signOut } = useAdminSession();
  const role = session?.adminUser.role ?? null;
  const hasAllowedRole = !allowedRoles || (role ? allowedRoles.includes(role) : false);
  const hasRequiredPermission =
    !requiredPermission || (role ? hasAdminPermission(role, requiredPermission) : false);
  const isAgentUnauthorizedForRoute =
    status === "authenticated" &&
    role === "agent" &&
    (!hasRequiredPermission || !hasAllowedRole);
  const shouldRedirectToRoleHome =
    status === "authenticated" &&
    role !== null &&
    (isAgentUnauthorizedForRoute || (redirectUnauthorizedRoleToHome && !hasAllowedRole));

  useEffect(() => {
    if (status === "unauthenticated") {
      const next = pathname && pathname !== "/admin" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/admin/login${next}`);
      return;
    }

    if (shouldRedirectToRoleHome) {
      const target = getAdminHomePath(role);

      if (pathname !== target) {
        router.replace(target);
      }
    }
  }, [pathname, role, router, shouldRedirectToRoleHome, status]);

  if (status === "loading" || status === "unauthenticated" || shouldRedirectToRoleHome) {
    return (
      <main className="page-shell">
        <p className="eyebrow">Admin access</p>
        <h1>{shouldRedirectToRoleHome ? "Opening workspace" : "Checking session"}</h1>
        <p className="page-intro">
          {shouldRedirectToRoleHome
            ? "Routing this account to the correct operations workspace."
            : "Verifying admin access before loading the workspace."}
        </p>
      </main>
    );
  }

  if (status === "forbidden" || (status === "authenticated" && (!hasRequiredPermission || !hasAllowedRole))) {
    return (
      <main className="page-shell">
        <p className="eyebrow">Admin access</p>
        <h1>Access denied</h1>
        <p className="page-intro">
          {status === "forbidden"
            ? error ?? "Authenticated account is not authorized for this workspace."
            : !hasAllowedRole
              ? `${getAdminRoleLabel(role ?? "agent")} accounts cannot access this workspace.`
            : `${getAdminRoleLabel(role ?? "agent")} accounts cannot access this area.`}
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

  return <>{children}</>;
}

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminSession } from "./admin-session-provider.tsx";
import {
  getAdminRoleLabel,
  hasAdminPermission,
} from "../../lib/admin/rbac.ts";
import { getAdminHomePath } from "../../lib/admin/navigation.ts";

type AdminShellProps = {
  title: string;
  intro: string;
  children: ReactNode;
};

export function AdminShell({ title, intro, children }: AdminShellProps) {
  const pathname = usePathname();
  const { session, signOut } = useAdminSession();
  const role = session?.adminUser.role ?? "admin";
  const homePath = getAdminHomePath(role);
  const adminNavItems = [
    { href: homePath, label: "Dashboard" },
    { href: "/admin/analytics", label: "Analytics", permission: "analytics:read" as const },
    { href: "/admin/vendors", label: "Manage vendors" },
    { href: "/admin/vendors/new", label: "Create vendor" },
    { href: "/admin/team", label: "Team access", permission: "admin_users:manage" as const },
  ];
  const visibleNavItems = adminNavItems.filter(
    (item) => !item.permission || hasAdminPermission(role, item.permission),
  );

  function isNavItemActive(href: string): boolean {
    if (!pathname) {
      return false;
    }

    if (href === "/admin/vendors/new") {
      return pathname === href;
    }

    if (href === "/admin/vendors") {
      return pathname === href ||
        (pathname !== "/admin/vendors/new" && /^\/admin\/vendors\/[^/]+$/.test(pathname));
    }

    return pathname === href;
  }

  return (
    <main className="admin-workspace-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <p className="eyebrow">The Local Man</p>
          <h1>{role === "admin" ? "Admin workspace" : "Agent workspace"}</h1>
          <p>
            {role === "admin"
              ? "Vendor operations, content quality, and publish readiness."
              : "Vendor creation, editing, and content completeness for assigned operations."}
          </p>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Admin navigation">
          {visibleNavItems.map((item) => {
            const isActive = isNavItemActive(item.href);

            return (
              <Link
                key={item.href}
                className={isActive ? "admin-nav-link active" : "admin-nav-link"}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-session">
          <strong>{session?.adminUser.full_name ?? session?.adminUser.email ?? "Admin user"}</strong>
          <span>{session?.user.email ?? "Session active"}</span>
          <span>{getAdminRoleLabel(role)}</span>
          <button className="button-secondary" type="button" onClick={() => void signOut()}>
            Log out
          </button>
        </div>
      </aside>

      <section className="admin-workspace-main">
        <header className="admin-workspace-header">
          <div className="admin-workspace-header-copy">
            <p className="eyebrow">Operations workspace</p>
            <h1>{title}</h1>
            <p className="page-intro">{intro}</p>
          </div>
          <div className="admin-workspace-header-meta">
            <span>Internal operations</span>
            <strong>{getAdminRoleLabel(role)}</strong>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

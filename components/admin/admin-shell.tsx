"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useAdminSession } from "./admin-session-provider.tsx";
import {
  getAdminRoleLabel,
  hasAdminPermission,
} from "../../lib/admin/rbac.ts";
import { getAdminHomePath } from "../../lib/admin/navigation.ts";
import { AdminIcon, type AdminIconName } from "./admin-icons.tsx";

type AdminShellProps = {
  title: string;
  intro: string;
  children: ReactNode;
};

type AdminNavItem = {
  href: string;
  icon: AdminIconName;
  label: string;
  permission?: Parameters<typeof hasAdminPermission>[1];
};

type AdminNavSection = {
  items: AdminNavItem[];
  label: string;
};

export function AdminShell({ title, intro, children }: AdminShellProps) {
  const pathname = usePathname();
  const { session, signOut } = useAdminSession();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const role = session?.adminUser.role ?? "admin";
  const homePath = getAdminHomePath(role);
  const adminNavSections: AdminNavSection[] = useMemo(
    () => [
      {
        label: "Dashboard",
        items: [
          { href: homePath, icon: "grid", label: "Dashboard" },
        ],
      },
      {
        label: "Operations",
        items: [
          { href: "/admin/vendors", icon: "storefront", label: "Manage vendors" },
          { href: "/admin/vendors/new", icon: "plus", label: "Create vendor" },
          { href: "/admin/riders", icon: "rider", label: "Riders", permission: "riders:manage" },
        ],
      },
      {
        label: "Insights",
        items: [
          { href: "/admin/analytics", icon: "chart", label: "Analytics", permission: "analytics:read" },
        ],
      },
      {
        label: "System",
        items: [
          { href: "/admin/team", icon: "users", label: "Team access", permission: "admin_users:manage" },
          { href: "/admin/activity", icon: "activity", label: "Activity", permission: "audit_logs:read" },
          { href: "/admin/logs", icon: "file", label: "Logs", permission: "platform_logs:read" },
        ],
      },
    ],
    [homePath],
  );
  // Hiding restricted navigation keeps the workspace honest and uncluttered,
  // but the backend remains authoritative for access control.
  const visibleNavSections = adminNavSections.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.permission || hasAdminPermission(role, item.permission),
    ),
  })).filter((section) => section.items.length > 0);
  const initials = (
    session?.adminUser.full_name ??
      session?.adminUser.email ??
      session?.user.email ??
      "Admin"
  )
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AD";
  const shellClassName = [
    "admin-workspace-shell",
    isSidebarCollapsed ? "admin-workspace-shell-collapsed" : "",
    isMobileSidebarOpen ? "admin-workspace-shell-menu-open" : "",
  ].filter(Boolean).join(" ");
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  const navContent = (
    <>
      <div className="admin-sidebar-brand">
        <p className="eyebrow">The Local Man</p>
        <p className="admin-sidebar-title">{role === "admin" ? "Admin workspace" : "Agent workspace"}</p>
        <p>
          {role === "admin"
            ? "Vendor operations, content quality, and publish readiness."
            : "Vendor creation, editing, and content completeness for assigned operations."}
        </p>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin navigation">
        {visibleNavSections.map((section) => (
          <div className="admin-sidebar-nav-section" key={section.label}>
            <span className="admin-sidebar-nav-label">{section.label}</span>
            <div className="admin-sidebar-nav-items">
              {section.items.map((item) => {
                const isActive = isNavItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={isActive ? "admin-nav-link active" : "admin-nav-link"}
                    href={item.href}
                    title={item.label}
                    onClick={closeMobileSidebar}
                  >
                    <AdminIcon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-sidebar-session">
          <span className="admin-user-avatar" aria-hidden="true">{initials}</span>
          <span>
            <strong>{session?.adminUser.full_name ?? session?.adminUser.email ?? "Admin user"}</strong>
            <small>{getAdminRoleLabel(role)}</small>
          </span>
        </div>
        <button className="admin-logout-button" type="button" onClick={() => void signOut()}>
          <span>Log out</span>
          <AdminIcon name="arrow-right" />
        </button>
        <button
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="admin-sidebar-collapse"
          type="button"
          onClick={() => setIsSidebarCollapsed((current) => !current)}
        >
          <AdminIcon name="panel" />
        </button>
      </div>
    </>
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
    <main className={shellClassName}>
      <div className="admin-mobile-sidebar-backdrop" aria-hidden="true" onClick={closeMobileSidebar} />
      <aside className="admin-sidebar">
        <button
          aria-label="Close navigation"
          className="admin-mobile-sidebar-close"
          type="button"
          onClick={closeMobileSidebar}
        >
          <AdminIcon name="x" />
        </button>
        {navContent}
      </aside>

      <section className="admin-workspace-main">
        <header className="admin-topbar" aria-label="Admin top navigation">
          <button
            aria-label="Open navigation"
            className="admin-mobile-menu-button"
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <AdminIcon name="menu" />
          </button>
          <label className="admin-global-search">
            <span className="sr-only">Search admin workspace</span>
            <AdminIcon name="search" />
            <input
              autoComplete="off"
              name="admin-global-search"
              placeholder="Search vendors, dishes, phones, categories..."
              type="search"
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="admin-topbar-actions">
            <button
              aria-label="Open notifications"
              className="admin-notification-button"
              type="button"
            >
              <AdminIcon name="bell" />
              <span className="sr-only">No unread notifications</span>
            </button>
            <details className="admin-profile-menu">
              <summary aria-label="Open profile menu">
                <span className="admin-user-avatar" aria-hidden="true">{initials}</span>
                <span className="admin-profile-summary">
                  <strong>{getAdminRoleLabel(role)}</strong>
                  <small>{session?.adminUser.email ?? session?.user.email ?? "Session active"}</small>
                </span>
                <AdminIcon name="chevron-down" />
              </summary>
              <div className="admin-profile-menu-panel">
                <div>
                  <strong>{session?.adminUser.full_name ?? "Admin user"}</strong>
                  <span>{session?.adminUser.email ?? session?.user.email ?? "Session active"}</span>
                  <span>{getAdminRoleLabel(role)}</span>
                </div>
                <Link href="/admin/change-password">Change password</Link>
                <button type="button" onClick={() => void signOut()}>
                  Log out
                </button>
              </div>
            </details>
          </div>
        </header>
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

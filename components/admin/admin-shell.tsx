"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminSession } from "./admin-session-provider.tsx";

type AdminShellProps = {
  title: string;
  intro: string;
  children: ReactNode;
};

const adminNavItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/vendors", label: "Manage vendors" },
  { href: "/admin/vendors/new", label: "Create vendor" },
];

export function AdminShell({ title, intro, children }: AdminShellProps) {
  const pathname = usePathname();
  const { session, signOut } = useAdminSession();

  return (
    <main className="admin-workspace-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <p className="eyebrow">The Local Man</p>
          <h1>Admin workspace</h1>
          <p>Vendor operations, content quality, and publish readiness.</p>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Admin navigation">
          {adminNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/admin/vendors" && pathname?.startsWith("/admin/vendors/"));

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
            <strong>{session?.adminUser.role ?? "admin"}</strong>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

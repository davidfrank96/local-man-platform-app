"use client";

import Link from "next/link";
import type { AdminRole } from "../../types/index.ts";
import type {
  AdminVendorDashboardCounts,
  AdminVendorSummary,
} from "../../lib/admin/api-client.ts";
import { getAdminRoleLabel } from "../../lib/admin/rbac.ts";
import { AdminIcon, type AdminIconName } from "./admin-icons.tsx";

type AdminDashboardProps = {
  canManageAdminUsers: boolean;
  canReadAnalytics: boolean;
  canReadPlatformLogs: boolean;
  dashboardMetricCounts: AdminVendorDashboardCounts;
  incompleteVendors: AdminVendorSummary[];
  isLoading: boolean;
  loadedVendorSummary: string;
  role: AdminRole;
  selectedVendorId: string | null;
  status: string;
  statusTone: "neutral" | "success" | "error";
  totalVendorCount: number;
  vendorsLoadedCount: number;
  onRefreshVendors: () => void;
  onSelectVendor: (vendorId: string) => void;
};

type MetricCardProps = {
  description: string;
  icon: AdminIconName;
  label: string;
  tone: "green" | "blue" | "orange" | "purple" | "gold";
  value: number;
  progressLabel?: string;
  progressValue?: number;
};

type QuickAction = {
  description: string;
  href: string;
  icon: AdminIconName;
  label: string;
  tone: "green" | "blue" | "orange" | "purple" | "teal";
};

function formatVendorInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "V";
}

function buildVendorIssueLabels(vendor: AdminVendorSummary): string[] {
  const labels = ["Review", vendor.is_active ? "Active" : "Inactive"];

  if (vendor.hours_count < 7) {
    labels.push("Missing hours");
  }

  if (vendor.images_count < 1) {
    labels.push("Missing images");
  }

  if (vendor.featured_dishes_count < 1) {
    labels.push("Missing dishes");
  }

  return labels;
}

function DashboardMetricCard({
  description,
  icon,
  label,
  progressLabel,
  progressValue,
  tone,
  value,
}: MetricCardProps) {
  const clampedProgress = Math.max(0, Math.min(100, progressValue ?? 0));

  return (
    <article className={`admin-metric-panel admin-dashboard-metric admin-dashboard-metric-${tone}`}>
      <div className="admin-dashboard-card-icon">
        <AdminIcon name={icon} />
      </div>
      <div className="admin-dashboard-metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
      {progressLabel ? (
        <div className="admin-dashboard-progress" aria-label={progressLabel}>
          <span>{progressLabel}</span>
          <div>
            <i style={{ inlineSize: `${clampedProgress}%` }} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function DashboardActionCard({ action }: { action: QuickAction }) {
  return (
    <Link className={`admin-action-card admin-dashboard-action-card admin-dashboard-action-${action.tone}`} href={action.href}>
      <span className="admin-dashboard-card-icon">
        <AdminIcon name={action.icon} />
      </span>
      <span className="admin-dashboard-action-copy">
        <strong>{action.label}</strong>
        <span>{action.description}</span>
      </span>
      <AdminIcon className="admin-dashboard-arrow" name="arrow-right" />
    </Link>
  );
}

function VendorAttentionRow({
  isSelected,
  vendor,
  onSelectVendor,
}: {
  isSelected: boolean;
  vendor: AdminVendorSummary;
  onSelectVendor: (vendorId: string) => void;
}) {
  const labels = buildVendorIssueLabels(vendor);

  return (
    <li>
      <button
        className={isSelected ? "admin-attention-row selected" : "admin-attention-row"}
        type="button"
        onClick={() => onSelectVendor(vendor.id)}
      >
        <span className="admin-attention-avatar">{formatVendorInitials(vendor.name)}</span>
        <span className="admin-attention-copy">
          <strong>{vendor.name}</strong>
          <small>{vendor.area ?? "Area missing"}</small>
        </span>
        <span className="admin-attention-badges" aria-label={`${vendor.name} status`}>
          {labels.map((label) => (
            <span
              className={`admin-attention-badge admin-attention-badge-${label.toLowerCase().replaceAll(" ", "-")}`}
              key={label}
            >
              {label}
            </span>
          ))}
        </span>
      </button>
    </li>
  );
}

export function AdminDashboard({
  canManageAdminUsers,
  canReadAnalytics,
  canReadPlatformLogs,
  dashboardMetricCounts,
  incompleteVendors,
  isLoading,
  loadedVendorSummary,
  role,
  selectedVendorId,
  status,
  statusTone,
  totalVendorCount,
  vendorsLoadedCount,
  onRefreshVendors,
  onSelectVendor,
}: AdminDashboardProps) {
  const activeProgress = totalVendorCount > 0
    ? (dashboardMetricCounts.active_vendor_count / totalVendorCount) * 100
    : 0;
  const followUpPreview = incompleteVendors.slice(0, 5);
  const actionCards: QuickAction[] = [
    {
      description: "Add a new vendor record and acknowledge any missing data intentionally.",
      href: "/admin/vendors/new",
      icon: "plus",
      label: "Create vendor",
      tone: "green",
    },
    {
      description: "Search the registry, inspect completeness, and open edit workspaces.",
      href: "/admin/vendors",
      icon: "storefront",
      label: "Manage vendors",
      tone: "blue",
    },
    {
      description: "Focus on vendors still missing hours, images, or featured dishes.",
      href: "/admin/vendors",
      icon: "clipboard",
      label: "Review incomplete vendors",
      tone: "orange",
    },
  ];

  if (canReadAnalytics) {
    actionCards.push({
      description: "Inspect usage signals, drop-off, and vendor engagement.",
      href: "/admin/analytics",
      icon: "chart",
      label: "Review analytics",
      tone: "purple",
    });
  }

  if (canManageAdminUsers) {
    actionCards.push({
      description: "Create admin or agent accounts and keep roles explicit.",
      href: "/admin/team",
      icon: "users",
      label: "Manage team access",
      tone: "teal",
    });
  }

  return (
    <div className="admin-dashboard-shell">
      <section
        className={`admin-dashboard-status-card admin-dashboard-status-card-${statusTone}`}
        aria-live="polite"
      >
        <div className="admin-dashboard-status-icon">
          <AdminIcon name="shield" />
        </div>
        <div className="admin-dashboard-status-copy">
          <p className="eyebrow">System status</p>
          <h2>{statusTone === "error" ? "Action needed" : "All systems ready"}</h2>
        </div>
        <p className="admin-status-copy">{status}</p>
        <div className="admin-dashboard-status-actions">
          <button
            className="button-secondary"
            disabled={isLoading}
            type="button"
            onClick={onRefreshVendors}
          >
            <AdminIcon name="refresh" />
            <span>Refresh vendors</span>
          </button>
          {canReadPlatformLogs ? (
            <Link className="button-primary" href="/admin/logs">
              <AdminIcon name="file" />
              <span>View logs</span>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="admin-overview-grid" aria-label="Admin overview">
        <DashboardMetricCard
          description={loadedVendorSummary}
          icon="storefront"
          label="Total vendors"
          progressLabel={loadedVendorSummary}
          progressValue={totalVendorCount > 0 ? (vendorsLoadedCount / totalVendorCount) * 100 : 0}
          tone="green"
          value={totalVendorCount}
        />
        <DashboardMetricCard
          description="Available to users"
          icon="users"
          label="Active vendors"
          progressLabel={`${dashboardMetricCounts.active_vendor_count} active of ${totalVendorCount}`}
          progressValue={activeProgress}
          tone="blue"
          value={dashboardMetricCounts.active_vendor_count}
        />
        <DashboardMetricCard
          description="Need schedule completion"
          icon="activity"
          label="Missing hours"
          tone="orange"
          value={dashboardMetricCounts.missing_hours_count}
        />
        <DashboardMetricCard
          description="Need profile media"
          icon="image"
          label="Missing images"
          tone="purple"
          value={dashboardMetricCounts.missing_images_count}
        />
        <DashboardMetricCard
          description="Need menu highlights"
          icon="utensils"
          label="Missing dishes"
          tone="gold"
          value={dashboardMetricCounts.missing_dishes_count}
        />
      </section>

      <section className="admin-dashboard-primary-grid">
        <section className="admin-panel admin-dashboard-panel" aria-labelledby="admin-dashboard-actions">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Next actions</p>
              <h2 id="admin-dashboard-actions">Next actions</h2>
            </div>
            <Link className="admin-dashboard-panel-link" href="/admin/vendors">
              View all
            </Link>
          </div>
          <div className="admin-action-cards admin-dashboard-action-grid">
            {actionCards.map((action) => (
              <DashboardActionCard action={action} key={action.label} />
            ))}
          </div>
        </section>

        <section className="admin-panel admin-dashboard-panel" aria-labelledby="admin-dashboard-incomplete">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Incomplete vendors</p>
              <h2 id="admin-dashboard-incomplete">Needs follow-up</h2>
            </div>
            <div className="admin-dashboard-panel-actions">
              <span>{dashboardMetricCounts.needs_follow_up_count} vendors</span>
              <Link className="admin-dashboard-panel-link" href="/admin/vendors">
                View all
              </Link>
            </div>
          </div>
          {followUpPreview.length > 0 ? (
            <ul className="admin-attention-list">
              {followUpPreview.map((vendor) => (
                <VendorAttentionRow
                  isSelected={selectedVendorId === vendor.id}
                  key={vendor.id}
                  vendor={vendor}
                  onSelectVendor={onSelectVendor}
                />
              ))}
            </ul>
          ) : (
            <p className="empty-state">All loaded vendors have hours, images, and featured dishes.</p>
          )}
        </section>
      </section>

      <section className="admin-dashboard-lower-grid" aria-label="Dashboard support panels">
        <section className="admin-panel admin-dashboard-support-panel" aria-labelledby="admin-dashboard-role">
          <span className="admin-dashboard-card-icon">
            <AdminIcon name="shield" />
          </span>
          <div>
            <p className="eyebrow">Current role</p>
            <h2 id="admin-dashboard-role">{getAdminRoleLabel(role)}</h2>
            <p>
              {role === "admin"
                ? "Full system access with all operational permissions."
                : "Vendor creation and editing access. Admin-only modules remain hidden and blocked server-side."}
            </p>
          </div>
        </section>

        <section className="admin-panel admin-dashboard-support-panel" aria-labelledby="admin-dashboard-recent">
          <div className="admin-dashboard-panel-title-row">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h2 id="admin-dashboard-recent">Recent activity</h2>
            </div>
            <Link className="admin-dashboard-panel-link" href="/admin/activity">
              View all
            </Link>
          </div>
          <p className="empty-state">Recent activity appears here after audit events are loaded.</p>
        </section>

        <section className="admin-panel admin-dashboard-support-panel" aria-labelledby="admin-dashboard-links">
          <div className="admin-dashboard-panel-title-row">
            <div>
              <p className="eyebrow">Quick links</p>
              <h2 id="admin-dashboard-links">Quick links</h2>
            </div>
            <AdminIcon name="link" />
          </div>
          <div className="admin-dashboard-quick-links">
            <Link href="/admin/vendors">
              <AdminIcon name="image" />
              <span>Upload vendor images</span>
            </Link>
            {canReadPlatformLogs ? (
              <Link href="/admin/logs">
                <AdminIcon name="file" />
                <span>Open operational logs</span>
              </Link>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}

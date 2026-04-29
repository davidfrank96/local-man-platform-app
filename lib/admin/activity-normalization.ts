import type { AuditActionType } from "../../types/index.ts";

const analyticsEventAliases = new Map<string, string>([
  ["filters_applied", "filter_applied"],
  ["call_click", "call_clicked"],
  ["call_clicks", "call_clicked"],
  ["direction_clicked", "directions_clicked"],
  ["direction_click", "directions_clicked"],
  ["directions_click", "directions_clicked"],
  ["session_start", "session_started"],
]);

const auditActionVariants = new Map<AuditActionType, string[]>([
  ["CREATE_VENDOR", ["CREATE_VENDOR", "vendor.created"]],
  ["UPDATE_VENDOR", ["UPDATE_VENDOR", "vendor.updated"]],
  ["UPDATE_VENDOR_STATUS", ["UPDATE_VENDOR_STATUS", "vendor.status_updated"]],
  ["DELETE_VENDOR", ["DELETE_VENDOR", "vendor.deleted"]],
  ["UPDATE_VENDOR_HOURS", ["UPDATE_VENDOR_HOURS", "vendor.hours_replaced"]],
  ["CREATE_VENDOR_IMAGES", ["CREATE_VENDOR_IMAGES"]],
  ["UPLOAD_VENDOR_IMAGE", ["UPLOAD_VENDOR_IMAGE", "vendor.image_uploaded"]],
  ["DELETE_VENDOR_IMAGE", ["DELETE_VENDOR_IMAGE", "vendor.image_deleted"]],
  ["CREATE_VENDOR_DISHES", ["CREATE_VENDOR_DISHES", "vendor.dishes_created"]],
  ["DELETE_VENDOR_DISH", ["DELETE_VENDOR_DISH", "vendor.dish_deleted"]],
  ["CREATE_ADMIN_USER", ["CREATE_ADMIN_USER", "admin_user.created"]],
  ["UPDATE_ADMIN_USER", ["UPDATE_ADMIN_USER", "admin_user.updated"]],
  ["DELETE_ADMIN_USER", ["DELETE_ADMIN_USER", "admin_user.deleted"]],
  ["CHANGE_ADMIN_USER_ROLE", ["CHANGE_ADMIN_USER_ROLE", "admin_user.role_changed"]],
]);

const auditActionAliasLookup = new Map<string, AuditActionType>(
  [...auditActionVariants.entries()].flatMap(([canonicalAction, variants]) =>
    variants.map((variant) => [variant.toLowerCase(), canonicalAction] as const)
  ),
);

export function normalizeAnalyticsEventType(value: string | null | undefined): string {
  const normalized = typeof value === "string" ? value.toLowerCase().trim() : "";
  return analyticsEventAliases.get(normalized) ?? normalized;
}

export function getAuditActionFilterValues(action: AuditActionType): string[] {
  return auditActionVariants.get(action) ?? [action];
}

export function normalizeAuditAction(value: string | null | undefined): AuditActionType | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return auditActionAliasLookup.get(value.toLowerCase().trim()) ?? null;
}

export function vendorSlugToNameFallback(slug: string | null | undefined): string | null {
  if (typeof slug !== "string" || slug.trim().length === 0) {
    return null;
  }

  return slug
    .trim()
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

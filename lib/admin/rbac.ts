export const adminRoles = ["admin", "agent"] as const;

export type AdminRole = (typeof adminRoles)[number];

export const adminPermissions = [
  "analytics:read",
  "audit_logs:read",
  "admin_users:manage",
  "vendor:delete",
] as const;

export type AdminPermission = (typeof adminPermissions)[number];

export function isAdminRole(value: string): value is AdminRole {
  return adminRoles.includes(value as AdminRole);
}

export function getAdminRoleLabel(role: AdminRole): string {
  return role === "admin" ? "Admin" : "Agent";
}

export function hasAdminPermission(
  role: AdminRole,
  permission: AdminPermission,
): boolean {
  if (role === "admin") {
    return true;
  }

  switch (permission) {
    case "analytics:read":
    case "audit_logs:read":
    case "admin_users:manage":
    case "vendor:delete":
      return false;
  }
}

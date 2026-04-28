import type { AdminRole } from "../../types/index.ts";

export function getAdminHomePath(role: AdminRole): string {
  return role === "admin" ? "/admin/dashboard" : "/admin/agent";
}

export function sanitizeAdminNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin";
  }

  return value;
}

export function resolveAdminNextPath(role: AdminRole, value: string | null): string {
  const sanitized = sanitizeAdminNextPath(value);
  const homePath = getAdminHomePath(role);

  if (sanitized === "/admin") {
    return homePath;
  }

  if (role === "agent" && sanitized === "/admin/dashboard") {
    return homePath;
  }

  if (role === "admin" && sanitized === "/admin/agent") {
    return homePath;
  }

  return sanitized;
}

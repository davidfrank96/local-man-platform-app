import type { AdminRole } from "../../types/index.ts";

const agentRestrictedPaths = new Set([
  "/admin/dashboard",
  "/admin/analytics",
  "/admin/team",
]);

export function getAdminHomePath(role: AdminRole): string {
  return role === "admin" ? "/admin/dashboard" : "/admin/agent";
}

export function isAgentRestrictedAdminPath(pathname: string): boolean {
  return agentRestrictedPaths.has(pathname);
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

  if (role === "agent" && isAgentRestrictedAdminPath(sanitized)) {
    return homePath;
  }

  if (role === "admin" && sanitized === "/admin/agent") {
    return homePath;
  }

  return sanitized;
}

import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { logStructuredEvent } from "../observability.ts";

export type DatabaseConsistencySeverity = "critical" | "high" | "medium" | "low";

export type MigrationConsistencyStatus = {
  ok: boolean;
  severity: DatabaseConsistencySeverity | null;
  title: string | null;
  message: string | null;
};

type CachedMigrationConsistencyStatus = {
  expiresAt: number;
  status: MigrationConsistencyStatus;
};

const cacheTtlMs = 60_000;
let cachedStatus: CachedMigrationConsistencyStatus | null = null;
let inFlightCheck: Promise<MigrationConsistencyStatus> | null = null;

function shouldSkipRuntimeCheck(): boolean {
  const phase = process.env.NEXT_PHASE ?? "";
  return phase.includes("build");
}

function readRepoMigrationNames(): string[] {
  return readdirSync(resolve(process.cwd(), "supabase/migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

function buildStatus(
  severity: DatabaseConsistencySeverity,
  title: string,
  message: string,
): MigrationConsistencyStatus {
  return {
    ok: false,
    severity,
    title,
    message,
  };
}

async function fetchAppliedMigrationNames(): Promise<string[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase runtime env for migration consistency check.");
  }

  const url = new URL("/rest/v1/app_schema_migrations", supabaseUrl);
  url.searchParams.set("select", "name");
  url.searchParams.set("order", "name.asc");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    cache: "no-store",
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      `Unable to read app_schema_migrations (status ${response.status}).`,
    );
  }

  return payload
    .flatMap((row) => {
      if (!row || typeof row !== "object") {
        return [];
      }

      const value = (row as { name?: unknown }).name;
      return typeof value === "string" ? [value] : [];
    });
}

async function computeMigrationConsistencyStatus(): Promise<MigrationConsistencyStatus> {
  const repoMigrations = readRepoMigrationNames();
  const appliedMigrations = await fetchAppliedMigrationNames();
  const pendingMigrations = repoMigrations.filter((name) => !appliedMigrations.includes(name));

  if (pendingMigrations.length === 0) {
    return {
      ok: true,
      severity: null,
      title: null,
      message: null,
    };
  }

  const message = `Database schema is behind repo migrations (${pendingMigrations.length} pending). Run db:migrate and db:check before using analytics or RBAC-dependent admin features.`;
  logStructuredEvent("error", {
    type: "DB_MIGRATION_MISMATCH",
    pendingMigrations,
    message,
  });

  return buildStatus("critical", "Database mismatch", message);
}

export async function getAdminDatabaseConsistencyStatus(): Promise<MigrationConsistencyStatus> {
  if (shouldSkipRuntimeCheck()) {
    return {
      ok: true,
      severity: null,
      title: null,
      message: null,
    };
  }

  if (cachedStatus && cachedStatus.expiresAt > Date.now()) {
    return cachedStatus.status;
  }

  if (!inFlightCheck) {
    inFlightCheck = computeMigrationConsistencyStatus()
      .catch((error) => {
        const message =
          "Database consistency check failed. Run db:check to verify migrations, functions, and policies.";
        logStructuredEvent("error", {
          type: "DB_CONSISTENCY_CHECK_FAILED",
          message,
          detail: error instanceof Error ? error.message : "Unknown error",
        });
        return buildStatus("high", "Database check failed", message);
      })
      .finally(() => {
        inFlightCheck = null;
      });
  }

  const status = await inFlightCheck;
  cachedStatus = {
    expiresAt: Date.now() + cacheTtlMs,
    status,
  };
  return status;
}

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

for (const envFile of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), envFile);

  if (!existsSync(path)) continue;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key) {
      process.env[key] = value;
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: "DATABASE_URL is required for db:check.",
        missing: ["DATABASE_URL"],
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const repoMigrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

function runPsql(args) {
  const result = spawnSync("psql", [process.env.DATABASE_URL, ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          command: "psql",
          args,
          error: result.error.message,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  if ((result.status ?? 1) !== 0) {
    console.error(result.stderr?.trim() || "psql failed");
    process.exit(result.status ?? 1);
  }

  return result.stdout?.trim() ?? "";
}

function runScalar(sql) {
  return runPsql(["-tAc", sql]);
}

function runRows(sql) {
  const output = runPsql(["-tA", "-F", "\t", "-c", sql]);
  return output.length === 0 ? [] : output.split("\n").map((line) => line.split("\t"));
}

const migrationsTableExists = runScalar(
  "select to_regclass('public.app_schema_migrations') is not null;",
) === "t";

const appliedMigrations = migrationsTableExists
  ? runRows("select name from public.app_schema_migrations order by name asc;").map(([name]) => name)
  : [];

const pendingMigrations = repoMigrations.filter((name) => !appliedMigrations.includes(name));
const unknownAppliedMigrations = appliedMigrations.filter((name) => !repoMigrations.includes(name));

const requiredFunctions = [
  "current_admin_role",
  "is_admin",
  "is_admin_workspace_user",
];
const existingFunctions = runRows(`
  select proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('current_admin_role', 'is_admin', 'is_admin_workspace_user')
  order by proname asc;
`).map(([name]) => name);
const missingFunctions = requiredFunctions.filter((name) => !existingFunctions.includes(name));

const requiredPolicies = [
  { table: "admin_users", policy: "Admins can read admin users" },
  { table: "audit_logs", policy: "Admins can read audit logs" },
  { table: "user_events", policy: "Admins can read user events" },
];
const existingPolicies = new Set(
  runRows(`
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('admin_users', 'audit_logs', 'user_events');
  `).map(([table, policy]) => `${table}:${policy}`),
);
const missingPolicies = requiredPolicies
  .filter(({ table, policy }) => !existingPolicies.has(`${table}:${policy}`))
  .map(({ table, policy }) => ({ table, policy }));

function classifySeverity() {
  if (!migrationsTableExists || pendingMigrations.length > 0 || missingFunctions.length > 0 || missingPolicies.length > 0) {
    return "critical";
  }

  if (unknownAppliedMigrations.length > 0) {
    return "high";
  }

  return "low";
}

function buildMessage(severity) {
  switch (severity) {
    case "critical":
      return "Database schema or RLS state is out of sync. Run db:migrate and db:check before using analytics.";
    case "high":
      return "Database contains migrations that are not present in the repo. Verify environment alignment.";
    default:
      return null;
  }
}

const severity = classifySeverity();

const result = {
  ok:
    migrationsTableExists &&
    pendingMigrations.length === 0 &&
    missingFunctions.length === 0 &&
    missingPolicies.length === 0 &&
    unknownAppliedMigrations.length === 0,
  severity,
  message: buildMessage(severity),
  migrationsTableExists,
  repoMigrationCount: repoMigrations.length,
  appliedMigrationCount: appliedMigrations.length,
  pendingMigrations,
  unknownAppliedMigrations,
  missingFunctions,
  missingPolicies,
};

if (result.ok) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

console.error(JSON.stringify(result, null, 2));
process.exit(1);

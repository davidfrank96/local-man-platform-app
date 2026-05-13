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
  { table: "app_schema_migrations", policy: "No client access to schema migrations" },
  { table: "admin_users", policy: "Admins can read admin users" },
  { table: "audit_logs", policy: "Admins can read audit logs" },
  { table: "operational_events", policy: "Admins can read operational events" },
  { table: "user_events", policy: "Admins can read user events" },
];
const existingPolicies = new Set(
  runRows(`
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'app_schema_migrations',
        'admin_users',
        'audit_logs',
        'operational_events',
        'user_events'
      );
  `).map(([table, policy]) => `${table}:${policy}`),
);
const missingPolicies = requiredPolicies
  .filter(({ table, policy }) => !existingPolicies.has(`${table}:${policy}`))
  .map(({ table, policy }) => ({ table, policy }));

const requiredRlsTables = [
  "vendors",
  "vendor_hours",
  "vendor_categories",
  "vendor_category_map",
  "vendor_featured_dishes",
  "vendor_images",
  "ratings",
  "admin_users",
  "audit_logs",
  "user_events",
  "operational_events",
  "app_schema_migrations",
];
const missingRlsTables = runRows(`
  select c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in (${requiredRlsTables.map((table) => `'${table}'`).join(", ")})
    and c.relrowsecurity is not true
  order by c.relname asc;
`).map(([table]) => table);

const publicReadTables = [
  "vendors",
  "vendor_hours",
  "vendor_categories",
  "vendor_category_map",
  "vendor_featured_dishes",
  "vendor_images",
  "ratings",
];
const workspaceMutableTables = [
  "vendors",
  "vendor_hours",
  "vendor_categories",
  "vendor_category_map",
  "vendor_featured_dishes",
  "vendor_images",
  "ratings",
];
const serviceTables = [
  ...publicReadTables,
  "admin_users",
  "audit_logs",
  "user_events",
  "operational_events",
  "app_schema_migrations",
];

function sqlValues(rows) {
  return rows
    .map((row) => `(${row.map((value) => `'${String(value).replaceAll("'", "''")}'`).join(", ")})`)
    .join(",\n      ");
}

const requiredTablePrivileges = [
  ...publicReadTables.flatMap((table) => [
    ["anon", table, "SELECT"],
    ["authenticated", table, "SELECT"],
  ]),
  ...workspaceMutableTables.flatMap((table) => [
    ["authenticated", table, "INSERT"],
    ["authenticated", table, "UPDATE"],
    ["authenticated", table, "DELETE"],
  ]),
  ["authenticated", "admin_users", "SELECT"],
  ["authenticated", "admin_users", "INSERT"],
  ["authenticated", "admin_users", "UPDATE"],
  ["authenticated", "audit_logs", "SELECT"],
  ["authenticated", "audit_logs", "INSERT"],
  ["authenticated", "user_events", "SELECT"],
  ["authenticated", "operational_events", "SELECT"],
  ...serviceTables.flatMap((table) => [
    ["service_role", table, "SELECT"],
    ["service_role", table, "INSERT"],
    ["service_role", table, "UPDATE"],
    ["service_role", table, "DELETE"],
  ]),
];
const forbiddenTablePrivileges = [
  ...requiredRlsTables.flatMap((table) => [
    ["anon", table, "INSERT"],
    ["anon", table, "UPDATE"],
    ["anon", table, "DELETE"],
  ]),
  ...["admin_users", "audit_logs", "user_events", "operational_events", "app_schema_migrations"]
    .map((table) => ["anon", table, "SELECT"]),
  ...["user_events", "operational_events", "app_schema_migrations"].flatMap((table) => [
    ["authenticated", table, "INSERT"],
    ["authenticated", table, "UPDATE"],
    ["authenticated", table, "DELETE"],
  ]),
  ["authenticated", "admin_users", "DELETE"],
  ["authenticated", "audit_logs", "UPDATE"],
  ["authenticated", "audit_logs", "DELETE"],
  ["authenticated", "app_schema_migrations", "SELECT"],
];

const missingTableGrants = runRows(`
  with expected(role_name, table_name, privilege_name) as (
    values
      ${sqlValues(requiredTablePrivileges)}
  )
  select role_name, table_name, privilege_name
  from expected
  where not has_table_privilege(role_name, format('public.%I', table_name), privilege_name)
  order by role_name, table_name, privilege_name;
`).map(([role, table, privilege]) => ({ role, table, privilege }));

const excessiveTableGrants = runRows(`
  with forbidden(role_name, table_name, privilege_name) as (
    values
      ${sqlValues(forbiddenTablePrivileges)}
  )
  select role_name, table_name, privilege_name
  from forbidden
  where has_table_privilege(role_name, format('public.%I', table_name), privilege_name)
  order by role_name, table_name, privilege_name;
`).map(([role, table, privilege]) => ({ role, table, privilege }));

const requiredFunctionPrivileges = [
  ["anon", "public.is_admin()"],
  ["anon", "public.current_admin_role()"],
  ["anon", "public.is_admin_workspace_user()"],
  ["authenticated", "public.is_admin()"],
  ["authenticated", "public.current_admin_role()"],
  ["authenticated", "public.is_admin_workspace_user()"],
  ["service_role", "public.is_admin()"],
  ["service_role", "public.current_admin_role()"],
  ["service_role", "public.is_admin_workspace_user()"],
  ["service_role", "public.set_updated_at()"],
  ["service_role", "public.refresh_vendor_rating_summary(uuid)"],
  ["service_role", "public.sync_vendor_rating_summary()"],
  ["service_role", "public.get_admin_analytics_snapshot(timestamp with time zone, integer)"],
  ["service_role", "public.get_vendor_usage_scores(uuid[])"],
  ["service_role", "public.submit_public_vendor_rating(uuid, integer, text, text)"],
];
const forbiddenFunctionPrivileges = [
  "public.set_updated_at()",
  "public.refresh_vendor_rating_summary(uuid)",
  "public.sync_vendor_rating_summary()",
  "public.get_admin_analytics_snapshot(timestamp with time zone, integer)",
  "public.get_vendor_usage_scores(uuid[])",
  "public.submit_public_vendor_rating(uuid, integer, text, text)",
].flatMap((signature) => [
  ["anon", signature],
  ["authenticated", signature],
]);

const missingFunctionGrants = runRows(`
  with expected(role_name, function_signature) as (
    values
      ${sqlValues(requiredFunctionPrivileges)}
  )
  select role_name, function_signature
  from expected
  where not has_function_privilege(role_name, function_signature, 'EXECUTE')
  order by role_name, function_signature;
`).map(([role, signature]) => ({ role, signature }));

const excessiveFunctionGrants = runRows(`
  with forbidden(role_name, function_signature) as (
    values
      ${sqlValues(forbiddenFunctionPrivileges)}
  )
  select role_name, function_signature
  from forbidden
  where has_function_privilege(role_name, function_signature, 'EXECUTE')
  order by role_name, function_signature;
`).map(([role, signature]) => ({ role, signature }));

const excessiveOptionalFunctionGrants = runRows(`
  with optional_functions as (
    select p.oid, 'public.rls_auto_enable()' as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and p.pronargs = 0
  ),
  forbidden(role_name, function_oid, function_signature) as (
    select role_name, oid, function_signature
    from optional_functions
    cross join (values ('anon'), ('authenticated')) roles(role_name)
  )
  select role_name, function_signature
  from forbidden
  where has_function_privilege(role_name, function_oid, 'EXECUTE')
  order by role_name, function_signature;
`).map(([role, signature]) => ({ role, signature }));

const mutableSearchPathFunctions = runRows(`
  select p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('set_updated_at')
    and not exists (
      select 1
      from unnest(coalesce(p.proconfig, array[]::text[])) as settings(setting)
      where setting like 'search_path=%'
    )
  order by p.proname asc;
`).map(([name]) => name);

const excessiveDefaultPrivileges = runRows(`
  select
    d.defaclobjtype,
    d.defaclrole::regrole::text as owner_role,
    acl.grantee::regrole::text as role_name,
    acl.privilege_type
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral aclexplode(d.defaclacl) acl
  where n.nspname = 'public'
    and d.defaclrole::regrole::text = 'postgres'
    and acl.grantee::regrole::text in ('anon', 'authenticated', 'service_role', 'public')
    and d.defaclobjtype in ('r', 'S', 'f')
  order by d.defaclobjtype, owner_role, role_name, acl.privilege_type;
`).map(([objectType, ownerRole, role, privilege]) => ({ objectType, ownerRole, role, privilege }));

const unmanagedPlatformDefaultPrivileges = runRows(`
  select
    d.defaclobjtype,
    d.defaclrole::regrole::text as owner_role,
    acl.grantee::regrole::text as role_name,
    acl.privilege_type
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral aclexplode(d.defaclacl) acl
  where n.nspname = 'public'
    and d.defaclrole::regrole::text = 'supabase_admin'
    and acl.grantee::regrole::text in ('anon', 'authenticated', 'service_role', 'public')
    and d.defaclobjtype in ('r', 'S', 'f')
  order by d.defaclobjtype, owner_role, role_name, acl.privilege_type;
`).map(([objectType, ownerRole, role, privilege]) => ({ objectType, ownerRole, role, privilege }));

function classifySeverity() {
  if (
    !migrationsTableExists ||
    pendingMigrations.length > 0 ||
    missingFunctions.length > 0 ||
    missingPolicies.length > 0 ||
    missingRlsTables.length > 0 ||
    missingTableGrants.length > 0 ||
    excessiveTableGrants.length > 0 ||
    missingFunctionGrants.length > 0 ||
    excessiveFunctionGrants.length > 0 ||
    excessiveOptionalFunctionGrants.length > 0 ||
    mutableSearchPathFunctions.length > 0 ||
    excessiveDefaultPrivileges.length > 0
  ) {
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
    missingRlsTables.length === 0 &&
    missingTableGrants.length === 0 &&
    excessiveTableGrants.length === 0 &&
    missingFunctionGrants.length === 0 &&
    excessiveFunctionGrants.length === 0 &&
    excessiveOptionalFunctionGrants.length === 0 &&
    mutableSearchPathFunctions.length === 0 &&
    excessiveDefaultPrivileges.length === 0 &&
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
  missingRlsTables,
  missingTableGrants,
  excessiveTableGrants,
  missingFunctionGrants,
  excessiveFunctionGrants,
  excessiveOptionalFunctionGrants,
  mutableSearchPathFunctions,
  excessiveDefaultPrivileges,
  unmanagedPlatformDefaultPrivileges,
};

if (result.ok) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

console.error(JSON.stringify(result, null, 2));
process.exit(1);

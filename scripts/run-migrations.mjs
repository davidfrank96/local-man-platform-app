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

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        missing: ["DATABASE_URL"],
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

function runPsql(args, { capture = false } = {}) {
  const result = spawnSync("psql", [process.env.DATABASE_URL, ...args], {
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
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
    process.exit(result.status ?? 1);
  }

  return result.stdout?.trim() ?? "";
}

function runScalar(sql) {
  return runPsql(["-tAc", sql], { capture: true });
}

runPsql([
  "-v",
  "ON_ERROR_STOP=1",
  "-c",
  `create table if not exists public.app_schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  );`,
]);

function markApplied(name) {
  runPsql([
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `insert into public.app_schema_migrations (name)
     values ('${name.replace(/'/g, "''")}')
     on conflict (name) do nothing;`,
  ]);
}

function alreadyApplied(name) {
  return runScalar(
    `select exists (
       select 1
       from public.app_schema_migrations
       where name = '${name.replace(/'/g, "''")}'
     );`,
  ) === "t";
}

function shouldSkipAsAlreadyPresent(name) {
  if (name === "20260422180000_initial_schema.sql") {
    return (
      runScalar(
        "select to_regclass('public.vendors') is not null and to_regclass('public.vendor_images') is not null;",
      ) === "t"
    );
  }

  if (name === "20260423120000_vendor_image_storage.sql") {
    return (
      runScalar(
        `select exists (
           select 1
           from information_schema.columns
           where table_schema = 'public'
             and table_name = 'vendor_images'
             and column_name = 'storage_object_path'
         )`,
      ) === "t"
    );
  }

  return false;
}

for (const file of migrationFiles) {
  if (alreadyApplied(file)) {
    console.log(`[db:migrate] skipping already applied migration ${file}`);
    continue;
  }

  if (shouldSkipAsAlreadyPresent(file)) {
    console.log(`[db:migrate] marking existing schema migration as applied ${file}`);
    markApplied(file);
    continue;
  }

  const sqlFile = resolve(migrationsDir, file);
  console.log(`[db:migrate] applying ${file}`);

  const result = spawnSync("node", ["scripts/run-sql.mjs", sqlFile], {
    stdio: "inherit",
  });

  if (result.error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          command: "node scripts/run-sql.mjs",
          sqlFile,
          error: result.error.message,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }

  markApplied(file);
}

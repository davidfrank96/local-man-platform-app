import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  type DisposableTable,
  type MarketplaceResetTable,
  parseMarketplaceResetArgs,
  resolveMarketplaceResetEnvironment,
  runMarketplaceReset,
} from "../lib/admin/marketplace-reset.ts";

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

async function main() {
  const args = parseMarketplaceResetArgs(process.argv.slice(2));
  const environment = resolveMarketplaceResetEnvironment(process.env);
  const storage = createClient(
    environment.supabaseUrl,
    environment.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        message: args.mode === "dry-run"
          ? "Marketplace reset dry run. No data will be modified."
          : "Marketplace reset execute mode requested.",
        mode: args.mode,
        confirmed: args.confirmed,
        project: {
          supabaseUrl: environment.supabaseUrl,
          projectRef: environment.projectRef,
          database: "DATABASE_URL configured",
        },
      },
      null,
      2,
    ),
  );

  const report = await runMarketplaceReset({
    ...args,
    environment,
    database: createPsqlMarketplaceResetDatabase(environment.databaseUrl),
    storage,
  });

  console.log(JSON.stringify(report, null, 2));
}

function createPsqlMarketplaceResetDatabase(databaseUrl: string) {
  return {
    async countRows(table: MarketplaceResetTable) {
      const output = runScalarSql(
        databaseUrl,
        `select count(*)::int from public.${table};`,
        `count ${table}`,
      );

      return Number.parseInt(output, 10) || 0;
    },
    async deleteRows(table: DisposableTable) {
      const output = runScalarSql(
        databaseUrl,
        `with deleted as (delete from public.${table} returning 1) select count(*)::int from deleted;`,
        `delete ${table}`,
      );

      return Number.parseInt(output, 10) || 0;
    },
    async listVendorImageStoragePaths() {
      const output = runRowsSql(
        databaseUrl,
        `
          select storage_object_path
          from public.vendor_images
          where storage_object_path is not null
            and length(btrim(storage_object_path)) > 0
          order by storage_object_path asc;
        `,
        "list vendor image storage paths",
      );

      return output.map(([path]) => path).filter(Boolean);
    },
  };
}

function runScalarSql(
  databaseUrl: string,
  sql: string,
  context: string,
): string {
  return runPsql(databaseUrl, ["-tAc", sql], context).trim();
}

function runRowsSql(
  databaseUrl: string,
  sql: string,
  context: string,
): string[][] {
  const output = runPsql(databaseUrl, ["-tA", "-F", "\t", "-c", sql], context);

  return output.trim().length === 0
    ? []
    : output.trim().split("\n").map((line) => line.split("\t"));
}

function runPsql(
  databaseUrl: string,
  args: string[],
  context: string,
): string {
  const result = spawnSync("psql", [databaseUrl, ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }

  if ((result.status ?? 1) !== 0) {
    throw new Error(`${context}: ${result.stderr?.trim() || "psql failed"}`);
  }

  return result.stdout ?? "";
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});

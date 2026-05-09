import { existsSync, readFileSync } from "node:fs";
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

function parseRetentionDays(value) {
  if (typeof value !== "string") {
    return 30;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 365) {
    return 30;
  }

  return parsed;
}

if (!process.env.DATABASE_URL) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: "DATABASE_URL is required for operational event pruning.",
        missing: ["DATABASE_URL"],
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const retentionDays = parseRetentionDays(
  process.env.LOCALMAN_OPERATIONAL_EVENT_RETENTION_DAYS,
);

const sql = `
with deleted as (
  delete from public.operational_events
  where created_at < now() - interval '${retentionDays} days'
  returning id
)
select count(*)::text
from deleted;
`;

const result = spawnSync("psql", [process.env.DATABASE_URL, "-tAc", sql], {
  encoding: "utf8",
  stdio: "pipe",
});

if (result.error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        command: "psql",
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

const deletedCount = Number.parseInt(result.stdout?.trim() ?? "0", 10);

console.log(
  JSON.stringify(
    {
      ok: true,
      retentionDays,
      deletedCount: Number.isFinite(deletedCount) ? deletedCount : 0,
    },
    null,
    2,
  ),
);

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const [, , sqlFile] = process.argv;

if (!sqlFile) {
  console.error("Usage: node scripts/run-sql.mjs <sql-file>");
  process.exit(1);
}

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
        sqlFile,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const result = spawnSync(
  "psql",
  [process.env.DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-f", sqlFile],
  {
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        command: "psql",
        sqlFile,
        error: result.error.message,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

process.exit(result.status ?? 1);

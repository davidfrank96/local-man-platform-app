import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const requireDatabaseUrl = process.argv.includes("--db");
const envFiles = [".env.local", ".env"];
const loadedFiles = [];

for (const envFile of envFiles) {
  const path = resolve(process.cwd(), envFile);

  if (!existsSync(path)) continue;

  loadedFiles.push(envFile);

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

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

if (requireDatabaseUrl) {
  required.push("DATABASE_URL");
}

const missing = required.filter((key) => !process.env[key]);

if (!loadedFiles.includes(".env.local")) {
  missing.unshift(".env.local file");
}

if (missing.length > 0) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        missing,
        loadedFiles,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      loadedFiles,
      checked: required,
      databaseUrlRequired: requireDatabaseUrl,
    },
    null,
    2,
  ),
);

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ratingPrivacyMigrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260530090000_restrict_rating_anonymous_hash_select.sql",
);
const dbConsistencyScriptPath = resolve(
  process.cwd(),
  "scripts/check-db-consistency.mjs",
);

test("ratings privacy migration removes public anonymous hash reads only", () => {
  const migration = readFileSync(ratingPrivacyMigrationPath, "utf8");

  assert.match(
    migration,
    /revoke select on table public\.ratings from anon, authenticated;/,
  );
  assert.match(
    migration,
    /grant select \(\s+id,\s+vendor_id,\s+score,\s+comment,\s+source_type,\s+created_at\s+\) on table public\.ratings to anon, authenticated;/,
  );
  assert.match(
    migration,
    /grant select on table public\.ratings to service_role;/,
  );
  assert.doesNotMatch(
    migration,
    /grant select \([^)]*anonymous_client_hash[^)]*\) on table public\.ratings to anon/i,
  );
  assert.doesNotMatch(
    migration,
    /grant select \([^)]*anonymous_client_hash[^)]*\) on table public\.ratings to authenticated/i,
  );
  assert.doesNotMatch(migration, /drop policy|create policy|alter table public\.ratings/i);
});

test("database consistency check guards ratings anonymous hash column privacy", () => {
  const script = readFileSync(dbConsistencyScriptPath, "utf8");

  assert.match(script, /publicRatingsReadColumns/);
  assert.match(script, /has_column_privilege/);
  assert.match(
    script,
    /\["anon", "ratings", "anonymous_client_hash", "SELECT"\]/,
  );
  assert.match(
    script,
    /\["authenticated", "ratings", "anonymous_client_hash", "SELECT"\]/,
  );
  assert.match(script, /missingColumnGrants/);
  assert.match(script, /excessiveColumnGrants/);
});

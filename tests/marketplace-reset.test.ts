import assert from "node:assert/strict";
import test from "node:test";

import {
  DISPOSABLE_TABLES,
  MARKETPLACE_RESET_DELETE_ORDER,
  type MarketplaceResetDatabase,
  type MarketplaceResetStorageClient,
  parseMarketplaceResetArgs,
  resolveMarketplaceResetEnvironment,
  runMarketplaceReset,
} from "../lib/admin/marketplace-reset.ts";

function createFakeResetHarness() {
  const counts = new Map<string, number>([
    ...DISPOSABLE_TABLES.map((table) => [table, 2] as const),
    ["admin_users", 1],
    ["vendor_categories", 10],
    ["rating_signal_options", 17],
    ["app_schema_migrations", 30],
  ]);
  const deletes: string[] = [];
  const storageRemovals: string[][] = [];
  const storageLists: Record<string, Array<{
    id?: string | null;
    name: string;
    metadata?: { size?: number } | null;
  }>> = {
    "": [
      { id: "object-root", name: "root.webp", metadata: { size: 120 } },
      { id: null, name: "vendor-a", metadata: null },
    ],
    "vendor-a": [
      { id: "object-nested", name: "cover.webp", metadata: { size: 240 } },
    ],
  };

  const database: MarketplaceResetDatabase = {
    async countRows(table) {
      return counts.get(table) ?? 0;
    },
    async deleteRows(table) {
      deletes.push(table);
      const deleted = counts.get(table) ?? 0;
      counts.set(table, 0);

      return deleted;
    },
    async listVendorImageStoragePaths() {
      return ["vendor-a/cover.webp", "db-only.webp"];
    },
  };

  const storage: MarketplaceResetStorageClient = {
    storage: {
      from() {
        return {
          list(path = "") {
            return Promise.resolve({
              data: storageLists[path] ?? [],
              error: null,
            });
          },
          remove(paths: string[]) {
            storageRemovals.push(paths);
            return Promise.resolve({
              data: paths.map((name) => ({ name })),
              error: null,
            });
          },
        };
      },
    },
  };

  return {
    database,
    storage,
    deletes,
    storageRemovals,
  };
}

const environment = {
  supabaseUrl: "https://localman-test.supabase.co",
  serviceRoleKey: "service-role",
  databaseUrl: "postgres://example",
  projectRef: "localman-test",
};

test("marketplace reset defaults to dry run and requires execute confirmation", () => {
  assert.deepEqual(parseMarketplaceResetArgs([]), {
    mode: "dry-run",
    confirmed: false,
  });
  assert.deepEqual(parseMarketplaceResetArgs(["--dry-run"]), {
    mode: "dry-run",
    confirmed: false,
  });
  assert.throws(
    () => parseMarketplaceResetArgs(["--execute"]),
    /--confirm-marketplace-reset/,
  );
  assert.deepEqual(
    parseMarketplaceResetArgs(["--execute", "--confirm-marketplace-reset"]),
    {
      mode: "execute",
      confirmed: true,
    },
  );
});

test("marketplace reset environment reports the Supabase project ref", () => {
  assert.deepEqual(
    resolveMarketplaceResetEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: "https://abcd1234.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      DATABASE_URL: "postgres://example",
    }),
    {
      supabaseUrl: "https://abcd1234.supabase.co",
      serviceRoleKey: "service-role",
      databaseUrl: "postgres://example",
      projectRef: "abcd1234",
    },
  );
});

test("marketplace reset dry run reports candidates without deleting data", async () => {
  const fake = createFakeResetHarness();

  const report = await runMarketplaceReset({
    mode: "dry-run",
    confirmed: false,
    environment,
    database: fake.database,
    storage: fake.storage,
  });

  assert.equal(report.mode, "dry-run");
  assert.deepEqual(fake.deletes, []);
  assert.deepEqual(fake.storageRemovals, []);
  assert.deepEqual(report.storageDeletionCandidates, [
    "db-only.webp",
    "root.webp",
    "vendor-a/cover.webp",
  ]);
  assert.equal(report.beforeCounts.vendors, 2);
  assert.equal(report.afterCounts.vendors, 2);
});

test("marketplace reset execute deletes in safe order and batches storage removals", async () => {
  const fake = createFakeResetHarness();

  const report = await runMarketplaceReset({
    mode: "execute",
    confirmed: true,
    environment,
    database: fake.database,
    storage: fake.storage,
    storageBatchSize: 2,
  });

  assert.deepEqual(fake.deletes, [...MARKETPLACE_RESET_DELETE_ORDER]);
  assert.deepEqual(fake.storageRemovals, [
    ["db-only.webp", "root.webp"],
    ["vendor-a/cover.webp"],
  ]);
  assert.equal(report.afterCounts.vendors, 0);
  assert.equal(report.afterCounts.riders, 0);
  assert.equal(report.afterCounts.vendor_categories, 10);
  assert.equal(report.verification.disposableTablesZero, true);
  assert.equal(report.verification.retainedInfrastructurePresent, true);
});

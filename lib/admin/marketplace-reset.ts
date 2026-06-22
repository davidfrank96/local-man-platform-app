export const MARKETPLACE_RESET_STORAGE_BUCKET = "vendor-images";

export const DISPOSABLE_TABLES = [
  "rating_signal_selections",
  "rider_contact_intents",
  "rider_unavailable_reports",
  "user_events",
  "operational_events",
  "vendor_images",
  "vendor_featured_dishes",
  "vendor_hours",
  "vendor_category_map",
  "ratings",
  "vendors",
  "riders",
] as const;

export const RETAINED_INFRASTRUCTURE_TABLES = [
  "admin_users",
  "vendor_categories",
  "rating_signal_options",
  "app_schema_migrations",
] as const;

export const MARKETPLACE_RESET_DELETE_ORDER = [
  "rating_signal_selections",
  "rider_contact_intents",
  "rider_unavailable_reports",
  "user_events",
  "operational_events",
  "vendor_images",
  "vendor_featured_dishes",
  "vendor_hours",
  "vendor_category_map",
  "ratings",
  "vendors",
  "riders",
] as const;

export type DisposableTable = (typeof DISPOSABLE_TABLES)[number];
export type RetainedInfrastructureTable =
  (typeof RETAINED_INFRASTRUCTURE_TABLES)[number];
export type MarketplaceResetTable =
  DisposableTable | RetainedInfrastructureTable;

export type MarketplaceResetMode = "dry-run" | "execute";

export type MarketplaceResetArgs = {
  mode: MarketplaceResetMode;
  confirmed: boolean;
};

export type MarketplaceResetEnvironment = {
  supabaseUrl: string;
  serviceRoleKey: string;
  databaseUrl: string;
  projectRef: string;
};

export type MarketplaceResetOptions = {
  mode: MarketplaceResetMode;
  confirmed: boolean;
  environment: MarketplaceResetEnvironment;
  database: MarketplaceResetDatabase;
  storage: MarketplaceResetStorageClient;
  storageBatchSize?: number;
};

export type MarketplaceResetReport = {
  ok: true;
  mode: MarketplaceResetMode;
  project: {
    supabaseUrl: string;
    projectRef: string;
  };
  beforeCounts: Record<MarketplaceResetTable, number>;
  storageDeletionCandidates: string[];
  plannedDeletes: DisposableTable[];
  deletedCounts: Partial<Record<DisposableTable, number>>;
  storageDeleteResult: {
    attempted: number;
    deleted: number;
    failures: Array<{ batch: string[]; message: string }>;
  };
  afterCounts: Record<MarketplaceResetTable, number>;
  verification: {
    disposableTablesZero: boolean;
    retainedInfrastructurePresent: boolean;
    disposableTableFailures: Array<{ table: DisposableTable; count: number }>;
    retainedTableFailures: Array<{
      table: RetainedInfrastructureTable;
      count: number;
    }>;
  };
};

type StorageListItem = {
  id?: string | null;
  name: string;
  metadata?: { size?: number | null } | null;
};

type StorageBucketClient = {
  list(
    path?: string,
    options?: { limit?: number; offset?: number },
  ): PromiseLike<{
    data: StorageListItem[] | null;
    error: MarketplaceResetError | null;
  }>;
  remove(
    paths: string[],
  ): PromiseLike<{
    data: unknown[] | null;
    error: MarketplaceResetError | null;
  }>;
};

export type MarketplaceResetError = {
  message: string;
};

export type MarketplaceResetDatabase = {
  countRows(table: MarketplaceResetTable): Promise<number>;
  deleteRows(table: DisposableTable): Promise<number>;
  listVendorImageStoragePaths(): Promise<string[]>;
};

export type MarketplaceResetStorageClient = {
  storage: {
    from(bucket: string): StorageBucketClient;
  };
};

const CONFIRM_FLAG = "--confirm-marketplace-reset";
const DRY_RUN_FLAG = "--dry-run";
const EXECUTE_FLAG = "--execute";

export function parseMarketplaceResetArgs(args: string[]): MarketplaceResetArgs {
  const dryRun = args.includes(DRY_RUN_FLAG);
  const execute = args.includes(EXECUTE_FLAG);
  const confirmed = args.includes(CONFIRM_FLAG);

  if (dryRun && execute) {
    throw new Error("Use either --dry-run or --execute, not both.");
  }

  if (execute && !confirmed) {
    throw new Error(
      "Refusing execute mode without --confirm-marketplace-reset.",
    );
  }

  return {
    mode: execute ? "execute" : "dry-run",
    confirmed,
  };
}

export function resolveMarketplaceResetEnvironment(
  env: Record<string, string | undefined>,
): MarketplaceResetEnvironment {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const databaseUrl = env.DATABASE_URL?.trim() ?? "";
  const missing = [
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    !databaseUrl ? "DATABASE_URL" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`,
    );
  }

  const parsedUrl = new URL(supabaseUrl);
  const projectRef = parseSupabaseProjectRef(parsedUrl);

  return {
    supabaseUrl,
    serviceRoleKey,
    databaseUrl,
    projectRef,
  };
}

export function parseSupabaseProjectRef(url: URL): string {
  const hostname = url.hostname.toLowerCase();
  const supabaseHostSuffix = ".supabase.co";

  if (hostname.endsWith(supabaseHostSuffix)) {
    return hostname.slice(0, -supabaseHostSuffix.length) || "unknown";
  }

  return hostname;
}

export async function runMarketplaceReset(
  options: MarketplaceResetOptions,
): Promise<MarketplaceResetReport> {
  if (options.mode === "execute" && !options.confirmed) {
    throw new Error(
      "Refusing execute mode without --confirm-marketplace-reset.",
    );
  }

  const storageBatchSize = options.storageBatchSize ?? 100;
  const beforeCounts = await countMarketplaceTables(options.database);
  const storageDeletionCandidates = await listMarketplaceStorageCandidates(
    options.database,
    options.storage,
  );
  const deletedCounts: Partial<Record<DisposableTable, number>> = {};
  const storageDeleteResult: MarketplaceResetReport["storageDeleteResult"] = {
    attempted: options.mode === "execute" ? storageDeletionCandidates.length : 0,
    deleted: 0,
    failures: [],
  };

  if (options.mode === "execute") {
    for (const table of MARKETPLACE_RESET_DELETE_ORDER) {
      deletedCounts[table] = await options.database.deleteRows(table);
    }

    const result = await deleteStorageObjects(
      options.storage,
      storageDeletionCandidates,
      storageBatchSize,
    );

    storageDeleteResult.deleted = result.deleted;
    storageDeleteResult.failures = result.failures;

    if (storageDeleteResult.failures.length > 0) {
      throw new Error(
        `Storage deletion failed for ${storageDeleteResult.failures.length} batch(es).`,
      );
    }
  }

  const afterCounts = options.mode === "execute"
    ? await countMarketplaceTables(options.database)
    : beforeCounts;
  const verification = verifyMarketplaceReset(afterCounts);

  if (options.mode === "execute") {
    const problems = [
      ...verification.disposableTableFailures.map((failure) =>
        `${failure.table} has ${failure.count} remaining row(s)`
      ),
      ...verification.retainedTableFailures.map((failure) =>
        `${failure.table} has ${failure.count} retained row(s)`
      ),
    ];

    if (problems.length > 0) {
      throw new Error(`Marketplace reset verification failed: ${problems.join("; ")}`);
    }
  }

  return {
    ok: true,
    mode: options.mode,
    project: {
      supabaseUrl: options.environment.supabaseUrl,
      projectRef: options.environment.projectRef,
    },
    beforeCounts,
    storageDeletionCandidates,
    plannedDeletes: [...MARKETPLACE_RESET_DELETE_ORDER],
    deletedCounts,
    storageDeleteResult,
    afterCounts,
    verification,
  };
}

export async function countMarketplaceTables(
  database: MarketplaceResetDatabase,
): Promise<Record<MarketplaceResetTable, number>> {
  const counts = {} as Record<MarketplaceResetTable, number>;

  for (const table of [
    ...DISPOSABLE_TABLES,
    ...RETAINED_INFRASTRUCTURE_TABLES,
  ]) {
    counts[table] = await database.countRows(table);
  }

  return counts;
}

export async function listMarketplaceStorageCandidates(
  database: MarketplaceResetDatabase,
  storage: MarketplaceResetStorageClient,
): Promise<string[]> {
  const [databasePaths, bucketPaths] = await Promise.all([
    database.listVendorImageStoragePaths(),
    listStorageObjectPaths(storage, MARKETPLACE_RESET_STORAGE_BUCKET),
  ]);

  return uniqueSortedPaths([...databasePaths, ...bucketPaths]);
}

async function listStorageObjectPaths(
  client: MarketplaceResetStorageClient,
  bucket: string,
  prefix = "",
): Promise<string[]> {
  const storage = client.storage.from(bucket);
  const paths: string[] = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await storage.list(prefix, { limit, offset });

    if (error) {
      throw new Error(
        `List storage objects in ${bucket}/${prefix}: ${error.message}`,
      );
    }

    const items = data ?? [];

    for (const item of items) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;

      if (isStorageFolder(item)) {
        paths.push(...await listStorageObjectPaths(client, bucket, itemPath));
      } else {
        paths.push(itemPath);
      }
    }

    if (items.length < limit) {
      break;
    }

    offset += limit;
  }

  return uniqueSortedPaths(paths);
}

function isStorageFolder(item: StorageListItem): boolean {
  return !item.id && !item.metadata;
}

async function deleteStorageObjects(
  client: MarketplaceResetStorageClient,
  paths: string[],
  batchSize: number,
): Promise<{ deleted: number; failures: Array<{ batch: string[]; message: string }> }> {
  const storage = client.storage.from(MARKETPLACE_RESET_STORAGE_BUCKET);
  let deleted = 0;
  const failures: Array<{ batch: string[]; message: string }> = [];

  for (let index = 0; index < paths.length; index += batchSize) {
    const batch = paths.slice(index, index + batchSize);
    const { data, error } = await storage.remove(batch);

    if (error) {
      failures.push({ batch, message: error.message });
      continue;
    }

    deleted += Array.isArray(data) ? data.length : batch.length;
  }

  return { deleted, failures };
}

export function verifyMarketplaceReset(
  counts: Record<MarketplaceResetTable, number>,
): MarketplaceResetReport["verification"] {
  const disposableTableFailures = DISPOSABLE_TABLES
    .map((table) => ({ table, count: counts[table] ?? 0 }))
    .filter(({ count }) => count !== 0);
  const retainedTableFailures = RETAINED_INFRASTRUCTURE_TABLES
    .map((table) => ({ table, count: counts[table] ?? 0 }))
    .filter(({ count }) => count <= 0);

  return {
    disposableTablesZero: disposableTableFailures.length === 0,
    retainedInfrastructurePresent: retainedTableFailures.length === 0,
    disposableTableFailures,
    retainedTableFailures,
  };
}

function uniqueSortedPaths(paths: string[]): string[] {
  return [...new Set(paths.map((path) => path.trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right),
  );
}

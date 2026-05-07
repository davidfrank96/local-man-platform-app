import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import {
  matchesPlaywrightQaAdminVendorName,
  matchesPlaywrightTestEmail,
  PLAYWRIGHT_VENDOR_NAME_QUERY_PATTERNS,
} from "../lib/testing/playwright-artifacts.ts";

const dryRun = process.argv.includes("--dry-run");

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        missing: [
          !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
          !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
        ].filter(Boolean),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

function requireSharedEnvironmentCleanupAcknowledgement() {
  if (dryRun) {
    return;
  }

  const hostname = new URL(supabaseUrl).hostname.toLowerCase();
  const isLocalHost = hostname === "localhost" || hostname.endsWith(".local");
  const allowSharedCleanup =
    process.env.LOCALMAN_ALLOW_SHARED_ENV_TEST_CLEANUP === "1"
    || process.env.CI === "true";

  if (!isLocalHost && !allowSharedCleanup) {
    throw new Error(
      "Refusing shared-environment cleanup without LOCALMAN_ALLOW_SHARED_ENV_TEST_CLEANUP=1 or CI=true.",
    );
  }
}

requireSharedEnvironmentCleanupAcknowledgement();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

type QueryResult<T> = {
  data: T | null;
  error: { message: string } | null;
  count?: number | null;
};

async function requireResult<T>(
  promise: PromiseLike<QueryResult<T>>,
  context: string,
) {
  const { data, error, count } = await promise;

  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }

  return { data, count };
}

async function listCandidateVendors() {
  const rows: Array<{
    id: string;
    name: string;
    slug: string;
    created_at: string;
    is_active: boolean;
    matched_pattern: string;
  }> = [];

  for (const pattern of PLAYWRIGHT_VENDOR_NAME_QUERY_PATTERNS) {
    const { data } = await requireResult(
      supabase
        .from("vendors")
        .select("id,name,slug,created_at,is_active")
        .ilike("name", pattern),
      `list vendors for pattern ${pattern}`,
    );

    for (const row of data ?? []) {
      if (!matchesPlaywrightQaAdminVendorName(row.name)) {
        continue;
      }

      rows.push({
        ...row,
        matched_pattern: `name:${pattern}`,
      });
    }
  }

  return uniqueById(rows);
}

async function listCandidateUsers() {
  const matches: Array<{
    id: string;
    email: string | null;
    created_at: string | null;
  }> = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(`list auth users page ${page}: ${error.message}`);
    }

    const users = data?.users ?? [];

    for (const user of users) {
      if (!matchesPlaywrightTestEmail(user.email ?? "")) continue;

      matches.push({
        id: user.id,
        email: user.email ?? null,
        created_at: user.created_at ?? null,
      });
    }

    if (users.length < 1000) break;
    page += 1;
  }

  return matches;
}

async function listLinkedVendorImagePaths(vendorIds: string[]) {
  if (vendorIds.length === 0) return [];

  const { data } = await requireResult(
    supabase
      .from("vendor_images")
      .select("storage_object_path")
      .in("vendor_id", vendorIds)
      .not("storage_object_path", "is", null),
    "list linked vendor image paths",
  );

  const storagePaths = (data ?? []).flatMap((row) =>
    typeof row.storage_object_path === "string"
    && row.storage_object_path.trim().length > 0
      ? [row.storage_object_path]
      : [],
  );

  return [...new Set(storagePaths)];
}

async function countRows(
  queryBuilder: PromiseLike<QueryResult<unknown>>,
  context: string,
) {
  const { count } = await requireResult(queryBuilder, context);
  return count ?? 0;
}

async function main() {
  const vendors = await listCandidateVendors();
  const vendorIds = vendors.map((vendor) => vendor.id);
  const vendorSlugs = vendors.map((vendor) => vendor.slug).filter(Boolean);
  const users = await listCandidateUsers();
  const userIds = users.map((user) => user.id);
  const storagePaths = await listLinkedVendorImagePaths(vendorIds);

  const summary = {
    vendors,
    users,
    storagePaths,
    dependencyCounts: {
      vendor_hours: vendorIds.length
        ? await countRows(
          supabase.from("vendor_hours").select("id", { head: true, count: "exact" }).in("vendor_id", vendorIds),
          "count vendor_hours",
        )
        : 0,
      vendor_category_map: vendorIds.length
        ? await countRows(
          supabase.from("vendor_category_map").select("id", { head: true, count: "exact" }).in("vendor_id", vendorIds),
          "count vendor_category_map",
        )
        : 0,
      vendor_featured_dishes: vendorIds.length
        ? await countRows(
          supabase.from("vendor_featured_dishes").select("id", { head: true, count: "exact" }).in("vendor_id", vendorIds),
          "count vendor_featured_dishes",
        )
        : 0,
      vendor_images: vendorIds.length
        ? await countRows(
          supabase.from("vendor_images").select("id", { head: true, count: "exact" }).in("vendor_id", vendorIds),
          "count vendor_images",
        )
        : 0,
      ratings: vendorIds.length
        ? await countRows(
          supabase.from("ratings").select("id", { head: true, count: "exact" }).in("vendor_id", vendorIds),
          "count ratings",
        )
        : 0,
      user_events_by_vendor_id: vendorIds.length
        ? await countRows(
          supabase.from("user_events").select("id", { head: true, count: "exact" }).in("vendor_id", vendorIds),
          "count user_events by vendor_id",
        )
        : 0,
      user_events_by_vendor_slug: vendorSlugs.length
        ? await countRows(
          supabase.from("user_events").select("id", { head: true, count: "exact" }).is("vendor_id", null).in("vendor_slug", vendorSlugs),
          "count user_events by vendor_slug",
        )
        : 0,
      audit_logs_by_entity: vendorIds.length
        ? await countRows(
          supabase.from("audit_logs").select("id", { head: true, count: "exact" }).eq("entity_type", "vendor").in("entity_id", vendorIds),
          "count audit_logs by entity",
        )
        : 0,
      audit_logs_by_admin_user: userIds.length
        ? await countRows(
          supabase.from("audit_logs").select("id", { head: true, count: "exact" }).in("admin_user_id", userIds),
          "count audit_logs by admin user",
        )
        : 0,
    },
  };

  console.log(JSON.stringify({
    ok: true,
    dryRun,
    summary,
  }, null, 2));

  if (dryRun) {
    return;
  }

  let auditLogsDeletedByUser = 0;
  let auditLogsDeletedByVendor = 0;
  let userEventsDeletedByVendorId = 0;
  let userEventsDeletedByVendorSlug = 0;
  let authUsersDeleted = 0;
  let vendorsDeleted = 0;
  let storageObjectsDeleted = 0;

  if (userIds.length) {
    const { count } = await requireResult(
      supabase.from("audit_logs").delete({ count: "exact" }).in("admin_user_id", userIds),
      "delete audit logs by admin user",
    );
    auditLogsDeletedByUser = count ?? 0;

    for (const userId of userIds) {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        throw new Error(`delete auth user ${userId}: ${error.message}`);
      }

      authUsersDeleted += 1;
    }
  }

  if (vendorIds.length) {
    const auditResult = await requireResult(
      supabase.from("audit_logs").delete({ count: "exact" }).eq("entity_type", "vendor").in("entity_id", vendorIds),
      "delete audit logs by vendor entity",
    );
    auditLogsDeletedByVendor = auditResult.count ?? 0;

    const userEventsByVendorIdResult = await requireResult(
      supabase.from("user_events").delete({ count: "exact" }).in("vendor_id", vendorIds),
      "delete user events by vendor_id",
    );
    userEventsDeletedByVendorId = userEventsByVendorIdResult.count ?? 0;

    if (vendorSlugs.length) {
      const userEventsByVendorSlugResult = await requireResult(
        supabase.from("user_events").delete({ count: "exact" }).is("vendor_id", null).in("vendor_slug", vendorSlugs),
        "delete user events by vendor_slug",
      );
      userEventsDeletedByVendorSlug = userEventsByVendorSlugResult.count ?? 0;
    }

    const vendorDeleteResult = await requireResult(
      supabase.from("vendors").delete({ count: "exact" }).in("id", vendorIds),
      "delete candidate vendors",
    );
    vendorsDeleted = vendorDeleteResult.count ?? 0;
  }

  if (storagePaths.length) {
    const { data, error } = await supabase.storage.from("vendor-images").remove(storagePaths);

    if (error) {
      throw new Error(`delete storage objects: ${error.message}`);
    }

    storageObjectsDeleted = Array.isArray(data) ? data.length : storagePaths.length;
  }

  console.log(JSON.stringify({
    ok: true,
    dryRun: false,
    deleted: {
      auditLogsDeletedByUser,
      auditLogsDeletedByVendor,
      userEventsDeletedByVendorId,
      userEventsDeletedByVendorSlug,
      authUsersDeleted,
      vendorsDeleted,
      storageObjectsDeleted,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});

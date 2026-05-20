import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  adminRatingSignalSummarySchema,
  createVendorRatingRequestSchema,
  isRatingSignalAllowedForScore,
  negativeRatingSignalSlugs,
  neutralRatingSignalSlugs,
  positiveRatingSignalSlugs,
  publicRatingBadgeSchema,
  ratingSignalOptionSchema,
  ratingSignalOptions,
  ratingSignalSelectionInputSchema,
  ratingSignalSelectionSchema,
  ratingSignalSubmissionSchema,
  ratingSignalTypeSchema,
} from "../lib/validation/schemas.ts";
import { getRatingSignalPromptForScore } from "../lib/ratings/signals.ts";

const ratingSignalsMigrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260520090000_rating_signals_schema.sql",
);
const ratingSignalsRpcMigrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260520091000_rating_signals_rpc_persistence.sql",
);
const ratingSignalPublicBadgesMigrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260520092000_rating_signal_public_badges.sql",
);
const adminRatingSignalSummaryMigrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260520093000_admin_rating_signal_summary.sql",
);
const publicSignalOnlyRoutePath = resolve(
  process.cwd(),
  "app/api/vendors/[slug]/rating-signals/route.ts",
);

test("rating signal taxonomy contains the approved predefined options only", () => {
  assert.equal(positiveRatingSignalSlugs.length, 6);
  assert.equal(neutralRatingSignalSlugs.length, 4);
  assert.equal(negativeRatingSignalSlugs.length, 7);
  assert.equal(ratingSignalOptions.length, 17);

  assert.equal(ratingSignalTypeSchema.safeParse("positive").success, true);
  assert.equal(ratingSignalTypeSchema.safeParse("neutral").success, true);
  assert.equal(ratingSignalTypeSchema.safeParse("negative").success, true);
  assert.equal(ratingSignalTypeSchema.safeParse("internal").success, false);

  assert.equal(
    ratingSignalOptions.every((option) => option.is_public_positive === (option.signal_type === "positive")),
    true,
  );
  assert.deepEqual(
    ratingSignalOptions.filter((option) => option.signal_type === "positive").map((option) => [
      option.score_min,
      option.score_max,
    ]),
    positiveRatingSignalSlugs.map(() => [4, 5]),
  );
  assert.deepEqual(
    ratingSignalOptions.filter((option) => option.signal_type === "neutral").map((option) => [
      option.score_min,
      option.score_max,
    ]),
    neutralRatingSignalSlugs.map(() => [3, 3]),
  );
  assert.deepEqual(
    ratingSignalOptions.filter((option) => option.signal_type === "negative").map((option) => [
      option.score_min,
      option.score_max,
    ]),
    negativeRatingSignalSlugs.map(() => [1, 2]),
  );
});

test("rating signal prompt config matches score bands without free text", () => {
  const positivePrompt = getRatingSignalPromptForScore(5);
  const neutralPrompt = getRatingSignalPromptForScore(3);
  const negativePrompt = getRatingSignalPromptForScore(1);

  assert.equal(positivePrompt?.title, "What stood out?");
  assert.deepEqual(
    positivePrompt?.options.map((option) => option.label),
    [
      "Good food",
      "Clean vendor",
      "Fair price",
      "Fast service",
      "Friendly vendor",
      "Easy to find",
    ],
  );
  assert.equal(neutralPrompt?.title, "What could be better?");
  assert.deepEqual(
    neutralPrompt?.options.map((option) => option.label),
    ["Average food", "Slow service", "Price could be better", "Hard to find"],
  );
  assert.equal(negativePrompt?.title, "What went wrong?");
  assert.deepEqual(
    negativePrompt?.options.map((option) => option.label),
    [
      "Poor hygiene",
      "Food safety concern",
      "Rude service",
      "Price issue",
      "Vendor unavailable",
      "Wrong location",
      "Long wait",
    ],
  );
  assert.equal(getRatingSignalPromptForScore(0), null);
});

test("rating signal schemas validate catalog rows and raw selection rows", () => {
  assert.equal(
    ratingSignalOptionSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      slug: "good_food",
      label: "Good food",
      signal_type: "positive",
      score_min: 4,
      score_max: 5,
      is_public_positive: true,
      is_active: true,
      sort_order: 10,
      created_at: "2026-05-20T10:00:00.000Z",
    }).success,
    true,
  );
  assert.equal(
    ratingSignalOptionSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      slug: "custom_free_text",
      label: "Custom free text",
      signal_type: "negative",
      score_min: 1,
      score_max: 2,
      is_public_positive: false,
      is_active: true,
      sort_order: 999,
      created_at: "2026-05-20T10:00:00.000Z",
    }).success,
    false,
  );
  assert.equal(
    ratingSignalSelectionSchema.safeParse({
      id: "22222222-2222-4222-8222-222222222222",
      rating_id: "33333333-3333-4333-8333-333333333333",
      signal_option_id: "11111111-1111-4111-8111-111111111111",
      created_at: "2026-05-20T10:00:00.000Z",
    }).success,
    true,
  );
});

test("public rating badge schema allows only approved positive summaries", () => {
  assert.deepEqual(publicRatingBadgeSchema.parse({
    slug: "good_food",
    label: "Good food",
  }), {
    slug: "good_food",
    label: "Good food",
  });
  assert.equal(publicRatingBadgeSchema.safeParse({
    slug: "poor_hygiene",
    label: "Poor hygiene",
  }).success, false);
  assert.equal(publicRatingBadgeSchema.safeParse({
    slug: "average_food",
    label: "Average food",
  }).success, false);
  assert.equal(publicRatingBadgeSchema.safeParse({
    slug: "good_food",
    label: "Good food",
    count: 3,
  }).success, false);
});

test("admin rating signal summary schema accepts aggregate counts only", () => {
  assert.deepEqual(adminRatingSignalSummarySchema.parse({
    positive_signal_count: 5,
    neutral_signal_count: 2,
    negative_signal_count: 3,
    food_safety_concern_count: 1,
    poor_hygiene_count: 1,
    vendor_unavailable_count: 1,
    recent_signal_count: 4,
  }), {
    positive_signal_count: 5,
    neutral_signal_count: 2,
    negative_signal_count: 3,
    food_safety_concern_count: 1,
    poor_hygiene_count: 1,
    vendor_unavailable_count: 1,
    recent_signal_count: 4,
  });
  assert.equal(adminRatingSignalSummarySchema.safeParse({
    positive_signal_count: 1,
    neutral_signal_count: 0,
    negative_signal_count: 0,
    food_safety_concern_count: 0,
    poor_hygiene_count: 0,
    vendor_unavailable_count: 0,
    recent_signal_count: 1,
    anonymous_client_hash: "private",
  }).success, false);
});

test("rating signal selection input rejects unknown, duplicate, and excessive signals", () => {
  assert.equal(
    ratingSignalSelectionInputSchema.safeParse(["good_food", "fair_price"]).success,
    true,
  );
  assert.equal(ratingSignalSelectionInputSchema.safeParse(["unknown_signal"]).success, false);
  assert.equal(
    ratingSignalSelectionInputSchema.safeParse(["good_food", "good_food"]).success,
    false,
  );
  assert.equal(
    ratingSignalSelectionInputSchema.safeParse(["good_food", "fair_price", "fast_service"])
      .success,
    false,
  );
});

test("rating signal submissions enforce star-to-signal mapping", () => {
  assert.deepEqual(ratingSignalSubmissionSchema.parse({ score: 5 }), {
    score: 5,
    signals: [],
  });
  assert.equal(
    ratingSignalSubmissionSchema.safeParse({
      score: 5,
      signals: ["good_food", "friendly_vendor"],
    }).success,
    true,
  );
  assert.equal(
    ratingSignalSubmissionSchema.safeParse({
      score: 3,
      signals: ["average_food", "slow_service"],
    }).success,
    true,
  );
  assert.equal(
    ratingSignalSubmissionSchema.safeParse({
      score: 1,
      signals: ["poor_hygiene", "vendor_unavailable"],
    }).success,
    true,
  );
  assert.equal(
    ratingSignalSubmissionSchema.safeParse({
      score: 3,
      signals: ["good_food"],
    }).success,
    false,
  );
  assert.equal(
    ratingSignalSubmissionSchema.safeParse({
      score: 5,
      signals: ["slow_service"],
    }).success,
    false,
  );
  assert.equal(
    ratingSignalSubmissionSchema.safeParse({
      score: 4,
      signals: ["poor_hygiene"],
    }).success,
    false,
  );
  assert.equal(isRatingSignalAllowedForScore(5, "good_food"), true);
  assert.equal(isRatingSignalAllowedForScore(2, "good_food"), false);
});

test("public rating request accepts star-only and validated optional signal submissions", () => {
  assert.deepEqual(createVendorRatingRequestSchema.parse({ score: 5 }), {
    score: 5,
    signals: [],
  });
  assert.deepEqual(
    createVendorRatingRequestSchema.parse({
      score: 5,
      signals: ["good_food", "fast_service"],
    }),
    {
      score: 5,
      signals: ["good_food", "fast_service"],
    },
  );
  assert.equal(createVendorRatingRequestSchema.safeParse({ score: 0 }).success, false);
  assert.equal(
    createVendorRatingRequestSchema.safeParse({
      score: 3,
      signals: ["good_food"],
    }).success,
    false,
  );
});

test("rating signal migration keeps raw signal selections fail-closed", () => {
  const migration = readFileSync(ratingSignalsMigrationPath, "utf8");

  assert.match(migration, /create table if not exists public\.rating_signal_options/);
  assert.match(migration, /create table if not exists public\.rating_signal_selections/);
  assert.match(
    migration,
    /rating_id uuid not null references public\.ratings\(id\) on delete cascade/,
  );
  assert.match(
    migration,
    /constraint rating_signal_selections_rating_option_unique unique \(\s+rating_id,\s+signal_option_id\s+\)/,
  );
  assert.match(migration, /alter table public\.rating_signal_options enable row level security;/);
  assert.match(migration, /alter table public\.rating_signal_selections enable row level security;/);
  assert.match(migration, /create trigger enforce_rating_signal_selection_rules/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /A rating can have at most two signal selections/);
  assert.match(
    migration,
    /grant select, insert, update, delete on table\s+public\.rating_signal_options,\s+public\.rating_signal_selections\s+to service_role;/,
  );
  assert.doesNotMatch(migration, /alter table public\.ratings[\s\S]*rating_signal/i);
  assert.doesNotMatch(migration, /\bgrant\b[\s\S]*\bto\s+anon\b/i);
  assert.doesNotMatch(migration, /\bgrant\b[\s\S]*\bto\s+authenticated\b/i);
});

test("rating signals RPC migration stores selections atomically without public exposure", () => {
  const migration = readFileSync(ratingSignalsRpcMigrationPath, "utf8");
  const validationIndex = migration.indexOf("if valid_signal_count <> signal_count then");
  const ratingInsertIndex = migration.indexOf("insert into public.ratings");

  assert.match(
    migration,
    /drop function if exists public\.submit_public_vendor_rating\(uuid, integer, text, text\);/,
  );
  assert.match(
    migration,
    /target_signal_tags text\[\] default '\{\}'::text\[\]/,
  );
  assert.match(migration, /returning id into inserted_rating_id/);
  assert.match(migration, /insert into public\.rating_signal_selections/);
  assert.match(migration, /if inserted_count > 0 then[\s\S]*perform public\.refresh_vendor_rating_summary/);
  assert.match(migration, /valid_signal_count <> signal_count/);
  assert.match(migration, /signal_count > 2/);
  assert.match(migration, /distinct_signal_count <> signal_count/);
  assert.match(migration, /is_active is true/);
  assert.match(migration, /target_score between score_min and score_max/);
  assert.ok(validationIndex > -1);
  assert.ok(ratingInsertIndex > -1);
  assert.ok(
    validationIndex < ratingInsertIndex,
    "signal validation must happen before inserting the rating row",
  );
  assert.match(
    migration,
    /grant execute on function public\.submit_public_vendor_rating\(\s+uuid,\s+integer,\s+text,\s+text,\s+text\[\]\s+\) to service_role;/,
  );
  assert.doesNotMatch(migration, /jsonb_build_object\([\s\S]*signal/i);
  assert.doesNotMatch(migration, /\bgrant\b[\s\S]*\bto\s+anon\b/i);
  assert.doesNotMatch(migration, /\bgrant\b[\s\S]*\bto\s+authenticated\b/i);
});

test("public rating badge migration exposes only thresholded positive summaries", () => {
  const migration = readFileSync(ratingSignalPublicBadgesMigrationPath, "utf8");

  assert.match(migration, /create or replace function public\.get_public_vendor_rating_badges/);
  assert.match(migration, /returns table \(\s+slug text,\s+label text\s+\)/);
  assert.match(migration, /options\.is_public_positive is true/);
  assert.match(migration, /options\.signal_type = 'positive'/);
  assert.match(migration, /count\(distinct ratings\.id\)::integer as signal_rating_count/);
  assert.match(migration, /badge_candidates\.total_rating_count >= 5/);
  assert.match(migration, /badge_candidates\.signal_rating_count >= 3/);
  assert.match(
    migration,
    /badge_candidates\.signal_rating_count \* 2 >= badge_candidates\.eligible_rating_count/,
  );
  assert.match(migration, /limit 3/);
  assert.match(
    migration,
    /grant execute on function public\.get_public_vendor_rating_badges\(uuid\) to service_role;/,
  );
  assert.doesNotMatch(migration, /returns table \([^)]*count/i);
  assert.doesNotMatch(migration, /\bgrant\b[\s\S]*\bto\s+anon\b/i);
  assert.doesNotMatch(migration, /\bgrant\b[\s\S]*\bto\s+authenticated\b/i);
});

test("rating signals do not expose a standalone public signal-only endpoint", () => {
  assert.equal(existsSync(publicSignalOnlyRoutePath), false);
});

test("admin rating signal summary migration exposes aggregate counts only to service role", () => {
  const migration = readFileSync(adminRatingSignalSummaryMigrationPath, "utf8");

  assert.match(migration, /create or replace function public\.get_admin_vendor_rating_signal_summary/);
  assert.match(migration, /returns table \(\s+positive_signal_count integer/);
  assert.match(migration, /neutral_signal_count integer/);
  assert.match(migration, /negative_signal_count integer/);
  assert.match(migration, /food_safety_concern_count integer/);
  assert.match(migration, /poor_hygiene_count integer/);
  assert.match(migration, /vendor_unavailable_count integer/);
  assert.match(migration, /recent_signal_count integer/);
  assert.match(migration, /count\(\*\) filter \(where signal_type = 'positive'\)::integer/);
  assert.match(migration, /count\(\*\) filter \(where slug = 'food_safety_concern'\)::integer/);
  assert.match(
    migration,
    /grant execute on function public\.get_admin_vendor_rating_signal_summary\(uuid\) to service_role;/,
  );
  assert.doesNotMatch(migration, /anonymous_client_hash/i);
  assert.doesNotMatch(migration, /source_type/i);
  assert.doesNotMatch(migration, /select\s+ratings\.id/i);
  assert.doesNotMatch(migration, /\bgrant\b[\s\S]*\bto\s+anon\b/i);
  assert.doesNotMatch(migration, /\bgrant\b[\s\S]*\bto\s+authenticated\b/i);
});

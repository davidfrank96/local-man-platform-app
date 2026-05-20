import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const publicRuntimeFiles = [
  "components/public/vendor-detail.tsx",
  "components/public/vendor-rating.tsx",
  "app/api/vendors/[slug]/route.ts",
  "app/api/vendors/[slug]/ratings/route.ts",
  "lib/ratings/signals.ts",
  "lib/vendors/supabase.ts",
];

const publicBadgeFiles = [
  "components/public/vendor-detail.tsx",
  "app/api/vendors/[slug]/route.ts",
  "lib/vendors/supabase.ts",
];

const forbiddenPublicPhrases = [
  "complaints",
  "accusations",
  "dirty vendor",
  "unsafe vendor",
  "dangerous vendor",
  "report vendor publicly",
  "community warnings",
  "vendor blacklist",
  "certified vendor",
  "safety guarantee",
];

const internalSignalLabels = [
  "Poor hygiene",
  "Food safety concern",
  "Rude service",
  "Price issue",
  "Vendor unavailable",
  "Wrong location",
  "Long wait",
];

test("public rating runtime copy avoids complaint, warning, and certification framing", () => {
  const publicRuntimeCopy = publicRuntimeFiles
    .map((path) => readRepoFile(path))
    .join("\n")
    .toLowerCase();

  for (const phrase of forbiddenPublicPhrases) {
    assert.equal(
      publicRuntimeCopy.includes(phrase),
      false,
      `Public rating runtime copy must not contain: ${phrase}`,
    );
  }

  assert.match(publicRuntimeCopy, /what stood out\?/);
  assert.match(publicRuntimeCopy, /what could be better\?/);
  assert.match(publicRuntimeCopy, /what went wrong\?/);
  assert.match(publicRuntimeCopy, /no text box is needed/);
  assert.doesNotMatch(publicRuntimeCopy, /textarea/);
});

test("public badge surfaces do not contain internal negative signal labels", () => {
  const publicBadgeCopy = publicBadgeFiles
    .map((path) => readRepoFile(path))
    .join("\n");

  for (const label of internalSignalLabels) {
    assert.equal(
      publicBadgeCopy.includes(label),
      false,
      `Public badge surface must not contain internal label: ${label}`,
    );
  }

  assert.match(publicBadgeCopy, /confidence badges/i);
  assert.doesNotMatch(publicBadgeCopy, /signal_rating_count/i);
  assert.doesNotMatch(publicBadgeCopy, /negative_signal_count/i);
});

test("admin rating signal copy is explicitly internal and aggregate-only", () => {
  const adminCopy = readRepoFile("components/admin/admin-vendor-workspace-sections.tsx");

  assert.match(adminCopy, /Internal signals/);
  assert.match(adminCopy, /Admin-only aggregate counts/);
  assert.match(adminCopy, /operational moderation/);
  assert.match(adminCopy, /does not expose rating identities/);
  assert.match(adminCopy, /anonymous hashes, IPs, or per-rating signal rows/);
  assert.match(adminCopy, /Food safety concern/);
  assert.match(adminCopy, /Poor hygiene/);
  assert.match(adminCopy, /Vendor unavailable/);
});

test("rating signal documentation describes the lightweight non-review model", () => {
  const docs = [
    "README.md",
    "docs/architecture/ARCHITECTURE.md",
    "docs/architecture/DECISIONS.md",
    "docs/api/API_SPEC.md",
    "docs/data/SCHEMA.md",
    "docs/ops/SECURITY.md",
    "docs/testing/TEST_PLAN.md",
    "docs/ui/UI_RULES.md",
    "docs/RELEASE_NOTES.md",
  ].map((path) => readRepoFile(path)).join("\n");

  assert.match(docs, /Star ratings remain primary/i);
  assert.match(docs, /optional predefined rating signals/i);
  assert.match(docs, /No free-text reviews/i);
  assert.match(docs, /confidence badges/i);
  assert.match(docs, /negative and neutral signals remain internal\/admin-only/i);
  assert.match(docs, /one rating cannot create a public badge/i);
  assert.match(docs, /duplicate retry/i);
  assert.match(docs, /not certifications, safety guarantees, public complaints, or vendor warnings/i);
});

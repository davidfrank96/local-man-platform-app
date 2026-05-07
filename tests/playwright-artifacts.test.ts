import assert from "node:assert/strict";
import test from "node:test";

import {
  createPlaywrightAdminIdentity,
  createPlaywrightAgentIdentity,
  createPlaywrightArtifactMarker,
  createPlaywrightImageFileName,
  createPlaywrightRatingComment,
  createPlaywrightVendorIdentity,
  isDestructiveVendorInvalidationReason,
  matchesPlaywrightQaAdminVendorName,
  matchesPlaywrightTestEmail,
  matchesPlaywrightTestVendorName,
} from "../lib/testing/playwright-artifacts.ts";
import {
  createPlaywrightArtifactFactory,
  createPlaywrightCleanupRegistry,
} from "./e2e/helpers/playwright-artifacts.ts";

const fixedDate = new Date("2026-05-07T18:30:45.000Z");

test("playwright artifact marker includes timestamp, worker, retry, and sanitized title", () => {
  const marker = createPlaywrightArtifactMarker({
    title: "Create Vendor Retry",
    workerIndex: 2,
    retry: 1,
    timestamp: fixedDate,
  });

  assert.equal(
    marker,
    "PLAYWRIGHT_20260507T183045Z_W2_R1_create-vendor-retry",
  );
});

test("playwright artifact factory produces deterministic scoped vendor and user identities", () => {
  const factory = createPlaywrightArtifactFactory({
    title: "Admin lifecycle",
    workerIndex: 1,
    retry: 0,
    timestamp: fixedDate,
  });

  const vendor = factory.createVendor("create");
  const admin = factory.createAdmin("owner");
  const agent = factory.createAgent("runner");
  const rating = factory.createRating("vote");
  const image = factory.createImage("cover", "png");

  assert.equal(
    vendor.name,
    "QA Admin Vendor PLAYWRIGHT_20260507T183045Z_W1_R0_admin-lifecycle-create",
  );
  assert.match(vendor.slug, /^qa-admin-vendor-playwright-/);
  assert.match(admin.email, /^qa_admin_playwright_/);
  assert.match(agent.email, /^qa_agent_playwright_/);
  assert.match(rating.comment, /^QA_E2E_PLAYWRIGHT_/);
  assert.match(image.fileName, /\.png$/);
});

test("playwright artifact namespaces stay unique across worker and retry scopes", () => {
  const workerZero = createPlaywrightArtifactFactory({
    title: "Parallel vendor flow",
    workerIndex: 0,
    retry: 0,
    timestamp: fixedDate,
  });
  const workerOne = createPlaywrightArtifactFactory({
    title: "Parallel vendor flow",
    workerIndex: 1,
    retry: 0,
    timestamp: fixedDate,
  });
  const retryOne = createPlaywrightArtifactFactory({
    title: "Parallel vendor flow",
    workerIndex: 0,
    retry: 1,
    timestamp: fixedDate,
  });

  assert.notEqual(workerZero.createVendor("create").name, workerOne.createVendor("create").name);
  assert.notEqual(workerZero.createVendor("create").slug, retryOne.createVendor("create").slug);
  assert.notEqual(workerZero.createAdmin("owner").email, workerOne.createAdmin("owner").email);
  assert.notEqual(workerZero.createAgent("runner").email, retryOne.createAgent("runner").email);
});

test("legacy and scoped test matchers accept only approved cleanup namespaces", () => {
  const legacyVendor = createPlaywrightVendorIdentity({
    title: "Legacy compatible",
    timestamp: fixedDate,
  });
  const adminIdentity = createPlaywrightAdminIdentity({
    title: "Admin user",
    timestamp: fixedDate,
  });
  const agentIdentity = createPlaywrightAgentIdentity({
    title: "Agent user",
    timestamp: fixedDate,
  });

  assert.equal(matchesPlaywrightQaAdminVendorName("QA Admin Vendor Alpha"), true);
  assert.equal(matchesPlaywrightQaAdminVendorName(legacyVendor.name), true);
  assert.equal(matchesPlaywrightTestVendorName("QA_TEST_Biryani House"), true);
  assert.equal(matchesPlaywrightTestEmail(adminIdentity.email), true);
  assert.equal(matchesPlaywrightTestEmail(agentIdentity.email), true);
  assert.equal(matchesPlaywrightQaAdminVendorName("Real Vendor"), false);
  assert.equal(matchesPlaywrightTestEmail("owner@realcompany.com"), false);
});

test("cleanup registry executes teardown in reverse order and keeps going after failures", async () => {
  const registry = createPlaywrightCleanupRegistry();
  const steps: string[] = [];

  registry.register("first", () => {
    steps.push("first");
  });
  registry.register("second", () => {
    steps.push("second");
    throw new Error("second failed");
  });
  registry.register("third", () => {
    steps.push("third");
  });

  const result = await registry.runAll();

  assert.deepEqual(steps, ["third", "second", "first"]);
  assert.deepEqual(result.errors, [
    { label: "second", message: "second failed" },
  ]);
});

test("artifact helpers cover ratings, image files, and destructive invalidation reasons", () => {
  assert.match(
    createPlaywrightRatingComment({ title: "Rate vendor", timestamp: fixedDate }),
    /^QA_E2E_PLAYWRIGHT_/,
  );
  assert.equal(
    createPlaywrightImageFileName({ title: "Hero Image", timestamp: fixedDate, extension: "webp" }),
    "playwright-20260507t183045z-w0-r0-hero-image.webp",
  );
  assert.equal(isDestructiveVendorInvalidationReason("vendor_deactivated"), true);
  assert.equal(isDestructiveVendorInvalidationReason("vendor_cleanup"), true);
  assert.equal(isDestructiveVendorInvalidationReason("vendor_updated"), false);
});

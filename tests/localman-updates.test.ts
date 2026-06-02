import assert from "node:assert/strict";
import test from "node:test";
import {
  LOCALMAN_UPDATES,
  getActiveLocalmanUpdates,
} from "../lib/public/localman-updates.ts";

test("Localman updates seed the expected active default messages", () => {
  const activeUpdates = getActiveLocalmanUpdates();

  assert.equal(activeUpdates.length, 5);
  assert.deepEqual(
    activeUpdates.map((update) => update.title),
    [
      "Welcome to Localman",
      "Discover Local. Empower Local.",
      "Rider Connect guidance",
      "Safety reminder",
      "Vendor discovery tip",
    ],
  );
  assert.ok(activeUpdates.every((update) => update.active));
  assert.ok(activeUpdates.every((update) => update.publishDate.length > 0));
});

test("Localman updates helper omits inactive messages without mutating the source", () => {
  const source = [
    ...LOCALMAN_UPDATES,
    {
      id: "inactive-test",
      title: "Inactive test",
      body: "This message should not render.",
      priority: "info" as const,
      active: false,
      publishDate: "2026-06-02",
    },
  ];

  const activeUpdates = getActiveLocalmanUpdates(source);

  assert.equal(activeUpdates.some((update) => update.id === "inactive-test"), false);
  assert.equal(source.length, LOCALMAN_UPDATES.length + 1);
});

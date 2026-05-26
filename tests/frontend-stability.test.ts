import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("discovery scroll persistence is frame-throttled", () => {
  const source = readRepoFile("components/public/public-discovery.tsx");
  const scrollPersistenceEffect = source.slice(
    source.indexOf("let scrollPersistFrameId = 0;"),
    source.indexOf("function restorePreviewSelectionFromSnapshot"),
  );

  assert.match(scrollPersistenceEffect, /window\.requestAnimationFrame\(persistScrollPosition\)/);
  assert.match(scrollPersistenceEffect, /window\.cancelAnimationFrame\(scrollPersistFrameId\)/);
  assert.match(
    scrollPersistenceEffect,
    /window\.addEventListener\("scroll", scheduleScrollPositionPersist, \{ passive: true \}\)/,
  );
  assert.match(
    scrollPersistenceEffect,
    /window\.addEventListener\("pagehide", persistScrollPositionImmediately\)/,
  );
  assert.doesNotMatch(
    scrollPersistenceEffect,
    /window\.addEventListener\("scroll", persistScrollPosition/,
  );
});

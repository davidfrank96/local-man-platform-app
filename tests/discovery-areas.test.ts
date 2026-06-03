import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  DISCOVERY_AREAS,
  DISCOVERY_AREA_IDS,
  DISCOVERY_AREA_SELECTION_STORAGE_KEY,
  createDiscoveryAreaLocation,
  getDiscoveryAreaById,
  getDiscoveryAreaByName,
  getDiscoveryAreaCenter,
  parseStoredDiscoveryAreaId,
  resolveRestoredDiscoveryAreaId,
} from "../lib/location/discovery-areas.ts";

function readRepoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("discovery areas expose the curated phase 1 area list only", () => {
  assert.deepEqual(
    DISCOVERY_AREAS.map((area) => area.displayName),
    [
      "Wuse",
      "Gwarinpa",
      "Jabi",
      "Utako",
      "Maitama",
      "Asokoro",
      "Garki",
      "Kubwa",
      "Lugbe",
    ],
  );
});

test("discovery areas have stable ids, display names, and valid Abuja-area centers", () => {
  for (const area of DISCOVERY_AREAS) {
    assert.equal(area.id, area.id.trim().toLowerCase());
    assert.ok(area.name.length > 0);
    assert.ok(area.displayName.length > 0);
    assert.ok(Number.isFinite(area.center.lat));
    assert.ok(Number.isFinite(area.center.lng));
    assert.ok(area.center.lat > 8.8 && area.center.lat < 9.3);
    assert.ok(area.center.lng > 7.2 && area.center.lng < 7.7);
  }
});

test("discovery areas reject duplicate ids and duplicate display names", () => {
  assert.equal(new Set(DISCOVERY_AREA_IDS).size, DISCOVERY_AREA_IDS.length);
  assert.equal(
    new Set(DISCOVERY_AREAS.map((area) => area.displayName.toLowerCase())).size,
    DISCOVERY_AREAS.length,
  );
});

test("discovery area lookup helpers resolve ids, names, and centers", () => {
  assert.equal(getDiscoveryAreaById("jabi")?.displayName, "Jabi");
  assert.equal(getDiscoveryAreaById(" JABI ")?.displayName, "Jabi");
  assert.equal(getDiscoveryAreaByName("Maitama")?.id, "maitama");
  assert.deepEqual(getDiscoveryAreaCenter("utako"), { lat: 9.0701, lng: 7.441 });
  assert.equal(getDiscoveryAreaById("not-real"), null);
  assert.equal(getDiscoveryAreaByName("not real"), null);
  assert.equal(getDiscoveryAreaCenter("not-real"), null);
});

test("discovery areas can produce approximate nearby discovery origins", () => {
  const wuse = getDiscoveryAreaById("wuse");

  assert.ok(wuse);

  const location = createDiscoveryAreaLocation(wuse);

  assert.equal(location.source, "approximate");
  assert.equal(location.label, "Wuse");
  assert.equal(location.isApproximate, true);
  assert.deepEqual(location.coordinates, { lat: 9.0813, lng: 7.4673 });
  assert.deepEqual(location.errors, []);
});

test("discovery area persistence helpers parse only known area ids", () => {
  assert.equal(DISCOVERY_AREA_SELECTION_STORAGE_KEY, "localman:selected-discovery-area");
  assert.equal(parseStoredDiscoveryAreaId("gwarinpa"), "gwarinpa");
  assert.equal(parseStoredDiscoveryAreaId(" Gwarinpa "), "gwarinpa");
  assert.equal(parseStoredDiscoveryAreaId("central-business-district"), null);
  assert.equal(parseStoredDiscoveryAreaId(null), null);
});

test("snapshot area restoration never clears an active discovery area", () => {
  assert.equal(
    resolveRestoredDiscoveryAreaId({
      currentAreaId: "wuse",
      shouldRestore: true,
      snapshotAreaId: null,
    }),
    "wuse",
  );
  assert.equal(
    resolveRestoredDiscoveryAreaId({
      currentAreaId: "wuse",
      shouldRestore: true,
      snapshotAreaId: "garki",
    }),
    "wuse",
  );
  assert.equal(
    resolveRestoredDiscoveryAreaId({
      currentAreaId: null,
      shouldRestore: true,
      snapshotAreaId: "garki",
    }),
    "garki",
  );
  assert.equal(
    resolveRestoredDiscoveryAreaId({
      currentAreaId: null,
      shouldRestore: true,
      snapshotAreaId: "not-real",
    }),
    null,
  );
  assert.equal(
    resolveRestoredDiscoveryAreaId({
      currentAreaId: null,
      shouldRestore: false,
      snapshotAreaId: "garki",
    }),
    null,
  );
});

test("area selector is wired as a fallback without persisting area state", () => {
  const selector = readRepoFile("components/public/area-discovery-selector.tsx");
  const modal = readRepoFile("components/public/area-discovery-modal.tsx");
  const discovery = readRepoFile("components/public/public-discovery.tsx");

  assert.match(selector, /DISCOVERY_AREAS/);
  assert.match(selector, /aria-describedby/);
  assert.match(selector, /controlRef/);
  assert.match(selector, /selectedAreaId/);
  assert.match(modal, /DISCOVERY_AREAS/);
  assert.match(modal, /useModalFocusTrap/);
  assert.match(modal, /role="dialog"/);
  assert.match(discovery, /AreaDiscoveryModal/);
  assert.match(discovery, /Browse By Area/);
  assert.match(discovery, /createDiscoveryAreaLocation/);
  assert.match(discovery, /userLocation=\{activeFetchLocation\?\.coordinates/);
  assert.doesNotMatch(discovery, /DISCOVERY_AREAS/);
  assert.doesNotMatch(discovery, /getDiscoveryAreaCenter/);
  assert.doesNotMatch(discovery, /DISCOVERY_AREA_SELECTION_STORAGE_KEY/);
});

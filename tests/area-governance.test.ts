import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  ABUJA_AREA_DEFINITIONS,
  ABUJA_AREA_IDS,
  ABUJA_AREA_NAMES,
  getAreaAliasEntries,
  getAreaDefinition,
  getAreaGovernanceDuplicateKeys,
  isKnownArea,
  normalizeArea,
  type AbujaAreaDefinition,
} from "../lib/location/area-governance.ts";

function readRepoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("area governance exposes the official Abuja area list", () => {
  assert.deepEqual(ABUJA_AREA_NAMES, [
    "Wuse",
    "Jabi",
    "Utako",
    "Garki",
    "Maitama",
    "Asokoro",
    "Guzape",
    "Gwarinpa",
    "Lugbe",
    "Kubwa",
    "Wuye",
    "Apo",
    "Katampe",
    "Kado",
    "Life Camp",
    "Lokogoma",
    "Durumi",
    "Gudu",
    "Galadimawa",
    "Dawaki",
    "Jahi",
    "Mabushi",
    "Dape",
    "Karsana",
    "Mpape",
    "Kaura",
    "Dakibiyu",
    "Dei-Dei",
    "Zuba",
    "Idu",
    "Karu",
    "Nyanya",
    "Mararaba",
    "Masaka",
    "Gwagwalada",
    "Kuje",
    "Airport Road Corridor",
  ]);
});

test("area definitions include stable ids and governance groups", () => {
  assert.equal(ABUJA_AREA_DEFINITIONS.length, 37);

  for (const area of ABUJA_AREA_DEFINITIONS) {
    assert.equal(area.id, area.id.trim().toLowerCase());
    assert.match(area.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(area.name.length > 0);
    assert.ok(["core", "important", "growth", "satellite"].includes(area.group));
    assert.ok(area.aliases.includes(area.name));
  }

  assert.equal(new Set(ABUJA_AREA_IDS).size, ABUJA_AREA_IDS.length);
  assert.equal(new Set(ABUJA_AREA_NAMES).size, ABUJA_AREA_NAMES.length);
});

test("area normalization is case-insensitive and whitespace tolerant", () => {
  assert.equal(normalizeArea("wuse"), "Wuse");
  assert.equal(normalizeArea(" WUSE "), "Wuse");
  assert.equal(normalizeArea("jabi"), "Jabi");
  assert.equal(normalizeArea(" JABI "), "Jabi");
  assert.equal(normalizeArea("life    camp"), "Life Camp");
  assert.equal(normalizeArea("dei dei"), "Dei-Dei");
  assert.equal(normalizeArea("airport-road-corridor"), "Airport Road Corridor");
});

test("area aliases resolve to canonical area definitions", () => {
  assert.equal(getAreaDefinition("WUSE")?.name, "Wuse");
  assert.equal(getAreaDefinition("wuse")?.name, "Wuse");
  assert.equal(getAreaDefinition("JABI")?.name, "Jabi");
  assert.equal(getAreaDefinition("jabi")?.name, "Jabi");
  assert.equal(getAreaDefinition("life-camp")?.name, "Life Camp");
  assert.equal(getAreaDefinition("not real"), null);
});

test("known area checks do not reject unknown values by themselves", () => {
  assert.equal(isKnownArea("Garki"), true);
  assert.equal(isKnownArea("garki"), true);
  assert.equal(isKnownArea("Frank Area"), false);
  assert.equal(normalizeArea("Frank Area"), null);
  assert.equal(normalizeArea(null), null);
});

test("area governance prevents duplicate canonical and alias conflicts", () => {
  assert.deepEqual(getAreaGovernanceDuplicateKeys(), []);

  const conflictingDefinitions: AbujaAreaDefinition[] = [
    {
      id: "wuse",
      name: "Wuse",
      group: "core",
      aliases: ["Wuse"],
    },
    {
      id: "fake-wuse",
      name: "Fake Wuse",
      group: "growth",
      aliases: ["wuse"],
    },
  ];

  assert.deepEqual(getAreaGovernanceDuplicateKeys(conflictingDefinitions), ["wuse"]);
});

test("area alias entries expose canonical names for future form/reporting use", () => {
  const aliases = getAreaAliasEntries();

  assert.ok(
    aliases.some((entry) => entry.alias === "WUSE" && entry.canonicalName === "Wuse"),
  );
  assert.ok(
    aliases.some((entry) => entry.alias === "life-camp" && entry.canonicalName === "Life Camp"),
  );
});

test("manual admin vendor creation uses the governed area selector", () => {
  const component = readRepoFile("components/admin/admin-vendor-workspace-sections.tsx");

  assert.match(component, /ABUJA_AREA_DEFINITIONS/);
  assert.match(component, /<select\s+[\s\S]*?defaultValue=""\s+[\s\S]*?name="area"/);
  assert.match(component, /<optgroup key=\{group\} label=\{areaGroupLabels\[group\]\}>/);
  assert.match(component, /<option key=\{area\.id\} value=\{area\.name\}>/);
  assert.match(component, /function UpdateVendorIdentityFields/);
  assert.match(component, /<input defaultValue=\{selectedVendor\?\.area \?\? ""\} name="area"/);
});

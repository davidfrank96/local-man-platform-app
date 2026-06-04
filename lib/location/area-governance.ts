export type AbujaAreaGroup =
  | "core"
  | "important"
  | "growth"
  | "satellite";

export type AbujaAreaDefinition = {
  id: string;
  name: string;
  group: AbujaAreaGroup;
  aliases: string[];
};

const coreAreas = [
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
] as const;

const importantAreas = [
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
] as const;

const growthAreas = [
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
] as const;

const satelliteAreas = [
  "Karu",
  "Nyanya",
  "Mararaba",
  "Masaka",
  "Gwagwalada",
  "Kuje",
  "Airport Road Corridor",
] as const;

function slugifyAreaId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function createAreaDefinitions(
  group: AbujaAreaGroup,
  names: readonly string[],
): AbujaAreaDefinition[] {
  return names.map((name) => ({
    id: slugifyAreaId(name),
    name,
    group,
    aliases: [name, name.toLowerCase(), name.toUpperCase()],
  }));
}

export const ABUJA_AREA_DEFINITIONS = [
  ...createAreaDefinitions("core", coreAreas),
  ...createAreaDefinitions("important", importantAreas),
  ...createAreaDefinitions("growth", growthAreas),
  ...createAreaDefinitions("satellite", satelliteAreas),
] as const satisfies readonly AbujaAreaDefinition[];

export const ABUJA_AREA_NAMES = ABUJA_AREA_DEFINITIONS.map((area) => area.name);
export const ABUJA_AREA_IDS = ABUJA_AREA_DEFINITIONS.map((area) => area.id);

function normalizeAreaKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildAreaLookup(): Map<string, AbujaAreaDefinition> {
  const lookup = new Map<string, AbujaAreaDefinition>();

  for (const area of ABUJA_AREA_DEFINITIONS) {
    for (const value of [area.id, area.name, ...area.aliases]) {
      const key = normalizeAreaKey(value);

      if (!lookup.has(key)) {
        lookup.set(key, area);
      }
    }
  }

  return lookup;
}

const AREA_LOOKUP = buildAreaLookup();

export function getAreaDefinition(value: string): AbujaAreaDefinition | null {
  return AREA_LOOKUP.get(normalizeAreaKey(value)) ?? null;
}

export function isKnownArea(value: unknown): value is string {
  return typeof value === "string" && getAreaDefinition(value) !== null;
}

export function normalizeArea(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return getAreaDefinition(value)?.name ?? null;
}

export function getAreaAliasEntries(): Array<{
  alias: string;
  canonicalName: string;
}> {
  return ABUJA_AREA_DEFINITIONS.flatMap((area) =>
    [area.id, area.name, ...area.aliases].map((alias) => ({
      alias,
      canonicalName: area.name,
    }))
  );
}

export function getAreaGovernanceDuplicateKeys(
  definitions: readonly AbujaAreaDefinition[] = ABUJA_AREA_DEFINITIONS,
): string[] {
  const seen = new Map<string, string>();
  const duplicates = new Set<string>();

  for (const area of definitions) {
    for (const value of [area.id, area.name, ...area.aliases]) {
      const key = normalizeAreaKey(value);
      const existingAreaId = seen.get(key);

      if (existingAreaId && existingAreaId !== area.id) {
        duplicates.add(key);
      }

      seen.set(key, area.id);
    }
  }

  return [...duplicates].sort();
}

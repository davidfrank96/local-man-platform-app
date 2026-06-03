import type { AcquiredUserLocation } from "./acquisition.ts";

export type DiscoveryAreaId =
  | "wuse"
  | "gwarinpa"
  | "jabi"
  | "utako"
  | "maitama"
  | "asokoro"
  | "garki"
  | "kubwa"
  | "lugbe";

export type DiscoveryArea = {
  id: DiscoveryAreaId;
  name: string;
  displayName: string;
  center: {
    lat: number;
    lng: number;
  };
};

export const DISCOVERY_AREA_SELECTION_STORAGE_KEY =
  "localman:selected-discovery-area";

export const DISCOVERY_AREAS = [
  {
    id: "wuse",
    name: "Wuse",
    displayName: "Wuse",
    center: { lat: 9.0813, lng: 7.4673 },
  },
  {
    id: "gwarinpa",
    name: "Gwarinpa",
    displayName: "Gwarinpa",
    center: { lat: 9.1099, lng: 7.4042 },
  },
  {
    id: "jabi",
    name: "Jabi",
    displayName: "Jabi",
    center: { lat: 9.065, lng: 7.4231 },
  },
  {
    id: "utako",
    name: "Utako",
    displayName: "Utako",
    center: { lat: 9.0701, lng: 7.441 },
  },
  {
    id: "maitama",
    name: "Maitama",
    displayName: "Maitama",
    center: { lat: 9.0956, lng: 7.4934 },
  },
  {
    id: "asokoro",
    name: "Asokoro",
    displayName: "Asokoro",
    center: { lat: 9.0476, lng: 7.515 },
  },
  {
    id: "garki",
    name: "Garki",
    displayName: "Garki",
    center: { lat: 9.0267, lng: 7.4833 },
  },
  {
    id: "kubwa",
    name: "Kubwa",
    displayName: "Kubwa",
    center: { lat: 9.1538, lng: 7.3231 },
  },
  {
    id: "lugbe",
    name: "Lugbe",
    displayName: "Lugbe",
    center: { lat: 8.991, lng: 7.3553 },
  },
] as const satisfies readonly DiscoveryArea[];

export const DISCOVERY_AREA_IDS = DISCOVERY_AREAS.map((area) => area.id);

const DISCOVERY_AREA_BY_ID = new Map<DiscoveryAreaId, DiscoveryArea>(
  DISCOVERY_AREAS.map((area) => [area.id, area]),
);

function normalizeAreaInput(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function isDiscoveryAreaId(value: string): value is DiscoveryAreaId {
  return DISCOVERY_AREA_BY_ID.has(value as DiscoveryAreaId);
}

export function getDiscoveryAreaById(id: string): DiscoveryArea | null {
  const normalizedId = normalizeAreaInput(id);

  return isDiscoveryAreaId(normalizedId)
    ? DISCOVERY_AREA_BY_ID.get(normalizedId) ?? null
    : null;
}

export function getDiscoveryAreaByName(name: string): DiscoveryArea | null {
  const normalizedName = normalizeAreaInput(name);

  return (
    DISCOVERY_AREAS.find(
      (area) =>
        normalizeAreaInput(area.name) === normalizedName ||
        normalizeAreaInput(area.displayName) === normalizedName,
    ) ?? null
  );
}

export function getDiscoveryAreaCenter(id: string): DiscoveryArea["center"] | null {
  return getDiscoveryAreaById(id)?.center ?? null;
}

export function createDiscoveryAreaLocation(
  area: DiscoveryArea,
): AcquiredUserLocation {
  return {
    source: "approximate",
    label: area.displayName,
    coordinates: area.center,
    isApproximate: true,
    errors: [],
  };
}

export function parseStoredDiscoveryAreaId(value: unknown): DiscoveryAreaId | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedId = normalizeAreaInput(value);

  return isDiscoveryAreaId(normalizedId) ? normalizedId : null;
}

export function resolveRestoredDiscoveryAreaId({
  currentAreaId,
  shouldRestore,
  snapshotAreaId,
}: {
  currentAreaId: DiscoveryAreaId | null;
  shouldRestore: boolean;
  snapshotAreaId: unknown;
}): DiscoveryAreaId | null {
  if (currentAreaId) {
    return currentAreaId;
  }

  if (!shouldRestore) {
    return null;
  }

  return parseStoredDiscoveryAreaId(snapshotAreaId);
}

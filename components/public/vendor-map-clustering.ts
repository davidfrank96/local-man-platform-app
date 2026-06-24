import type { Feature, FeatureCollection, Point } from "geojson";
import type { NearbyVendor } from "./vendor-map-types.ts";
import {
  getVendorMapCenter,
  type VendorMapCenter,
} from "./vendor-map-camera.ts";

export const VENDOR_CLUSTER_RADIUS_DESKTOP = 44;
export const VENDOR_CLUSTER_RADIUS_MOBILE = 56;
export const VENDOR_CLUSTER_MAX_ZOOM = 15;
export const SELECTED_VENDOR_MOBILE_OFFSET_Y = -96;
export const CLUSTER_EXPANSION_MOBILE_OFFSET_Y = -52;
export const CARD_SELECTION_ANIMATION_MS = 350;
export const MAP_SELECTION_ANIMATION_MS = 330;
export const CLUSTER_EXPANSION_ANIMATION_MS = 320;

export type VendorFeatureProperties = {
  vendorId: string;
  name: string;
  area: string;
  slug: string;
  isOpenNow: boolean;
  distanceKm: number;
  rankingScore: number;
  sameLocationCount: number;
};

export type VendorPointFeature = Feature<Point, VendorFeatureProperties>;
export type VendorFeatureCollection = FeatureCollection<Point, VendorFeatureProperties>;

export type SameLocationGroup = {
  key: string;
  center: VendorMapCenter;
  vendors: NearbyVendor[];
};

function getCoordinateKey(center: VendorMapCenter): string {
  return `${center[0].toFixed(7)}:${center[1].toFixed(7)}`;
}

export function getVendorClusterRadius(isMobile: boolean): number {
  return isMobile ? VENDOR_CLUSTER_RADIUS_MOBILE : VENDOR_CLUSTER_RADIUS_DESKTOP;
}

export function getSelectionCameraOffset(
  isMobile: boolean,
): [x: number, y: number] | undefined {
  return isMobile ? [0, SELECTED_VENDOR_MOBILE_OFFSET_Y] : undefined;
}

export function getClusterExpansionCameraOffset(
  isMobile: boolean,
): [x: number, y: number] | undefined {
  return isMobile ? [0, CLUSTER_EXPANSION_MOBILE_OFFSET_Y] : undefined;
}

export function getSameLocationGroups(vendors: NearbyVendor[]): SameLocationGroup[] {
  const groups = new Map<string, SameLocationGroup>();

  for (const vendor of vendors) {
    const center = getVendorMapCenter(vendor);

    if (!center) {
      continue;
    }

    const key = getCoordinateKey(center);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.vendors.push(vendor);
      continue;
    }

    groups.set(key, {
      key,
      center,
      vendors: [vendor],
    });
  }

  return [...groups.values()];
}

export function getSameLocationGroupForVendor(
  groups: SameLocationGroup[],
  vendorId: string | null,
): SameLocationGroup | null {
  if (!vendorId) {
    return null;
  }

  return groups.find((group) =>
    group.vendors.some((vendor) => vendor.vendor_id === vendorId),
  ) ?? null;
}

export function createVendorFeatureCollection(
  vendors: NearbyVendor[],
  sameLocationGroups = getSameLocationGroups(vendors),
): VendorFeatureCollection {
  const sameLocationCountByKey = new Map(
    sameLocationGroups.map((group) => [group.key, group.vendors.length] as const),
  );
  const features: VendorPointFeature[] = [];

  for (const vendor of vendors) {
    const center = getVendorMapCenter(vendor);

    if (!center) {
      continue;
    }

    const coordinateKey = getCoordinateKey(center);

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: center,
      },
      properties: {
        vendorId: vendor.vendor_id,
        name: vendor.name,
        area: vendor.area ?? "",
        slug: vendor.slug,
        isOpenNow: vendor.is_open_now,
        distanceKm: vendor.distance_km,
        rankingScore: vendor.ranking_score,
        sameLocationCount: sameLocationCountByKey.get(coordinateKey) ?? 1,
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

export function createSelectedVendorFeatureCollection(
  vendors: NearbyVendor[],
  selectedVendorId: string | null,
): VendorFeatureCollection {
  const selectedVendor = selectedVendorId
    ? vendors.find((vendor) => vendor.vendor_id === selectedVendorId)
    : null;

  if (!selectedVendor) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  return createVendorFeatureCollection([selectedVendor]);
}

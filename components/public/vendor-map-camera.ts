import type { VendorSelectionSource } from "./vendor-map-types.ts";

type VendorCoordinateCandidate = {
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type SelectableVendorCoordinateCandidate = VendorCoordinateCandidate & {
  vendor_id: string;
};

export type VendorMapCenter = [longitude: number, latitude: number];

export const SELECTED_VENDOR_CAMERA_ZOOM = 16;

function normalizeCoordinate(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isValidLatitude(value: number | null): value is number {
  return value !== null && value >= -90 && value <= 90;
}

function isValidLongitude(value: number | null): value is number {
  return value !== null && value >= -180 && value <= 180;
}

export function getVendorMapCenter(
  vendor: VendorCoordinateCandidate,
): VendorMapCenter | null {
  const latitude = normalizeCoordinate(vendor.latitude);
  const longitude = normalizeCoordinate(vendor.longitude);

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }

  return [longitude, latitude];
}

export function isSelectionCameraSource(
  source: VendorSelectionSource,
): source is "card" | "map" {
  return source === "card" || source === "map";
}

export function getSelectedVendorCameraTarget(
  vendors: SelectableVendorCoordinateCandidate[],
  selectedVendorId: string | null,
  currentZoom: number,
) {
  if (!selectedVendorId) {
    return null;
  }

  const selectedVendor = vendors.find((vendor) => vendor.vendor_id === selectedVendorId);
  if (!selectedVendor) {
    return null;
  }

  const center = getVendorMapCenter(selectedVendor);
  if (!center) {
    return null;
  }

  return {
    center,
    zoom: Math.max(currentZoom, SELECTED_VENDOR_CAMERA_ZOOM),
  };
}

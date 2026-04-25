import type { Coordinates } from "./distance.ts";

export function formatLocationCoordinates(
  coordinates: Coordinates,
  precision = 5,
): string {
  return `${coordinates.lat.toFixed(precision)}, ${coordinates.lng.toFixed(precision)}`;
}


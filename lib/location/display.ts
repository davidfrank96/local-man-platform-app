import type { Coordinates } from "./distance.ts";
import type { LocationSource } from "./user-location.ts";

export function formatLocationCoordinates(
  coordinates: Coordinates,
  precision = 5,
): string {
  return `${coordinates.lat.toFixed(precision)}, ${coordinates.lng.toFixed(precision)}`;
}

export function formatLocationAccuracyLabel(source: LocationSource | null): string | null {
  if (source === "precise") {
    return "High accuracy";
  }

  if (source === "approximate") {
    return "Turn on location for exact nearby results";
  }

  return null;
}

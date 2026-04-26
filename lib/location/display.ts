import type { Coordinates } from "./distance.ts";
import type { LocationSource } from "./user-location.ts";
import type { LocationAcquisitionStatus } from "./acquisition.ts";
import type { AcquiredUserLocation } from "./acquisition.ts";

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

export type PublicLocationDisplayModel = {
  headline: string;
  detail: string | null;
  trustLine: string | null;
};

export function formatApproximateLocationLabel(label: string): string {
  return `Near ${label}`;
}

export function getPublicLocationDisplayModel({
  status,
  location,
  resolvedLocationLabel,
}: {
  status: LocationAcquisitionStatus;
  location: AcquiredUserLocation | null;
  resolvedLocationLabel: string | null;
}): PublicLocationDisplayModel {
  if (status === "precise" && location?.source === "precise") {
    return {
      headline: "Using your current location",
      detail: resolvedLocationLabel ?? formatLocationCoordinates(location.coordinates),
      trustLine: formatLocationAccuracyLabel(location.source),
    };
  }

  if (
    status === "approximate" &&
    location?.source === "approximate" &&
    resolvedLocationLabel
  ) {
    return {
      headline: "Using approximate location",
      detail: formatApproximateLocationLabel(resolvedLocationLabel),
      trustLine: formatLocationAccuracyLabel(location.source),
    };
  }

  if (status === "idle" || status === "resolving") {
    return {
      headline: "Finding nearby vendors",
      detail: null,
      trustLine: null,
    };
  }

  return {
    headline: "Showing nearby vendors",
    detail: "Turn on location for more accurate nearby vendors.",
    trustLine: null,
  };
}

import {
  DEFAULT_CITY_LOCATION,
  type LocationSource,
  type ResolvedUserLocation,
} from "./user-location.ts";
import type { Coordinates } from "./distance.ts";

export type LocationAcquisitionStatus =
  | "idle"
  | "resolving"
  | "precise"
  | "approximate"
  | "default_city"
  | "denied"
  | "unavailable"
  | "error";

export type LocationAcquisitionErrorCode =
  | "GEOLOCATION_DENIED"
  | "GEOLOCATION_UNAVAILABLE"
  | "GEOLOCATION_TIMEOUT"
  | "IP_LOOKUP_UNAVAILABLE"
  | "UNKNOWN";

export type LocationAcquisitionError = {
  code: LocationAcquisitionErrorCode;
  message: string;
};

export type AcquiredUserLocation = ResolvedUserLocation & {
  errors: LocationAcquisitionError[];
};

export type BrowserGeolocationProvider = () => Promise<Coordinates>;

export type IpApproximationProvider = () => Promise<Coordinates | null>;

export type AcquireUserLocationOptions = {
  browserGeolocation?: BrowserGeolocationProvider;
  ipApproximation?: IpApproximationProvider;
};

type GeolocationErrorLike = {
  code?: number;
  message?: string;
};

const geolocationErrorCodes: Record<number, LocationAcquisitionErrorCode> = {
  1: "GEOLOCATION_DENIED",
  2: "GEOLOCATION_UNAVAILABLE",
  3: "GEOLOCATION_TIMEOUT",
};

export const BROWSER_GEOLOCATION_TIMEOUT_MS = 10_000;

export function deriveLocationAcquisitionStatus(
  location: AcquiredUserLocation,
): LocationAcquisitionStatus {
  if (location.source === "precise") {
    return "precise";
  }

  if (location.source === "approximate") {
    return "approximate";
  }

  if (location.errors.some((error) => error.code === "GEOLOCATION_DENIED")) {
    return "denied";
  }

  if (
    location.errors.some(
      (error) =>
        error.code === "GEOLOCATION_UNAVAILABLE" || error.code === "GEOLOCATION_TIMEOUT",
    )
  ) {
    return "unavailable";
  }

  return "default_city";
}

function toLocationError(error: unknown): LocationAcquisitionError {
  const geolocationError = error as GeolocationErrorLike;
  const code =
    typeof geolocationError.code === "number"
      ? geolocationErrorCodes[geolocationError.code] ?? "UNKNOWN"
      : "UNKNOWN";

  return {
    code,
    message:
      typeof geolocationError.message === "string" && geolocationError.message
        ? geolocationError.message
        : "Unable to resolve precise browser location.",
  };
}

function createLocation(
  source: LocationSource,
  label: string,
  coordinates: Coordinates,
  errors: LocationAcquisitionError[],
): AcquiredUserLocation {
  return {
    source,
    label,
    coordinates,
    isApproximate: source !== "precise",
    errors,
  };
}

export function getBrowserGeolocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject({
        code: 2,
        message: "Browser geolocation is unavailable.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      reject,
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: BROWSER_GEOLOCATION_TIMEOUT_MS,
      },
    );
  });
}

export async function getIpApproximation(): Promise<Coordinates | null> {
  return null;
}

export async function acquireUserLocation({
  browserGeolocation = getBrowserGeolocation,
  ipApproximation = getIpApproximation,
}: AcquireUserLocationOptions = {}): Promise<AcquiredUserLocation> {
  const errors: LocationAcquisitionError[] = [];

  try {
    const coordinates = await browserGeolocation();

    return createLocation("precise", "Current location", coordinates, errors);
  } catch (error) {
    errors.push(toLocationError(error));
  }

  try {
    const approximateCoordinates = await ipApproximation();

    if (approximateCoordinates) {
      return createLocation(
        "approximate",
        "Approximate location",
        approximateCoordinates,
        errors,
      );
    }

    errors.push({
      code: "IP_LOOKUP_UNAVAILABLE",
      message: "IP-based approximate location is unavailable.",
    });
  } catch (error) {
    errors.push({
      code: "IP_LOOKUP_UNAVAILABLE",
      message:
        error instanceof Error
          ? error.message
          : "IP-based approximate location failed.",
    });
  }

  return createLocation(
    "default_city",
    DEFAULT_CITY_LOCATION.label,
    DEFAULT_CITY_LOCATION.coordinates,
    errors,
  );
}

import type { NearbyVendorsQuery } from "../../types";
import type { Coordinates } from "./distance.ts";

export const DEFAULT_CITY_LOCATION = {
  label: "Abuja",
  coordinates: {
    lat: 9.0765,
    lng: 7.3986,
  },
} as const;

export type LocationSource = "precise" | "approximate" | "default_city";

export type ResolvedUserLocation = {
  source: LocationSource;
  label: string;
  coordinates: Coordinates;
  isApproximate: boolean;
};

export type ResolvedNearbyVendorsQuery = Omit<
  NearbyVendorsQuery,
  "lat" | "lng" | "location_source"
> & {
  lat: number;
  lng: number;
  location_source: LocationSource;
};

export type ResolvedNearbySearch = {
  query: ResolvedNearbyVendorsQuery;
  location: ResolvedUserLocation;
};

export function resolveNearbySearchLocation(
  query: NearbyVendorsQuery,
): ResolvedNearbySearch {
  if (query.lat === undefined || query.lng === undefined) {
    return {
      query: {
        ...query,
        lat: DEFAULT_CITY_LOCATION.coordinates.lat,
        lng: DEFAULT_CITY_LOCATION.coordinates.lng,
        location_source: "default_city",
      },
      location: {
        source: "default_city",
        label: DEFAULT_CITY_LOCATION.label,
        coordinates: DEFAULT_CITY_LOCATION.coordinates,
        isApproximate: true,
      },
    };
  }

  const source = query.location_source ?? "precise";

  return {
    query: {
      ...query,
      lat: query.lat,
      lng: query.lng,
      location_source: source,
    },
    location: {
      source,
      label: source === "approximate" ? "Approximate location" : "Current location",
      coordinates: {
        lat: query.lat,
        lng: query.lng,
      },
      isApproximate: source !== "precise",
    },
  };
}

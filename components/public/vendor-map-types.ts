import type { Coordinates } from "../../lib/location/distance.ts";
import type { PublicTimeTheme } from "../../lib/public/time-theme.ts";
import { DEFAULT_CITY_LOCATION } from "../../lib/location/user-location.ts";
import type { NearbyVendorsResponseData } from "../../types/index.ts";

export type NearbyVendor = NearbyVendorsResponseData["vendors"][number];

export type VendorSelectionSource = "map" | "card" | "filter" | "restore" | null;

export type VendorMapProps = {
  vendors: NearbyVendor[];
  userLocation: Coordinates | null;
  selectedVendorId: string | null;
  selectionActionToken: number;
  selectionSource: VendorSelectionSource;
  timeTheme: PublicTimeTheme | null;
  onSelectVendor: (vendorId: string, source: "map") => void;
};

export const DEFAULT_VENDOR_MAP_CENTER: Coordinates = {
  lat: DEFAULT_CITY_LOCATION.coordinates.lat,
  lng: DEFAULT_CITY_LOCATION.coordinates.lng,
};

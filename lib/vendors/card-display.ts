import type { NearbyVendorsResponseData } from "../../types/index.ts";

type NearbyVendor = NearbyVendorsResponseData["vendors"][number];

export function formatVendorCardPriceBand(
  priceBand: NearbyVendor["price_band"],
): string | null {
  switch (priceBand) {
    case "budget":
      return "Budget-friendly";
    case "standard":
      return "Everyday price";
    case "premium":
      return "Higher price";
    default:
      return null;
  }
}

export function formatVendorCardRating(
  averageRating: number,
  reviewCount: number,
): string {
  if (reviewCount <= 0) {
    return "New";
  }

  return `★ ${averageRating.toFixed(1)}`;
}

export function formatVendorCardDistance(
  distanceKm: number,
  approximateDistance: boolean,
): string {
  const prefix = approximateDistance ? "About " : "";

  if (distanceKm < 1) {
    return `${prefix}${Math.round(distanceKm * 1000)} m`;
  }

  return `${prefix}${distanceKm.toFixed(1)} km`;
}

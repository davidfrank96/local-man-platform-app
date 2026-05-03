import {
  calculateDistanceKm,
  getBoundingBox,
  roundDistanceKm,
  type BoundingBox,
  type Coordinates,
} from "../location/distance.ts";
import type { ResolvedNearbyVendorsQuery } from "../location/user-location.ts";
import type { PriceBand } from "../../types";
import { getVendorSearchRelevance } from "./discovery-ranking.ts";
import { formatTodayHoursLabel } from "./time-display.ts";

export const DEFAULT_NEARBY_RADIUS_KM = 10;
export const MAX_NEARBY_VENDOR_RESULTS = 50;

export type VendorHourWindow = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

export type NearbyVendorFeaturedDishSummary = {
  dish_name: string;
  description: string | null;
};

export type VendorLocationRecord = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  phone_number: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  price_band: PriceBand | null;
  average_rating: number;
  review_count: number;
  is_open_override: boolean | null;
  vendor_hours?: VendorHourWindow[] | null;
  vendor_featured_dishes?: Array<{
    dish_name: string;
    description: string | null;
    is_featured: boolean;
  }> | null;
  vendor_category_map?: Array<{
    vendor_categories: {
      slug: string;
    } | null;
  }> | null;
};

export type NearbyVendorResult = {
  vendor_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  phone_number: string | null;
  area: string | null;
  latitude: number;
  longitude: number;
  price_band: PriceBand | null;
  average_rating: number;
  review_count: number;
  ranking_score: number;
  distance_km: number;
  is_open_now: boolean;
  featured_dish: NearbyVendorFeaturedDishSummary | null;
  today_hours: string;
};

type NearbyVendorSortable = NearbyVendorResult & {
  rawDistanceKm: number;
  searchScore: number;
};

export type VendorUsageScoreMap = Map<string, number>;

export type VendorAvailabilitySnapshot = {
  isOpenNow: boolean;
  todayHours: string;
};

const ABUJA_TIME_ZONE = "Africa/Lagos";

function parseTimeToMinutes(time: string | null): number | null {
  if (!time) return null;

  const [hours, minutes] = time.split(":").map(Number);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getDayAndMinuteInAbuja(date: Date): {
  dayOfWeek: number;
  minuteOfDay: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ABUJA_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    weekday ?? "",
  );

  return {
    dayOfWeek,
    minuteOfDay: hour * 60 + minute,
  };
}

function getVendorHoursForCurrentTime(
  hours: VendorHourWindow[] | null | undefined,
  now = new Date(),
): {
  todayHours: VendorHourWindow | undefined;
  previousHours: VendorHourWindow | undefined;
  isOpenViaPreviousOvernight: boolean;
} {
  if (!hours?.length) {
    return {
      todayHours: undefined,
      previousHours: undefined,
      isOpenViaPreviousOvernight: false,
    };
  }

  const { dayOfWeek, minuteOfDay } = getDayAndMinuteInAbuja(now);
  const previousDay = (dayOfWeek + 6) % 7;
  const todayHours = hours.find((entry) => entry.day_of_week === dayOfWeek);
  const previousHours = hours.find((entry) => entry.day_of_week === previousDay);

  return {
    todayHours,
    previousHours,
    isOpenViaPreviousOvernight: isWindowOpenAtMinute(
      previousHours,
      minuteOfDay,
      true,
    ),
  };
}

function isWindowOpenAtMinute(
  hours: VendorHourWindow | undefined,
  minuteOfDay: number,
  checkPreviousOvernight: boolean,
): boolean {
  if (!hours || hours.is_closed) return false;

  const open = parseTimeToMinutes(hours.open_time);
  const close = parseTimeToMinutes(hours.close_time);

  if (open === null || close === null) return false;

  if (open <= close) {
    return !checkPreviousOvernight && minuteOfDay >= open && minuteOfDay < close;
  }

  return checkPreviousOvernight ? minuteOfDay < close : minuteOfDay >= open;
}

export function isVendorOpenNow(
  hours: VendorHourWindow[] | null | undefined,
  override: boolean | null,
  now = new Date(),
): boolean {
  if (override !== null) return override;
  if (!hours?.length) return false;

  const { minuteOfDay } = getDayAndMinuteInAbuja(now);
  const { todayHours, previousHours } = getVendorHoursForCurrentTime(hours, now);

  return (
    isWindowOpenAtMinute(todayHours, minuteOfDay, false) ||
    isWindowOpenAtMinute(previousHours, minuteOfDay, true)
  );
}

export function getEffectiveNearbyRadiusKm(
  radiusKm: number | undefined,
): number {
  return radiusKm ?? DEFAULT_NEARBY_RADIUS_KM;
}

export function getNearbyBoundingBox(query: ResolvedNearbyVendorsQuery): BoundingBox {
  return getBoundingBox(
    { lat: query.lat, lng: query.lng },
    getEffectiveNearbyRadiusKm(query.radius_km),
  );
}

function matchesSearch(vendor: VendorLocationRecord, search: string): boolean {
  const normalizedSearch = search.toLowerCase();

  return [vendor.name, vendor.short_description, vendor.area]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalizedSearch));
}

function matchesCategory(vendor: VendorLocationRecord, category: string): boolean {
  return (
    vendor.vendor_category_map?.some(
      (mapping) => mapping.vendor_categories?.slug === category,
    ) ?? false
  );
}

function getFeaturedDishSummary(
  vendor: VendorLocationRecord,
): NearbyVendorFeaturedDishSummary | null {
  const featuredDish =
    vendor.vendor_featured_dishes?.find((dish) => dish.is_featured) ??
    vendor.vendor_featured_dishes?.[0];

  if (!featuredDish) return null;

  return {
    dish_name: featuredDish.dish_name,
    description: featuredDish.description,
  };
}

export function getTodayHoursSummary(
  hours: VendorHourWindow[] | null | undefined,
  now = new Date(),
  override: boolean | null = null,
): string {
  if (!hours?.length) {
    return "Hours not listed";
  }

  const {
    todayHours,
    previousHours,
    isOpenViaPreviousOvernight,
  } = getVendorHoursForCurrentTime(hours, now);

  if (isOpenViaPreviousOvernight && previousHours) {
    return formatTodayHoursLabel(
      previousHours.open_time,
      previousHours.close_time,
      previousHours.is_closed,
    );
  }

  if (!todayHours) {
    return "Hours not listed";
  }

  const todayLabel = formatTodayHoursLabel(
    todayHours.open_time,
    todayHours.close_time,
    todayHours.is_closed,
  );

  if (override === true && todayLabel === "Closed") {
    return "Open now";
  }

  return todayLabel;
}

export function getVendorAvailabilitySnapshot(
  hours: VendorHourWindow[] | null | undefined,
  override: boolean | null,
  now = new Date(),
): VendorAvailabilitySnapshot {
  return {
    isOpenNow: isVendorOpenNow(hours, override, now),
    todayHours: getTodayHoursSummary(hours, now, override),
  };
}

export function findNearbyVendors(
  vendors: VendorLocationRecord[],
  query: ResolvedNearbyVendorsQuery,
  now = new Date(),
  usageScores: VendorUsageScoreMap = new Map(),
): NearbyVendorResult[] {
  const userLocation: Coordinates = {
    lat: query.lat,
    lng: query.lng,
  };
  const radiusKm = getEffectiveNearbyRadiusKm(query.radius_km);
  const results: NearbyVendorSortable[] = [];

  for (const vendor of vendors) {
    if (vendor.latitude === null || vendor.longitude === null) {
      continue;
    }
    if (query.price_band && vendor.price_band !== query.price_band) {
      continue;
    }
    if (query.search && !matchesSearch(vendor, query.search)) {
      continue;
    }
    if (query.category && !matchesCategory(vendor, query.category)) {
      continue;
    }

    const rawDistanceKm = calculateDistanceKm(userLocation, {
      lat: vendor.latitude,
      lng: vendor.longitude,
    });

    if (rawDistanceKm > radiusKm) {
      continue;
    }

    const availability = getVendorAvailabilitySnapshot(
      vendor.vendor_hours,
      vendor.is_open_override,
      now,
    );

    if (query.open_now === true && !availability.isOpenNow) {
      continue;
    }

    const result: NearbyVendorSortable = {
      vendor_id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      short_description: vendor.short_description,
      phone_number: vendor.phone_number,
      area: vendor.area,
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      price_band: vendor.price_band,
      average_rating: vendor.average_rating,
      review_count: vendor.review_count,
      ranking_score: Math.max(0, Math.trunc(usageScores.get(vendor.id) ?? 0)),
      distance_km: roundDistanceKm(rawDistanceKm),
      is_open_now: availability.isOpenNow,
      featured_dish: getFeaturedDishSummary(vendor),
      today_hours: availability.todayHours,
      rawDistanceKm,
      searchScore: 0,
    };

    result.searchScore = getVendorSearchRelevance(result, query.search ?? "");
    results.push(result);
  }

  results.sort((left, right) => {
    if (left.is_open_now !== right.is_open_now) {
      return left.is_open_now ? -1 : 1;
    }
    if (left.searchScore !== right.searchScore) {
      return right.searchScore - left.searchScore;
    }
    if (left.ranking_score !== right.ranking_score) {
      return right.ranking_score - left.ranking_score;
    }
    if (left.rawDistanceKm !== right.rawDistanceKm) {
      return left.rawDistanceKm - right.rawDistanceKm;
    }
    return left.name.localeCompare(right.name);
  });

  return results
    .slice(0, MAX_NEARBY_VENDOR_RESULTS)
    .map(({ rawDistanceKm, searchScore, ...vendor }) => {
      void rawDistanceKm;
      void searchScore;
      return vendor;
    });
}

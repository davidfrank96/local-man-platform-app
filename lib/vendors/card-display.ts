import type { NearbyVendorsResponseData } from "../../types/index.ts";
import { ABUJA_TIME_ZONE, resolveVendorOpenState } from "./hours.ts";
import { formatVendorHoursRange } from "./time-display.ts";

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

export function getVendorCue(
  vendor: Pick<NearbyVendor, "featured_dish" | "short_description">,
): string | null {
  return vendor.featured_dish?.dish_name ?? vendor.short_description;
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

export type VendorOpenStateDisplay = {
  label: string;
  toneClassName: string;
};

export function getVendorOpenStateDisplay(
  isOpenNow: boolean | null | undefined,
): VendorOpenStateDisplay {
  if (isOpenNow === true) {
    return {
      label: "Open",
      toneClassName: "vendor-card-status-open",
    };
  }

  if (isOpenNow === false) {
    return {
      label: "Closed",
      toneClassName: "vendor-card-status-closed",
    };
  }

  return {
    label: "Status unavailable",
    toneClassName: "vendor-card-status-unavailable",
  };
}

export function getVendorCurrentStatusDisplay(
  isOpenNow: boolean | null | undefined,
): VendorOpenStateDisplay {
  return getVendorOpenStateDisplay(isOpenNow);
}

type HoursSourceRecord = Record<string, unknown>;

function isRecord(value: unknown): value is HoursSourceRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeActiveHoursText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();

  if (
    lower === "closed" ||
    lower === "hours unavailable" ||
    lower === "hours not listed" ||
    lower === "hours not set" ||
    lower === "unavailable" ||
    lower === "not listed"
  ) {
    return null;
  }

  return normalized;
}

function getStringField(record: HoursSourceRecord, key: string): string | null {
  return typeof record[key] === "string" ? record[key] : null;
}

function getHoursRangeFromFields(
  record: HoursSourceRecord,
  openKey: string,
  closeKey: string,
): string | null {
  const openTime = getStringField(record, openKey);
  const closeTime = getStringField(record, closeKey);

  if (!openTime || !closeTime) {
    return null;
  }

  return formatVendorHoursRange(openTime, closeTime);
}

function getCurrentAbujaDay(now: Date): {
  dayOfWeek: number;
  shortName: string;
  longName: string;
} {
  const shortName = new Intl.DateTimeFormat("en-US", {
    timeZone: ABUJA_TIME_ZONE,
    weekday: "short",
  }).format(now).toLowerCase();
  const longName = new Intl.DateTimeFormat("en-US", {
    timeZone: ABUJA_TIME_ZONE,
    weekday: "long",
  }).format(now).toLowerCase();

  return {
    dayOfWeek: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(shortName),
    shortName,
    longName,
  };
}

function matchesCurrentDay(record: HoursSourceRecord, now: Date): boolean {
  const { dayOfWeek, shortName, longName } = getCurrentAbujaDay(now);
  const dayValue = record.day_of_week ?? record.dayOfWeek ?? record.day ?? record.weekday;

  if (typeof dayValue === "number") {
    return dayValue === dayOfWeek;
  }

  if (typeof dayValue === "string") {
    const normalized = dayValue.trim().toLowerCase();

    return normalized === String(dayOfWeek) || normalized === shortName || normalized === longName;
  }

  return false;
}

function getRangeFromScheduleEntry(value: unknown): string | null {
  if (typeof value === "string") {
    return normalizeActiveHoursText(value);
  }

  if (!isRecord(value)) {
    return null;
  }

  const range = getHoursRangeFromFields(value, "open_time", "close_time") ??
    getHoursRangeFromFields(value, "opening_time", "closing_time") ??
    getHoursRangeFromFields(value, "openTime", "closeTime") ??
    getHoursRangeFromFields(value, "openingTime", "closingTime") ??
    normalizeActiveHoursText(value.active_hours) ??
    normalizeActiveHoursText(value.activeHours) ??
    normalizeActiveHoursText(value.operating_hours) ??
    normalizeActiveHoursText(value.operatingHours) ??
    normalizeActiveHoursText(value.opening_hours) ??
    normalizeActiveHoursText(value.openingHours) ??
    normalizeActiveHoursText(value.business_hours) ??
    normalizeActiveHoursText(value.businessHours) ??
    normalizeActiveHoursText(value.hours);

  if (range) {
    return range;
  }

  return value.is_closed === true || value.isClosed === true ? "Closed today" : null;
}

function getRangeFromWeeklySource(value: unknown, now: Date): string | null {
  if (Array.isArray(value)) {
    const todayEntry = value.find((entry) => isRecord(entry) && matchesCurrentDay(entry, now));

    return getRangeFromScheduleEntry(todayEntry);
  }

  if (!isRecord(value)) {
    return null;
  }

  const { dayOfWeek, shortName, longName } = getCurrentAbujaDay(now);
  const todayValue =
    value[String(dayOfWeek)] ??
    value[shortName] ??
    value[longName] ??
    value.today;

  return getRangeFromScheduleEntry(todayValue);
}

export function getVendorActiveHoursLabel(
  source: unknown,
  now = new Date(),
): string {
  if (typeof source === "string") {
    return normalizeActiveHoursText(source) ?? "Hours not listed";
  }

  if (!isRecord(source)) {
    return "Hours not listed";
  }

  const metadata = isRecord(source.metadata) ? source.metadata : null;
  const resolved =
    getHoursRangeFromFields(source, "open_time", "close_time") ??
    getHoursRangeFromFields(source, "opening_time", "closing_time") ??
    getHoursRangeFromFields(source, "openTime", "closeTime") ??
    getHoursRangeFromFields(source, "openingTime", "closingTime") ??
    normalizeActiveHoursText(source.active_hours) ??
    normalizeActiveHoursText(source.activeHours) ??
    normalizeActiveHoursText(source.operating_hours) ??
    normalizeActiveHoursText(source.operatingHours) ??
    normalizeActiveHoursText(source.opening_hours) ??
    normalizeActiveHoursText(source.openingHours) ??
    normalizeActiveHoursText(source.business_hours) ??
    normalizeActiveHoursText(source.businessHours) ??
    normalizeActiveHoursText(source.hours) ??
    getRangeFromWeeklySource(source.hours, now) ??
    getRangeFromWeeklySource(source.vendor_hours, now) ??
    getRangeFromWeeklySource(source.vendorHours, now) ??
    getRangeFromWeeklySource(source.weekly_hours, now) ??
    getRangeFromWeeklySource(source.weeklyHours, now) ??
    getRangeFromWeeklySource(source.schedule, now) ??
    normalizeActiveHoursText(source.today_hours) ??
    normalizeActiveHoursText(source.todayHours) ??
    (metadata
      ? normalizeActiveHoursText(metadata.hours) ??
        normalizeActiveHoursText(metadata.operating_hours) ??
        normalizeActiveHoursText(metadata.operatingHours) ??
        getRangeFromWeeklySource(metadata.hours, now) ??
        getRangeFromWeeklySource(metadata.operating_hours, now) ??
        getRangeFromWeeklySource(metadata.operatingHours, now)
      : null);

  return resolved ?? "Hours not listed";
}

export function getVendorOpenStateDisplayFromSnapshot(input: {
  isOpenNow: boolean | null | undefined;
  todayHours: string | null | undefined;
  now?: Date;
}): VendorOpenStateDisplay {
  return getVendorOpenStateDisplay(
    resolveVendorOpenState({
      isOpenNow: input.isOpenNow,
      todayHours: input.todayHours,
      now: input.now,
    }),
  );
}

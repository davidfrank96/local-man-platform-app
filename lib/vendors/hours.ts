import { formatTodayHoursLabel } from "./time-display.ts";

export const ABUJA_TIME_ZONE = "Africa/Lagos";

export type VendorHourWindow = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

export type VendorAvailabilitySnapshot = {
  isOpenNow: boolean;
  todayHours: string;
};

type VendorOpenStateResolutionInput = {
  hours?: VendorHourWindow[] | null | undefined;
  override?: boolean | null | undefined;
  isOpenNow?: boolean | null | undefined;
  todayHours?: string | null | undefined;
  now?: Date;
};

function parseTimeToMinutes(time: string | null): number | null {
  if (!time) return null;

  const [hours, minutes] = time.split(":").map(Number);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function parseDisplayTimeToMinutes(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);

  if (!match) {
    return null;
  }

  const [, rawHours, rawMinutes, rawPeriod] = match;
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 1 ||
    hours > 12 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const normalizedHours = hours % 12;

  return (rawPeriod.toUpperCase() === "PM" ? normalizedHours + 12 : normalizedHours) * 60 +
    minutes;
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

function inferOpenStateFromTodayHours(
  todayHours: string | null | undefined,
  now = new Date(),
): boolean | null {
  const normalized = todayHours?.trim();

  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();

  if (lower === "open now") {
    return true;
  }

  if (lower === "closed") {
    return false;
  }

  if (
    lower === "hours not listed" ||
    lower === "hours unavailable" ||
    lower === "hours not set"
  ) {
    return null;
  }

  const rangeMatch = normalized.match(/^(.+?)\s*-\s*(.+)$/);

  if (!rangeMatch) {
    return null;
  }

  const open = parseDisplayTimeToMinutes(rangeMatch[1] ?? "");
  const close = parseDisplayTimeToMinutes(rangeMatch[2] ?? "");

  if (open === null || close === null) {
    return null;
  }

  const { minuteOfDay } = getDayAndMinuteInAbuja(now);

  if (open <= close) {
    return minuteOfDay >= open && minuteOfDay < close;
  }

  return minuteOfDay >= open || minuteOfDay < close;
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

export function resolveVendorOpenState({
  hours,
  override = null,
  isOpenNow = null,
  todayHours = null,
  now = new Date(),
}: VendorOpenStateResolutionInput): boolean | null {
  if (override !== null || (hours?.length ?? 0) > 0) {
    return isVendorOpenNow(hours, override, now);
  }

  // Prefer the visible hours window over a potentially stale cached boolean so
  // the public badge and the displayed active-hours line cannot contradict each other.
  const inferredOpenState = inferOpenStateFromTodayHours(todayHours, now);

  if (inferredOpenState !== null) {
    return inferredOpenState;
  }

  return typeof isOpenNow === "boolean" ? isOpenNow : null;
}

import { ABUJA_TIME_ZONE } from "../vendors/hours.ts";

export type RiderAvailabilityWindow = {
  weekday_available_from?: string | null;
  weekday_available_until?: string | null;
  weekend_available_from?: string | null;
  weekend_available_until?: string | null;
};

type DayKind = "weekday" | "weekend";

const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) {
    return null;
  }

  const [rawHours, rawMinutes] = time.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function getDayKind(dayOfWeek: number): DayKind {
  return dayOfWeek === 0 || dayOfWeek === 6 ? "weekend" : "weekday";
}

function getDayAndMinute(date: Date, timeZone: string): {
  dayOfWeek: number;
  minuteOfDay: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  return {
    dayOfWeek: weekdayNames.indexOf(weekday as typeof weekdayNames[number]),
    minuteOfDay: hour * 60 + minute,
  };
}

function getRangeForDayKind(
  availability: RiderAvailabilityWindow,
  dayKind: DayKind,
): {
  from: string | null | undefined;
  until: string | null | undefined;
} {
  return dayKind === "weekday"
    ? {
        from: availability.weekday_available_from,
        until: availability.weekday_available_until,
      }
    : {
        from: availability.weekend_available_from,
        until: availability.weekend_available_until,
      };
}

function isCurrentDayWindowOpen(
  from: number,
  until: number,
  minuteOfDay: number,
): boolean {
  if (from === until) {
    return true;
  }

  if (from < until) {
    return minuteOfDay >= from && minuteOfDay < until;
  }

  return minuteOfDay >= from;
}

function isPreviousOvernightWindowOpen(
  from: number,
  until: number,
  minuteOfDay: number,
): boolean {
  return from > until && minuteOfDay < until;
}

export function isRiderAvailableNow(
  availability: RiderAvailabilityWindow,
  now = new Date(),
  timeZone = ABUJA_TIME_ZONE,
): boolean {
  const { dayOfWeek, minuteOfDay } = getDayAndMinute(now, timeZone);

  if (dayOfWeek < 0) {
    return false;
  }

  const currentRange = getRangeForDayKind(availability, getDayKind(dayOfWeek));
  const currentFrom = parseTimeToMinutes(currentRange.from);
  const currentUntil = parseTimeToMinutes(currentRange.until);

  if (
    currentFrom !== null &&
    currentUntil !== null &&
    isCurrentDayWindowOpen(currentFrom, currentUntil, minuteOfDay)
  ) {
    return true;
  }

  const previousDayOfWeek = (dayOfWeek + 6) % 7;
  const previousRange = getRangeForDayKind(availability, getDayKind(previousDayOfWeek));
  const previousFrom = parseTimeToMinutes(previousRange.from);
  const previousUntil = parseTimeToMinutes(previousRange.until);

  return previousFrom !== null &&
    previousUntil !== null &&
    isPreviousOvernightWindowOpen(previousFrom, previousUntil, minuteOfDay);
}

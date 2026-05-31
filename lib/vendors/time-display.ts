export function formatVendorDisplayTime(time: string | null): string {
  if (!time) return "";

  const [rawHours, rawMinutes] = time.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return time;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  const normalizedMinutes = String(minutes).padStart(2, "0");

  return `${normalizedHours}:${normalizedMinutes} ${period}`;
}

export function formatVendorHoursRange(
  openTime: string | null,
  closeTime: string | null,
): string {
  return `${formatVendorDisplayTime(openTime)} - ${formatVendorDisplayTime(closeTime)}`;
}

export function formatTodayHoursLabel(
  openTime: string | null,
  closeTime: string | null,
  isClosed: boolean,
): string {
  if (openTime && closeTime) {
    return formatVendorHoursRange(openTime, closeTime);
  }

  if (isClosed) {
    return "Closed today";
  }

  return "Hours not listed";
}

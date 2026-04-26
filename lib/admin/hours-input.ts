export function parseStoredTimeForAdmin(
  time: string | null,
): string {
  if (!time) {
    return "";
  }

  const match = time.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);

  if (!match) {
    return "";
  }

  const hour24 = Number(match[1]);
  const minute = match[2];
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${minute} ${meridiem}`;
}

export function parseAdminTimeInputTo24Hour(
  input: string,
): string | null {
  const normalizedInput = input.trim().toUpperCase();

  if (!normalizedInput) {
    return null;
  }

  const match = normalizedInput.match(/^([1-9]|1[0-2])(?::([0-5]\d))?\s*([AP]M)$/);

  if (!match) {
    throw new Error("Use format like 9 AM or 8:30 PM.");
  }

  const hour = Number(match[1]);
  const minute = match[2] ?? "00";
  const meridiemText = match[3];

  const hour24 =
    meridiemText === "AM"
      ? hour === 12
        ? 0
        : hour
      : hour === 12
        ? 12
        : hour + 12;

  return `${String(hour24).padStart(2, "0")}:${minute}`;
}

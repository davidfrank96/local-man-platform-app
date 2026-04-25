export type PublicTimeTheme = "morning" | "afternoon" | "night";

export function getPublicTimeTheme(date: Date): PublicTimeTheme {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return "morning";
  }

  if (hour >= 12 && hour < 18) {
    return "afternoon";
  }

  return "night";
}

export function getMillisecondsUntilNextPublicTimeTheme(date: Date): number {
  const next = new Date(date);
  const hour = date.getHours();

  if (hour < 5) {
    next.setHours(5, 0, 0, 0);
  } else if (hour < 12) {
    next.setHours(12, 0, 0, 0);
  } else if (hour < 18) {
    next.setHours(18, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(5, 0, 0, 0);
  }

  return Math.max(1, next.getTime() - date.getTime());
}

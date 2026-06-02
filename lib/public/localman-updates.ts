export type LocalmanUpdatePriority = "info" | "guidance" | "safety";

export type LocalmanUpdate = {
  id: string;
  title: string;
  body: string;
  priority: LocalmanUpdatePriority;
  active: boolean;
  publishDate: string;
};

export const LOCALMAN_UPDATES: LocalmanUpdate[] = [
  {
    id: "welcome-to-localman",
    title: "Welcome to Localman",
    body: "Localman helps you discover useful food vendors around you and open their details when you need more information.",
    priority: "info",
    active: true,
    publishDate: "2026-06-01",
  },
  {
    id: "discover-local-empower-local",
    title: "Discover Local. Empower Local.",
    body: "Every search helps bring more visibility to nearby vendors, small businesses, and informal local food spots.",
    priority: "info",
    active: true,
    publishDate: "2026-06-01",
  },
  {
    id: "rider-connect-guidance",
    title: "Rider Connect guidance",
    body: "When you request a rider, complete your details first, choose an available rider, then coordinate directly through WhatsApp.",
    priority: "guidance",
    active: true,
    publishDate: "2026-06-01",
  },
  {
    id: "safety-reminder",
    title: "Safety reminder",
    body: "Confirm vendor details, prices, delivery plans, and rider identity directly before completing any order or handoff.",
    priority: "safety",
    active: true,
    publishDate: "2026-06-01",
  },
  {
    id: "vendor-discovery-tip",
    title: "Vendor discovery tip",
    body: "Use search, filters, radius, and map view together when you want a tighter list of nearby vendors.",
    priority: "guidance",
    active: true,
    publishDate: "2026-06-01",
  },
];

export function getActiveLocalmanUpdates(
  updates: readonly LocalmanUpdate[] = LOCALMAN_UPDATES,
): LocalmanUpdate[] {
  return updates.filter((update) => update.active);
}

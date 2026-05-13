import { expect, type BrowserContext, type Locator, type Page } from "@playwright/test";

import type { NearbyVendorsResponseData } from "../../../types/index.ts";
import { PUBLIC_DISCOVERY_CACHE_VERSION } from "../../../lib/public/discovery-cache-hygiene.ts";

type NearbyVendor = NearbyVendorsResponseData["vendors"][number];
export type MockNearbyVendor = Omit<NearbyVendor, "ranking_score"> & {
  ranking_score?: number;
};

export function trackClientErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  return errors;
}

export async function expectNoClientErrors(errors: string[]) {
  expect(errors, errors.join("\n")).toEqual([]);
}

export async function openDiscoveryFilters(page: Page) {
  const visibleRadiusSelect = page.locator('select[name="radiusKm"]:visible');
  if ((await visibleRadiusSelect.count()) > 0) {
    return;
  }

  const openToggle = page.locator('button[aria-label="Open filters"]:visible').first();
  if ((await openToggle.count()) > 0) {
    await openToggle.click();
    return;
  }

  const closeToggle = page.locator('button[aria-label="Close filters"]:visible').first();
  if ((await closeToggle.count()) > 0) {
    return;
  }

  throw new Error("Discovery filters are not reachable in the current viewport state.");
}

export function uuid(index: number): string {
  return `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`;
}

export function createMockNearbyVendor(
  index: number,
  overrides: Partial<MockNearbyVendor> = {},
): NearbyVendor {
  return {
    vendor_id: uuid(index + 1),
    name: `Vendor ${index + 1}`,
    slug: `vendor-${index + 1}`,
    short_description: "Local food vendor",
    phone_number: "+2348000000000",
    area: "Abuja",
    latitude: 9.08 + index * 0.001,
    longitude: 7.4 + index * 0.001,
    price_band: "standard",
    average_rating: 4.5,
    review_count: 24,
    ranking_score: 0,
    distance_km: Number((0.12 + index * 0.08).toFixed(2)),
    is_open_now: index % 2 === 0,
    featured_dish: {
      dish_name: `Dish ${index + 1}`,
      description: null,
    },
    today_hours: "9:00 AM - 6:00 PM",
    ...overrides,
  };
}

export async function primePublicLocation(page: Page) {
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 9.08, longitude: 7.4 });
}

export async function mockNearbyDiscovery(page: Page, vendors: MockNearbyVendor[]) {
  await page.route("**/api/vendors/nearby**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          location: {
            source: "precise",
            label: "Current location",
            coordinates: {
              lat: 9.08,
              lng: 7.4,
            },
            isApproximate: false,
          },
          vendors: vendors.map((vendor) => ({
            ranking_score: 0,
            ...vendor,
          })),
        },
        error: null,
      }),
    });
  });
}

export async function mockReverseGeocode(
  page: Page,
  label: string | null,
  status = 200,
) {
  await page.route("**/api/location/reverse**", async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          label,
        },
        error: null,
      }),
    });
  });
}

export async function setMockClientTime(page: Page, isoString: string) {
  const timestamp = new Date(isoString).valueOf();

  await page.addInitScript(({ now }) => {
    const RealDate = Date;

    class MockDate extends RealDate {
      constructor(...args: unknown[]) {
        switch (args.length) {
          case 0:
            super(now);
            return;
          case 1:
            super(args[0] as string | number | Date);
            return;
          case 2:
            super(args[0] as number, args[1] as number);
            return;
          case 3:
            super(args[0] as number, args[1] as number, args[2] as number);
            return;
          case 4:
            super(args[0] as number, args[1] as number, args[2] as number, args[3] as number);
            return;
          case 5:
            super(
              args[0] as number,
              args[1] as number,
              args[2] as number,
              args[3] as number,
              args[4] as number,
            );
            return;
          case 6:
            super(
              args[0] as number,
              args[1] as number,
              args[2] as number,
              args[3] as number,
              args[4] as number,
              args[5] as number,
            );
            return;
          default:
            super(
              args[0] as number,
              args[1] as number,
              args[2] as number,
              args[3] as number,
              args[4] as number,
              args[5] as number,
              args[6] as number,
            );
        }
      }

      static now() {
        return now;
      }

      static parse(value: string) {
        return RealDate.parse(value);
      }

      static UTC(...args: Parameters<typeof Date.UTC>) {
        return RealDate.UTC(...args);
      }
    }

    Object.setPrototypeOf(MockDate, RealDate);
    // @ts-expect-error browser test override for deterministic time
    globalThis.Date = MockDate;
  }, { now: timestamp });
}

export async function installLocalmanBrowserStateIsolation(
  context: BrowserContext,
) {
  await context.clearCookies();
  await context.addInitScript(() => {
    const clearMatchingKeys = (storage: Storage, prefixes: string[]) => {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);

        if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
          storage.removeItem(key);
        }
      }
    };

    try {
      clearMatchingKeys(window.sessionStorage, [
        "public-discovery:",
        "public-tracking-",
      ]);
    } catch {
      // Ignore browser sessionStorage failures in test isolation.
    }

    try {
      clearMatchingKeys(window.localStorage, [
        "public-discovery-offline:",
        "public-discovery:vendors:invalidation",
        "public-recently-viewed-vendors",
        "public-last-selected-vendor",
      ]);
    } catch {
      // Ignore browser localStorage failures in test isolation.
    }
  });
}

export async function seedPublicDiscoverySnapshot(
  context: BrowserContext,
  options: {
    key?: string;
    snapshot: Record<string, unknown>;
    invalidationPayload?: Record<string, unknown> | null;
    recentlyViewed?: Record<string, unknown>[] | null;
    lastSelected?: Record<string, unknown> | null;
  },
) {
  await context.addInitScript((payload) => {
    try {
      window.sessionStorage.setItem(
        payload.key,
        JSON.stringify({
          ...payload.snapshot,
          cacheVersion: payload.cacheVersion,
          cacheEnvironment: window.location.origin,
        }),
      );
    } catch {
      // Ignore storage failures in browser tests.
    }

    try {
      if (payload.invalidationPayload) {
        window.localStorage.setItem(
          "public-discovery:vendors:invalidation",
          JSON.stringify(payload.invalidationPayload),
        );
      }

      if (payload.recentlyViewed) {
        window.localStorage.setItem(
          "public-recently-viewed-vendors",
          JSON.stringify(payload.recentlyViewed),
        );
      }

      if (payload.lastSelected) {
        window.localStorage.setItem(
          "public-last-selected-vendor",
          JSON.stringify(payload.lastSelected),
        );
      }
    } catch {
      // Ignore storage failures in browser tests.
    }
  }, {
    key: options.key ?? "public-discovery:/",
    snapshot: options.snapshot,
    cacheVersion: PUBLIC_DISCOVERY_CACHE_VERSION,
    invalidationPayload: options.invalidationPayload ?? null,
    recentlyViewed: options.recentlyViewed ?? null,
    lastSelected: options.lastSelected ?? null,
  });
}

export async function topPosition(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  return box!.y;
}

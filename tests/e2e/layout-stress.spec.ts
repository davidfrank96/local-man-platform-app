import { expect, test, type Page } from "@playwright/test";

import type { NearbyVendorsResponseData } from "../../types/index.ts";

type NearbyVendor = NearbyVendorsResponseData["vendors"][number];
type MockNearbyVendor = Omit<NearbyVendor, "ranking_score"> & {
  ranking_score?: number;
};

function trackClientErrors(page: Page): string[] {
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

async function expectNoClientErrors(errors: string[]) {
  expect(errors, errors.join("\n")).toEqual([]);
}

async function openDiscoveryFilters(page: Page) {
  const toggle = page.locator('button[aria-label="Open filters"]:visible').first();
  await toggle.click();
}

function uuid(index: number): string {
  return `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`;
}

function createVendor(index: number, overrides: Partial<MockNearbyVendor> = {}): NearbyVendor {
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

function longText(prefix: string, length: number): string {
  return `${prefix}${"X".repeat(length)}`;
}

async function mockDiscovery(page: Page, options: {
  vendors: NearbyVendor[];
  categories?: Array<{ id: string; name: string; slug: string }>;
  nearbyStatus?: number;
  nearbySuccess?: boolean;
  nearbyDelayMs?: number;
  locationLabel?: string;
  locationSource?: "precise" | "approximate" | "default_city";
}): Promise<void> {
  const {
    vendors,
    categories = [
      { id: uuid(9001), name: "Breakfast", slug: "breakfast" },
      { id: uuid(9002), name: "Lunch", slug: "lunch" },
    ],
    nearbyStatus = 200,
    nearbySuccess = true,
    nearbyDelayMs = 0,
    locationLabel = "Current location",
    locationSource = "precise",
  } = options;

  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 9.08, longitude: 7.4 });

  await page.route("**/api/categories", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { categories },
        error: null,
      }),
    });
  });

  await page.route("**/api/vendors/nearby**", async (route) => {
    if (nearbyDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, nearbyDelayMs));
    }

    if (!nearbySuccess) {
      await route.fulfill({
        status: nearbyStatus,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          data: null,
          error: {
            code: "UPSTREAM_ERROR",
            message: "Unable to fetch nearby vendors.",
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          location: {
            source: locationSource,
            label: locationLabel,
            coordinates: { lat: 9.08, lng: 7.4 },
            isApproximate: locationSource !== "precise",
          },
          vendors,
        },
        error: null,
      }),
    });
  });
}

test.describe("Layout stress", () => {
  test("320px long content stays within bounds", async ({ page }) => {
    const errors = trackClientErrors(page);

    const vendors = Array.from({ length: 12 }, (_, index) =>
      createVendor(index, {
        name: longText("ULTRALONGVENDORNAMEWITHOUTSPACES_", 140),
        short_description: longText("Y", 240),
        area: longText("EXTREMELY_LONG_AREA_", 120),
        featured_dish: {
          dish_name: longText("ULTRALONGDISHWITHOUTSPACES_", 120),
          description: null,
        },
      }),
    );

    const categories = [
      { id: uuid(9001), name: longText("CATEGORY WITH A VERY LONG LABEL ", 100), slug: "category-1" },
    ];

    await mockDiscovery(page, { vendors, categories });
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/");

    await expect(page.locator(".vendor-card").first()).toBeVisible();
    await expect(page.locator(".vendor-card .vendor-card-footer").first()).toBeVisible();
    await expect(page.locator(".vendor-card h3").first()).toBeVisible();
    await expect(page.locator(".vendor-card .vendor-card-rating").first()).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await page.goto("/search?q=rice");
    await expect(page.getByRole("heading", { name: "Search local food" })).toBeVisible();
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    const searchOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(searchOverflow).toBe(false);

    await expectNoClientErrors(errors);
  });

  test("dense results and rapid interactions stay stable", async ({ page }) => {
    const errors = trackClientErrors(page);

    const vendors = Array.from({ length: 30 }, (_, index) =>
      createVendor(index, {
        name: `Vendor ${index + 1} ${"N".repeat(index % 5 === 0 ? 80 : 18)}`,
        short_description: index % 3 === 0 ? null : `Description ${index + 1}`,
        area: index % 4 === 0 ? null : `Area ${index + 1}`,
        featured_dish:
          index % 3 === 0
            ? null
            : {
                dish_name: `Dish ${index + 1}`,
                description: null,
              },
      }),
    );

    await mockDiscovery(page, { vendors });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.locator(".vendor-card")).toHaveCount(30);

    let expectedSelectedVendorName = "";

    for (const index of [0, 4, 9, 14, 19]) {
      const card = page.locator(".vendor-card").nth(index);
      expectedSelectedVendorName =
        (await card.locator("h3").textContent())?.trim() ?? expectedSelectedVendorName;
      await card.getByRole("button", { name: /Preview .* on map/ }).click();
    }

    await expect(page.locator(".selected-vendor-panel h2")).toContainText(expectedSelectedVendorName);

    await page.getByRole("textbox", { name: "Search" }).fill("rice");
    await openDiscoveryFilters(page);
    let applyButton = page.locator('button:has-text("Apply"):visible');
    await applyButton.scrollIntoViewIfNeeded();
    await applyButton.click();
    await page.getByRole("textbox", { name: "Search" }).fill("spicy");
    await openDiscoveryFilters(page);
    applyButton = page.locator('button:has-text("Apply"):visible');
    await applyButton.scrollIntoViewIfNeeded();
    await applyButton.click();

    await page.goto("/search?q=rice");
    await expect(page.getByRole("heading", { name: "Search local food" })).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "The Local Man" })).toBeVisible();
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("loading, empty, and error states render cleanly", async ({ page }) => {
    const loadingErrors = trackClientErrors(page);

    const vendors = [createVendor(0)];

    await mockDiscovery(page, { vendors, nearbyDelayMs: 800 });
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/");

    await expect(page.getByText("Loading…")).toBeVisible();
    await expect(page.locator(".vendor-card").first()).toBeVisible();
    await expectNoClientErrors(loadingErrors);

    const emptyPage = await page.context().newPage();
    const emptyErrors = trackClientErrors(emptyPage);
    await mockDiscovery(emptyPage, { vendors: [] });
    await emptyPage.setViewportSize({ width: 320, height: 844 });
    await emptyPage.goto("/");
    await expect(emptyPage.getByText("No vendors matched this search.")).toBeVisible();
    await expectNoClientErrors(emptyErrors);
    await emptyPage.close();

    const errorPage = await page.context().newPage();
    const errorErrors = trackClientErrors(errorPage);
    await mockDiscovery(errorPage, { vendors: [], nearbySuccess: false });
    await errorPage.setViewportSize({ width: 320, height: 844 });
    await errorPage.goto("/");
    await expect(errorPage.locator(".runtime-error")).toBeVisible();
    await expectNoClientErrors(errorErrors);
    await errorPage.close();
  });

  test("partial data falls back cleanly", async ({ page }) => {
    const errors = trackClientErrors(page);

    const vendors = [
      createVendor(0, {
        name: longText("PARTIAL_VENDOR_NAME_", 80),
        short_description: "Local food vendor",
        area: null,
        phone_number: null,
        price_band: null,
        average_rating: 0,
        review_count: 0,
        featured_dish: null,
      }),
    ];

    await mockDiscovery(page, { vendors, locationSource: "approximate", locationLabel: "Approximate location" });
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/");

    await expect(page.locator(".vendor-card").first()).toBeVisible();
    await expect(page.locator(".vendor-card").first().getByText("Local food vendor")).toBeVisible();
    await expect(page.locator(".vendor-card").first().getByText("New")).toBeVisible();
    await expect(
      page.locator(".vendor-card").first().getByRole("button", { name: /Preview .* on map/ }),
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await expectNoClientErrors(errors);
  });
});

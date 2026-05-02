import { expect, test, type Locator, type Page } from "@playwright/test";

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

async function clickVendorOnMap(page: Page, vendorId: string) {
  await page.locator(`.discovery-map [data-vendor-id="${vendorId}"]`).click();
}

async function expectUniqueMapVendorMarkers(page: Page) {
  const mapMode = await page.locator(".discovery-map").getAttribute("data-map-mode");
  if (mapMode !== "maplibre") {
    return;
  }

  const vendorIds = await page
    .locator('.discovery-map[data-map-mode="maplibre"] .maplibre-vendor-marker[data-vendor-id]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-vendor-id") ?? ""),
    );

  const filteredIds = vendorIds.filter(Boolean);
  expect(filteredIds.length).toBeGreaterThan(0);
  expect(new Set(filteredIds).size).toBe(filteredIds.length);
}

async function readMapInteractionState(page: Page) {
  const mapMode = await page.locator(".discovery-map").getAttribute("data-map-mode");
  if (mapMode !== "maplibre") {
    return null;
  }

  return page.evaluate(() => window.__LOCAL_MAN_MAP_DEBUG__?.getInteractionState() ?? null);
}

async function readMapCameraState(page: Page) {
  const mapMode = await page.locator(".discovery-map").getAttribute("data-map-mode");
  if (mapMode !== "maplibre") {
    return null;
  }

  return page.evaluate(() => window.__LOCAL_MAN_MAP_DEBUG__?.getCameraState() ?? null);
}

async function topPosition(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  return box!.y;
}

function parseRgbChannels(value: string) {
  const match = value.match(/\d+(\.\d+)?/g) ?? [];

  return match.slice(0, 3).map((channel) => Number(channel));
}

async function mockNearbyDiscovery(page: Page, vendors: MockNearbyVendor[]) {
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

async function readVendorCardStateSnapshot(page: Page) {
  return page.locator(".vendor-card").evaluateAll((cards) =>
    cards.map((card) => {
      const name = card.querySelector("h3")?.textContent?.trim() ?? "";
      const statusLine = card.querySelector(".vendor-card-status-line")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const hoursLine = card.querySelector(".vendor-card-hours-line")?.textContent?.replace(/\s+/g, " ").trim() ?? "";

      return {
        name,
        statusLine,
        hoursLine,
      };
    }),
  );
}

type MockGeolocationMode =
  | { kind: "success"; lat: number; lng: number }
  | { kind: "error"; code: number; message: string };

async function primePublicLocation(page: Page) {
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 9.08, longitude: 7.4 });
}

async function installMockGeolocation(page: Page, initialMode: MockGeolocationMode) {
  await page.addInitScript(({ mode }) => {
    const state = { current: mode };

    Object.defineProperty(globalThis, "__codexGeoState", {
      configurable: true,
      value: state,
    });

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        clearWatch() {},
        getCurrentPosition(
          success: (position: { coords: { latitude: number; longitude: number } }) => void,
          error: (reason: { code: number; message: string }) => void,
        ) {
          const currentState = state.current;

          if (currentState.kind === "success") {
            success({
              coords: {
                latitude: currentState.lat,
                longitude: currentState.lng,
              },
            });
            return;
          }

          error({
            code: currentState.code,
            message: currentState.message,
          });
        },
        watchPosition() {
          return 0;
        },
      },
    });
  }, { mode: initialMode });
}

async function setMockGeolocationMode(page: Page, nextMode: MockGeolocationMode) {
  await page.evaluate(({ mode }) => {
    const state = globalThis as typeof globalThis & {
      __codexGeoState?: { current: MockGeolocationMode };
    };

    if (state.__codexGeoState) {
      state.__codexGeoState.current = mode;
    }
  }, { mode: nextMode });
}

async function setMockClientTime(page: Page, isoString: string) {
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
    // @ts-expect-error overriding Date for deterministic browser tests
    globalThis.Date = MockDate;
  }, { now: timestamp });
}

async function mockReverseGeocode(page: Page, label: string | null, status = 200) {
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

test.describe("Phase 3 browser smoke", () => {
  test("homepage loads, vendor cards render, and details are clickable", async ({ page }) => {
    const errors = trackClientErrors(page);

    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "The Local Man" })).toBeVisible();
    await expect(page.locator(".discovery-layout")).toBeVisible();
    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect(page.locator(".location-panel strong")).toHaveText("Using your current location");
    await expect(page.locator(".location-panel div > span").first()).toHaveText("Wuse II, Abuja");
    await expect(page.locator(".location-trust-line")).toHaveText("High accuracy");
    await expect(page.locator(".desktop-vendor-section-nav")).toBeVisible();
    await expect(
      page.locator(".desktop-vendor-section-nav").getByRole("button", { name: "Nearby" }),
    ).toBeVisible();
    await expect(
      page.locator(".desktop-vendor-section-nav").getByRole("button", { name: "Recent" }),
    ).toBeVisible();
    await expect(
      page.locator(".desktop-vendor-section-nav").getByRole("button", { name: "Popular" }),
    ).toBeVisible();
    await expect(
      page.locator(".desktop-vendor-section-nav").getByRole("button", { name: "Last selected" }),
    ).toBeVisible();
    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
    const firstCard = page.locator(".vendor-card").first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator(".vendor-card-cue")).toBeVisible();
    await expect(firstCard.locator(".vendor-card-rating")).toBeVisible();
    await expect(firstCard.locator(".vendor-card-hours-line")).toContainText("Active hours:");
    await expect(firstCard.getByText("Tap to preview on map")).toBeVisible();
    await expect(firstCard.getByRole("link", { name: "Call" })).toBeVisible();
    await expect(firstCard.getByRole("link", { name: "Directions" })).toBeVisible();
    await expect(firstCard.getByRole("link", { name: "View details →" })).toBeVisible();

    const vendorName = await firstCard.getByRole("heading", { level: 3 }).textContent();
    const vendorId = await firstCard.getAttribute("data-vendor-id");
    expect(vendorId).toBeTruthy();
    await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(firstCard).toHaveClass(/selected/);
    await expect(firstCard.locator(".vendor-card-hours-line")).toContainText("Active hours:");
    await expect(firstCard.locator(".vendor-card-status-line")).toContainText("km");
    await expect(firstCard.locator(".vendor-card-status-line")).toContainText(/Open|Closed/);
    await expect(page.locator(".selected-vendor-panel h2")).toContainText(vendorName ?? "");
    await expect(page.locator(".selected-vendor-panel").getByText(/^Active hours:/)).toBeVisible();
    await expect(page.locator(".selected-vendor-panel").getByRole("link", { name: "Call" })).toBeVisible();
    await expect(
      page.locator(".selected-vendor-panel").getByRole("link", { name: "Directions" }),
    ).toBeVisible();
    await expect(
      page.locator(".selected-vendor-panel").getByRole("link", { name: "View details" }),
    ).toBeVisible();

    const selectedCardStyles = await firstCard.evaluate((element) => {
      const styles = getComputedStyle(element);
      const title = element.querySelector("h3");
      const titleStyles = title ? getComputedStyle(title) : null;

      return {
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        boxShadow: styles.boxShadow,
        titleColor: titleStyles?.color ?? null,
      };
    });

    const [bgRed, bgGreen, bgBlue] = parseRgbChannels(selectedCardStyles.backgroundColor);
    const [titleRed, titleGreen, titleBlue] = parseRgbChannels(selectedCardStyles.titleColor ?? "");
    const backgroundAverage = (bgRed + bgGreen + bgBlue) / 3;
    const titleAverage = (titleRed + titleGreen + titleBlue) / 3;

    expect(backgroundAverage).toBeGreaterThan(225);
    expect(titleAverage).toBeLessThan(120);
    expect(selectedCardStyles.borderColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(selectedCardStyles.boxShadow).not.toBe("none");

    await expectUniqueMapVendorMarkers(page);

    await clickVendorOnMap(page, vendorId!);
    await expect(page.locator(".selected-vendor-panel h2")).toContainText(vendorName ?? "");
    await expect(page.locator(`.discovery-map [data-vendor-id="${vendorId}"].selected`)).toBeVisible();

    const mapLibreSurface = page.locator('.discovery-map[data-map-mode="maplibre"]');
    if (await mapLibreSurface.count()) {
      await expect(mapLibreSurface.locator(".maplibregl-ctrl-zoom-in")).toBeVisible();
      await expect(mapLibreSurface.locator(".maplibregl-ctrl-zoom-out")).toBeVisible();
      await expect(mapLibreSurface.locator(".maplibregl-ctrl-geolocate")).toBeVisible();
      await expect(mapLibreSurface.locator(".maplibre-vendor-marker")).toHaveCount(
        await page.locator(".vendor-card").count(),
      );
      await expect(mapLibreSurface.locator(".vendor-marker")).toHaveCount(0);
      const interactionState = await readMapInteractionState(page);
      expect(interactionState).not.toBeNull();
      expect(interactionState).toMatchObject({
        boxZoom: true,
        doubleClickZoom: true,
        dragPan: true,
        dragRotate: false,
        keyboard: true,
        scrollZoom: true,
        touchZoomRotate: true,
      });
    }

    await firstCard.getByRole("link", { name: "View details →" }).click();

    await expect(page).toHaveURL(/\/vendors\/[a-z0-9-]+(\?.*)?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Call" })).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("call and directions actions emit tracking events with vendor context across card, selected preview, and detail views", async ({ page }) => {
    const errors = trackClientErrors(page);
    const trackedBodies: Array<Record<string, unknown>> = [];

    await page.addInitScript(() => {
      (window as typeof window & {
        __LOCALMAN_SUPPRESS_ACTION_NAVIGATION__?: boolean;
      }).__LOCALMAN_SUPPRESS_ACTION_NAVIGATION__ = true;
    });

    await page.route("**/api/events", async (route) => {
      const rawBody = route.request().postData() ?? "";
      trackedBodies.push(JSON.parse(rawBody) as Record<string, unknown>);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            accepted: true,
          },
          error: null,
        }),
      });
    });

    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await page.goto("/");
    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);

    const firstCard = page.locator(".vendor-card").first();
    const vendorId = await firstCard.getAttribute("data-vendor-id");
    const detailHref = await firstCard.getByRole("link", { name: "View details →" }).getAttribute("href");
    expect(vendorId).toBeTruthy();
    expect(detailHref).toBeTruthy();
    const vendorSlug = detailHref?.split("/vendors/")[1]?.split("?")[0];
    expect(vendorSlug).toBeTruthy();

    await firstCard.getByRole("link", { name: "Call" }).click({ noWaitAfter: true });
    await firstCard.getByRole("link", { name: "Directions" }).click({ noWaitAfter: true });

    await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
    const selectedPanel = page.locator(".selected-vendor-panel");
    await expect(selectedPanel).toBeVisible();
    await selectedPanel.getByRole("link", { name: "Call" }).click({ noWaitAfter: true });
    await selectedPanel.getByRole("link", { name: "Directions" }).click({ noWaitAfter: true });

    await page.goto(detailHref!);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("link", { name: "Call" }).click({ noWaitAfter: true });
    await page.getByRole("link", { name: "Directions" }).click({ noWaitAfter: true });

    await expect.poll(
      () => trackedBodies.filter((body) =>
        body.event_type === "call_clicked" || body.event_type === "directions_clicked"
      ).length,
    ).toBeGreaterThanOrEqual(6);

    const actionEvents = trackedBodies.filter((body) =>
      body.event_type === "call_clicked" || body.event_type === "directions_clicked"
    );

    expect(actionEvents.length).toBeGreaterThanOrEqual(6);
    expect(actionEvents.some((body) => body.event_type === "call_clicked")).toBe(true);
    expect(actionEvents.some((body) => body.event_type === "directions_clicked")).toBe(true);
    expect(actionEvents.some((body) => (body.metadata as { source?: string } | undefined)?.source === "card")).toBe(true);
    expect(actionEvents.some((body) => (body.metadata as { source?: string } | undefined)?.source === "selected_preview")).toBe(true);
    expect(actionEvents.some((body) => (body.metadata as { source?: string } | undefined)?.source === "detail")).toBe(true);

    for (const body of actionEvents) {
      expect(body.vendor_id).toBe(vendorId);
      expect(body.vendor_slug).toBe(vendorSlug);
      expect(body.device_type === "mobile" || body.device_type === "tablet" || body.device_type === "desktop").toBe(true);
      expect(body.location_source).toBe("precise");
      expect(typeof body.timestamp).toBe("string");
      expect(typeof body.page_path).toBe("string");
    }

    await expectNoClientErrors(errors);
  });

  test("fallback map remains usable when the MapLibre style request fails", async ({ page }) => {
    let blockedStyleRequest = false;

    await primePublicLocation(page);
    await page.route("**/*", async (route) => {
      const requestUrl = route.request().url();
      if (
        requestUrl.includes("style.json") ||
        requestUrl.includes("tile.openstreetmap.org") ||
        requestUrl.includes("maptiler")
      ) {
        blockedStyleRequest = true;
        await route.abort();
        return;
      }

      await route.continue();
    });

    await page.goto("/");
    try {
      await expect.poll(async () => blockedStyleRequest).toBe(true);
      await expect(page.locator('.discovery-map[data-map-mode="fallback"]')).toBeVisible({
        timeout: 10_000,
      });
    } catch {
      await expect(page.locator('.discovery-map[data-map-mode="fallback"]')).toBeVisible();
    }
    await expect(page.getByText("Map view limited, vendors still available below.")).toBeVisible();
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    const fallbackMarker = page.locator('.discovery-map[data-map-mode="fallback"] button[aria-label^="Select "]').first();
    await expect(fallbackMarker).toBeVisible();
    await fallbackMarker.click();
    await expect(page.locator(".selected-vendor-panel h2")).not.toHaveText("No vendor selected");

    await page.locator(".vendor-card").first().getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(page.locator(".vendor-card").first()).toHaveClass(/selected/);
  });

  test("MapLibre stays active when non-critical tile or glyph requests fail", async ({ page }) => {
    let blockedNonCriticalRequest = false;

    await primePublicLocation(page);
    await page.route("**/*", async (route) => {
      const requestUrl = route.request().url();
      const isStyleRequest = requestUrl.includes("style.json");
      const isNonCriticalMapAsset =
        requestUrl.includes("/tiles/") ||
        requestUrl.includes("/fonts/") ||
        requestUrl.includes("/sprites/") ||
        requestUrl.endsWith(".pbf") ||
        requestUrl.endsWith(".png") ||
        requestUrl.endsWith(".webp");

      if (!isStyleRequest && isNonCriticalMapAsset) {
        blockedNonCriticalRequest = true;
        await route.abort();
        return;
      }

      await route.continue();
    });

    await page.goto("/");
    await expect.poll(async () => blockedNonCriticalRequest).toBe(true);
    await expect(page.locator('.discovery-map[data-map-mode="maplibre"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Map view limited, vendors still available below.")).toHaveCount(0);
    await expect(page.locator(".maplibregl-canvas")).toHaveCount(1);
    await expect(page.locator(".maplibre-vendor-marker")).not.toHaveCount(0);
  });

  test("vendor detail page loads successfully", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/vendors/jabi-office-lunch-bowl");
    await expect(page.getByRole("heading", { name: "Jabi Office Lunch Bowl" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Call" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Directions" })).toBeVisible();
    await expect(page.locator(".vendor-detail-image")).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("search route works", async ({ page }) => {
    const errors = trackClientErrors(page);

    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await page.goto("/search?q=rice");
    await expect(page.getByRole("heading", { name: "Search local food" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue("rice");
    await expect(page.locator(".discovery-layout")).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("denied geolocation keeps frontend location copy neutral while vendors still load", async ({ page }) => {
    const errors = trackClientErrors(page);

    await installMockGeolocation(page, {
      kind: "error",
      code: 1,
      message: "User denied geolocation.",
    });
    await page.goto("/");

    await expect(page.locator(".location-panel strong")).toHaveText("Showing nearby vendors");
    await expect(page.locator(".location-panel div > span").first()).toHaveText(
      "Turn on location for more accurate nearby vendors.",
    );
    await expect(page.locator(".location-panel p")).toHaveCount(0);
    await expect(page.locator(".location-trust-line")).toHaveCount(0);
    await expect(page.getByText("Showing Abuja")).toHaveCount(0);
    await expect(page.getByText("Approximate location was unavailable.")).toHaveCount(0);
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("retry clears denied state and reloads nearby vendors after precise location succeeds", async ({ page }) => {
    const errors = trackClientErrors(page);
    const nearbyUrls: string[] = [];

    await installMockGeolocation(page, {
      kind: "error",
      code: 1,
      message: "User denied geolocation.",
    });
    await mockReverseGeocode(page, "Wuse II, Abuja");

    await page.route("**/api/vendors/nearby**", async (route) => {
      nearbyUrls.push(route.request().url());
      await route.continue();
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.locator(".location-panel strong")).toHaveText("Showing nearby vendors");
    await expect(page.locator(".location-panel div > span").first()).toHaveText(
      "Turn on location for more accurate nearby vendors.",
    );
    await expect(page.locator(".location-panel p")).toHaveCount(0);

    await setMockGeolocationMode(page, {
      kind: "success",
      lat: 9.08,
      lng: 7.4,
    });

    await page.getByRole("button", { name: "Retry location" }).click();

    await expect(page.locator(".location-panel strong")).toHaveText(
      "Using your current location",
    );
    await expect(page.locator(".location-panel div > span").first()).toHaveText("Wuse II, Abuja");
    await expect(page.locator(".location-trust-line")).toHaveText("High accuracy");
    await expect(page.locator(".location-panel p")).toHaveCount(0);
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    expect(nearbyUrls.some((url) => !url.includes("lat=") && !url.includes("lng="))).toBe(true);
    expect(nearbyUrls.some((url) => url.includes("lat=") && url.includes("lng="))).toBe(true);

    await expectNoClientErrors(errors);
  });

  test("selection keeps open and closed status consistent across card and selected preview", async ({ page }) => {
    const errors = trackClientErrors(page);

    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await mockNearbyDiscovery(page, [
      {
        vendor_id: "30000000-0000-4000-8000-000000000001",
        name: "Closed Sunday Lunch Bowl",
        slug: "closed-sunday-lunch-bowl",
        short_description: "Closed vendor regression case.",
        phone_number: "+2348000000001",
        area: "Jabi",
        latitude: 9.0606,
        longitude: 7.4219,
        price_band: "standard",
        average_rating: 0,
        review_count: 0,
        distance_km: 3.11,
        is_open_now: false,
        featured_dish: {
          dish_name: "Rice bowl",
          description: null,
        },
        today_hours: "Closed",
      },
      {
        vendor_id: "30000000-0000-4000-8000-000000000002",
        name: "Opens Later Rice Corner",
        slug: "opens-later-rice-corner",
        short_description: "Future open regression case.",
        phone_number: "+2348000000002",
        area: "Jabi",
        latitude: 9.0643,
        longitude: 7.4291,
        price_band: "standard",
        average_rating: 4.2,
        review_count: 11,
        distance_km: 4.02,
        is_open_now: false,
        featured_dish: {
          dish_name: "Jollof rice",
          description: null,
        },
        today_hours: "5:00 PM - 10:00 PM",
      },
      {
        vendor_id: "30000000-0000-4000-8000-000000000003",
        name: "Open Evening Grill",
        slug: "open-evening-grill",
        short_description: "Open vendor regression case.",
        phone_number: "+2348000000003",
        area: "Wuse",
        latitude: 9.071,
        longitude: 7.43,
        price_band: "premium",
        average_rating: 4.7,
        review_count: 32,
        distance_km: 2.45,
        is_open_now: true,
        featured_dish: {
          dish_name: "Grilled chicken",
          description: null,
        },
        today_hours: "10:00 AM - 11:00 PM",
      },
    ]);

    await page.goto("/");
    await expect.poll(async () => page.locator(".vendor-card").count()).toBe(3);

    const beforeSelectionSnapshot = await readVendorCardStateSnapshot(page);

    const closedCard = page.locator(".vendor-card").filter({ hasText: "Closed Sunday Lunch Bowl" });
    await expect(closedCard.locator(".vendor-card-status-line")).toContainText("Closed");
    await expect(closedCard.locator(".vendor-card-hours-line")).toContainText("Closed");
    await closedCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(closedCard.locator(".vendor-card-status-line")).toContainText("Closed");
    await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("Closed");
    await expect(page.locator(".selected-vendor-panel .selected-vendor-hours-line")).toContainText("Closed");
    await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("3.1 km");

    const laterCard = page.locator(".vendor-card").filter({ hasText: "Opens Later Rice Corner" });
    await expect(laterCard.locator(".vendor-card-status-line")).toContainText("Closed");
    await laterCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(laterCard.locator(".vendor-card-status-line")).toContainText("Closed");
    await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("Closed");
    await expect(page.locator(".selected-vendor-panel .selected-vendor-hours-line")).toContainText("5:00 PM - 10:00 PM");
    await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("4.0 km");

    const openCard = page.locator(".vendor-card").filter({ hasText: "Open Evening Grill" });
    await expect(openCard.locator(".vendor-card-status-line")).toContainText("Open");
    await openCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(openCard.locator(".vendor-card-status-line")).toContainText("Open");
    await expect(page.locator(".selected-vendor-panel .selected-vendor-status-line")).toContainText("Open");

    const afterSelectionSnapshot = await readVendorCardStateSnapshot(page);
    expect(afterSelectionSnapshot).toEqual(beforeSelectionSnapshot);

    await expectNoClientErrors(errors);
  });

  test("discovery state restores after vendor detail back navigation", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await page.goto("/");

    await page.getByRole("textbox", { name: "Search" }).fill("rice");
    await openDiscoveryFilters(page);
    await page.locator('select[name="radiusKm"]:visible').selectOption("30");
    const applyButton = page.locator('button:has-text("Apply"):visible');
    await applyButton.scrollIntoViewIfNeeded();
    await applyButton.click();

    await expect(page).toHaveURL(/q=rice/);
    await expect(page).toHaveURL(/radius_km=30/);

    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
    const firstCard = page.locator(".vendor-card").first();
    await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(firstCard).toHaveClass(/selected/);

    await expect(page.locator(".selected-vendor-panel h2")).toBeVisible();
    await expect(page).toHaveURL(/q=rice/);
    await expect(page).toHaveURL(/radius_km=30/);

    await firstCard.getByRole("link", { name: "View details →" }).click();
    await expect(page).toHaveURL(/\/vendors\/[a-z0-9-]+(\?.*)?$/);

    await page.goBack();

    await expect(page).toHaveURL(/q=rice/);
    await expect(page).toHaveURL(/radius_km=30/);
    await expect(page.locator(".vendor-card").first()).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue("rice");
    await openDiscoveryFilters(page);
    await expect(page.locator('select[name="radiusKm"]:visible')).toHaveValue("30");
    await expect(page.locator(".selected-vendor-panel h2")).toBeVisible();
    await expectUniqueMapVendorMarkers(page);

    const restoredApplyButton = page.locator('button:has-text("Apply"):visible');
    await expect(restoredApplyButton).toBeEnabled();
    await page.getByRole("textbox", { name: "Search" }).fill("grill");
    await restoredApplyButton.click();

    await expect(page).toHaveURL(/q=grill/);
    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
    await expect(page.locator(".vendor-card").first().locator(".vendor-card-hours-line")).toContainText("Active hours:");

    await expectNoClientErrors(errors);
  });

  test("back to map link restores discovery state", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await page.goto("/");

    await page.getByRole("textbox", { name: "Search" }).fill("rice");
    await openDiscoveryFilters(page);
    await page.locator('select[name="radiusKm"]:visible').selectOption("30");
    await page.locator('button:has-text("Apply"):visible').click();

    await expect(page).toHaveURL(/q=rice/);
    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);

    const firstCard = page.locator(".vendor-card").first();
    await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(firstCard).toHaveClass(/selected/);
    const selectedVendorName = await firstCard.getByRole("heading", { level: 3 }).textContent();
    await expect(page.locator(".selected-vendor-panel h2")).toContainText(selectedVendorName ?? "");

    await firstCard.getByRole("link", { name: "View details →" }).click();
    await expect(page).toHaveURL(/returnTo=/);

    await page.getByRole("link", { name: "Back to map" }).click();

    await expect(page).toHaveURL(/q=rice/);
    await expect(page).toHaveURL(/radius_km=30/);
    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
    await expect(page.locator(".vendor-card").first()).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue("rice");
    await openDiscoveryFilters(page);
    await expect(page.locator('select[name="radiusKm"]:visible')).toHaveValue("30");
    await expect(page.locator(".selected-vendor-panel h2")).toContainText(selectedVendorName ?? "");
    await expectUniqueMapVendorMarkers(page);

    const restoredApplyButton = page.locator('button:has-text("Apply"):visible');
    await expect(restoredApplyButton).toBeEnabled();
    await page.locator('select[name="priceBand"]:visible').selectOption("budget");
    await restoredApplyButton.click();

    await expect(page).toHaveURL(/price_band=budget/);
    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
    await expect(page.locator(".vendor-card").first().locator(".vendor-card-hours-line")).toContainText("Active hours:");

    await expectNoClientErrors(errors);
  });

  test("admin route loads", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("admin vendors route loads behind auth", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/admin/vendors");
    await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("admin analytics route loads behind auth", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/admin/analytics");
    await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("admin create vendor route loads behind auth", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/admin/vendors/new");
    await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("admin edit vendor route loads behind auth", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/admin/vendors/00000000-0000-4000-8000-000000000001");
    await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("mobile homepage keeps core content visible", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await page.goto("/");

    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect(page.locator(".location-panel div > span").first()).toHaveText("Wuse II, Abuja");
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await expectNoClientErrors(errors);
  });

  test("mobile discovery keeps header, filters, map, selected preview, and list in the correct order", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await page.goto("/");

    const firstCard = page.locator(".vendor-card").first();
    const firstVendorId = await firstCard.getAttribute("data-vendor-id");
    expect(firstVendorId).toBeTruthy();

    await clickVendorOnMap(page, firstVendorId!);

    const headerTop = await topPosition(page.locator(".discovery-heading"));
    const filtersTop = await topPosition(page.locator(".mobile-discovery-filters"));
    const mapTop = await topPosition(page.locator(".discovery-map"));
    const selectedTop = await topPosition(page.locator(".selected-vendor-panel"));
    const firstCardTop = await topPosition(firstCard);

    expect(headerTop).toBeLessThan(filtersTop);
    expect(filtersTop).toBeLessThan(mapTop);
    expect(mapTop).toBeLessThan(selectedTop);
    expect(selectedTop).toBeLessThan(firstCardTop);

    await expectNoClientErrors(errors);
  });

  test("mobile map marker selection surfaces the selected vendor preview and card selection keeps map focus", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await page.goto("/");

    const firstCard = page.locator(".vendor-card").first();
    const firstVendorName = await firstCard.locator("h3").textContent();
    const firstVendorId = await firstCard.getAttribute("data-vendor-id");
    expect(firstVendorId).toBeTruthy();
    await page.locator(".discovery-map").scrollIntoViewIfNeeded();
    const scrollBeforeMarkerTap = await page.evaluate(() => window.scrollY);
    const cameraStateBeforeMarkerTap = await readMapCameraState(page);

    await clickVendorOnMap(page, firstVendorId!);
    const scrollAfterMarkerTap = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollAfterMarkerTap - scrollBeforeMarkerTap)).toBeLessThan(12);

    const selectedPanel = page.locator(".selected-vendor-panel");
    await expect(selectedPanel).toBeInViewport();
    await expect(selectedPanel.locator("h2")).toContainText(firstVendorName ?? "");
    await expect(selectedPanel).toContainText("Active hours:");
    await expect(selectedPanel).toContainText("Slug:");
    await expect(selectedPanel).toContainText(/Open|Closed|Hours unavailable/);
    await expect(selectedPanel.getByRole("link", { name: "View details" })).toBeVisible();
    await expect(selectedPanel.getByRole("link", { name: "Call" })).toBeVisible();
    await expect(selectedPanel.getByRole("link", { name: "Directions" })).toBeVisible();
    const cameraStateAfterMarkerTap = await readMapCameraState(page);
    if (cameraStateBeforeMarkerTap && cameraStateAfterMarkerTap) {
      expect(cameraStateAfterMarkerTap.count).toBe(cameraStateBeforeMarkerTap.count);
    }

    await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(selectedPanel.locator("h2")).toContainText(firstVendorName ?? "");
    await expect(page.locator(`.discovery-map [data-vendor-id="${firstVendorId}"].selected`)).toBeVisible();
    await expectUniqueMapVendorMarkers(page);

    await openDiscoveryFilters(page);
    await page.locator('select[name="radiusKm"]:visible').selectOption("30");
    const applyButton = page.locator('button:has-text("Apply"):visible');
    await expect(applyButton).toBeEnabled();
    await applyButton.click();
    await expect(page).toHaveURL(/radius_km=30/);
    await expect(selectedPanel).toBeVisible();
    await expectUniqueMapVendorMarkers(page);
    if ((await page.locator('.discovery-map[data-map-mode="maplibre"]').count()) > 0) {
      const overviewZoom = await page.evaluate(() => window.__LOCAL_MAN_MAP_DEBUG__?.getZoom() ?? null);
      expect(overviewZoom).not.toBeNull();
      expect(overviewZoom!).toBeLessThan(15);
      const cameraStateAfterApply = await readMapCameraState(page);
      expect(cameraStateAfterApply).not.toBeNull();
      expect(cameraStateAfterApply?.lastAction?.source).toBe("filter");
      const interactionState = await readMapInteractionState(page);
      expect(interactionState).not.toBeNull();
      expect(interactionState).toMatchObject({
        dragPan: true,
        dragRotate: false,
        touchZoomRotate: true,
      });
    }

    await expectNoClientErrors(errors);
  });

  test("small phone layout stays readable", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 320, height: 844 });
    await primePublicLocation(page);
    await page.goto("/");

    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect(page.locator(".vendor-card").first()).toBeVisible();
    await expect(page.locator(".vendor-card .vendor-card-footer").first()).toBeVisible();
    await page.locator(".vendor-card").first().getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(page.locator(".vendor-card").first()).toHaveClass(/selected/);
    await expect(page.locator(".vendor-card").first().locator(".vendor-card-hours-line")).toContainText("Active hours:");
    await expect(page.locator(".vendor-card").first().locator(".vendor-card-status-line")).toContainText("km");

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await expectNoClientErrors(errors);
  });

  test("night theme keeps cards readable and selected state clear", async ({ page }) => {
    const errors = trackClientErrors(page);

    await setMockClientTime(page, "2026-04-25T21:00:00");
    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const shell = page.locator(".public-shell");
    await expect(shell).toHaveAttribute("data-time-theme", "night");

    const firstCard = page.locator(".vendor-card").first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator(".vendor-card-hours-line")).toContainText("Active hours:");
    await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(firstCard).toHaveClass(/selected/);
    await expect(firstCard.locator(".vendor-card-hours-line")).toContainText("Active hours:");
    await expect(firstCard.locator(".vendor-card-status-line")).toContainText("km");
    await expect(firstCard.locator(".vendor-card-status-line")).toContainText(/Open|Closed/);

    const selectedStyles = await firstCard.evaluate((element) => {
      const styles = getComputedStyle(element);
      const title = element.querySelector("h3");
      const titleStyles = title ? getComputedStyle(title) : null;

      return {
        backgroundColor: styles.backgroundColor,
        color: titleStyles?.color ?? null,
        boxShadow: styles.boxShadow,
      };
    });

    const [bgRed, bgGreen, bgBlue] = parseRgbChannels(selectedStyles.backgroundColor);
    const [titleRed, titleGreen, titleBlue] = parseRgbChannels(selectedStyles.color ?? "");

    expect((bgRed + bgGreen + bgBlue) / 3).toBeGreaterThan(210);
    expect((titleRed + titleGreen + titleBlue) / 3).toBeLessThan(120);
    expect(selectedStyles.boxShadow).not.toBe("none");

    await expectNoClientErrors(errors);
  });

  test("morning theme applies from local browser time", async ({ page }) => {
    const errors = trackClientErrors(page);

    await setMockClientTime(page, "2026-04-25T08:00:00");
    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await page.goto("/");

    const shell = page.locator(".public-shell");
    await expect(shell).toHaveAttribute("data-time-theme", "morning");
    await expect(page.locator(".discovery-heading")).toBeVisible();
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("afternoon theme applies from local browser time", async ({ page }) => {
    const errors = trackClientErrors(page);

    await setMockClientTime(page, "2026-04-25T14:00:00");
    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await page.goto("/");

    const shell = page.locator(".public-shell");
    await expect(shell).toHaveAttribute("data-time-theme", "afternoon");
    await expect(page.locator(".discovery-heading")).toBeVisible();
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("precise location falls back to coordinates when reverse geocoding fails", async ({ page }) => {
    const errors = trackClientErrors(page);

    await primePublicLocation(page);
    await mockReverseGeocode(page, null);
    await page.goto("/");

    await expect(page.locator(".location-panel strong")).toHaveText("Using your current location");
    await expect(page.locator(".location-panel div > span").first()).toHaveText(
      "9.08000, 7.40000",
    );
    await expect(page.locator(".location-trust-line")).toHaveText("High accuracy");

    await expectNoClientErrors(errors);
  });

  test("unavailable location keeps fallback copy calm on desktop and mobile", async ({ page }) => {
    const errors = trackClientErrors(page);

    await installMockGeolocation(page, {
      kind: "error",
      code: 2,
      message: "Geolocation unavailable.",
    });
    await page.goto("/");

    await expect(page.locator(".location-panel strong")).toHaveText("Showing nearby vendors");
    await expect(page.locator(".location-panel div > span").first()).toHaveText(
      "Turn on location for more accurate nearby vendors.",
    );
    await expect(page.locator(".location-trust-line")).toHaveCount(0);
    await expect(page.getByText("Showing Abuja")).toHaveCount(0);
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();

    await expect(page.locator(".location-panel strong")).toHaveText("Showing nearby vendors");
    await expect(page.locator(".location-panel div > span").first()).toHaveText(
      "Turn on location for more accurate nearby vendors.",
    );
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("tablet layout keeps map and list balanced", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 768, height: 1024 });
    await primePublicLocation(page);
    await page.goto("/");

    const layout = page.locator(".discovery-layout");
    await expect(layout).toBeVisible();
    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
    const firstCard = page.locator(".vendor-card").first();
    await expect(firstCard).toBeVisible();

    const layoutBox = await layout.boundingBox();
    const mapBox = await page.locator(".discovery-map").boundingBox();
    const sidebarBox = await page.locator(".discovery-sidebar").boundingBox();

    expect(layoutBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    expect(sidebarBox).not.toBeNull();
    expect(mapBox?.width).toBeGreaterThan(0);
    expect(sidebarBox?.width).toBeGreaterThan(0);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await expectNoClientErrors(errors);
  });

  test("keyboard focus is visible", async ({ page }) => {
    const errors = trackClientErrors(page);

    await primePublicLocation(page);
    await page.goto("/");

    let activeElementInfo = null as {
      tagName: string | null;
      outlineStyle: string | null;
      outlineWidth: string | null;
    } | null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      activeElementInfo = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;

        return {
          tagName: element?.tagName ?? null,
          outlineStyle: element ? getComputedStyle(element).outlineStyle : null,
          outlineWidth: element ? getComputedStyle(element).outlineWidth : null,
        };
      });

      if (activeElementInfo.tagName && activeElementInfo.tagName !== "BODY") {
        break;
      }

      await page.keyboard.press("Tab");
    }

    expect(activeElementInfo).not.toBeNull();
    expect(activeElementInfo?.tagName).not.toBe("BODY");
    expect(activeElementInfo?.outlineStyle).not.toBe("none");
    expect(activeElementInfo?.outlineWidth).not.toBe("0px");

    await expectNoClientErrors(errors);
  });
});

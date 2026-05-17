import { expect, test, type Locator, type Page, type Request } from "@playwright/test";

import type { NearbyVendorsResponseData } from "../../types/index.ts";
import {
  installLocalmanBrowserStateIsolation,
  seedPublicDiscoverySnapshot,
} from "./helpers/public-discovery.ts";

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

function isExpectedAdminLogsFailureConsoleMessage(message: string): boolean {
  return message.includes("status of 502") ||
    (
      message.includes("code: UPSTREAM_ERROR") &&
      message.includes("context: admin_logs")
    );
}

function isExpectedAdminRiderInvalidStatusConsoleMessage(message: string): boolean {
  return message.includes("status of 400") &&
    message.includes("Bad Request");
}

async function expectInnerScroll(locator: Locator) {
  const metrics = await locator.evaluate((element) => {
    const styles = window.getComputedStyle(element);

    return {
      clientHeight: element.clientHeight,
      overflowY: styles.overflowY,
      scrollHeight: element.scrollHeight,
    };
  });

  expect(["auto", "scroll"]).toContain(metrics.overflowY);
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
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

async function openMobileDiscoveryTab(page: Page, tab: "home" | "map" | "about") {
  await page.getByTestId(`mobile-discovery-tab-${tab}`).click();
}

async function clickVendorOnMap(page: Page, vendorId: string) {
  await page.locator(`.discovery-map [data-vendor-id="${vendorId}"]`).click();
}

async function dispatchVendorMapClick(page: Page, vendorId: string) {
  await page
    .locator(`.discovery-map [data-vendor-id="${vendorId}"]`)
    .evaluate((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error("Vendor marker element is not clickable.");
      }

      element.click();
    });
}

async function expectUniqueMapVendorMarkers(page: Page) {
  const markerLocator = page.locator(
    '.discovery-map[data-map-mode="maplibre"] .maplibre-vendor-marker[data-vendor-id]',
  );
  await expect.poll(async () => {
    const mapMode = await page.locator(".discovery-map").getAttribute("data-map-mode");

    if (mapMode === "fallback") {
      return "fallback";
    }

    if (mapMode === "maplibre" && (await markerLocator.count()) > 0) {
      return "maplibre";
    }

    return "pending";
  }).not.toBe("pending");

  const settledMapMode = await page.locator(".discovery-map").getAttribute("data-map-mode");
  if (settledMapMode === "fallback") {
    return;
  }

  const vendorIds = await markerLocator.evaluateAll((elements) =>
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

async function expectTapTarget(locator: Locator, label: string, minimumSize = 40) {
  const box = await locator.boundingBox();
  expect(box, `${label} should be visible and measurable`).not.toBeNull();
  expect(box!.width, `${label} width`).toBeGreaterThanOrEqual(minimumSize);
  expect(box!.height, `${label} height`).toBeGreaterThanOrEqual(minimumSize);
}

async function expectNoBoxOverlap(first: Locator, second: Locator, label: string) {
  const [firstBox, secondBox] = await Promise.all([
    first.boundingBox(),
    second.boundingBox(),
  ]);

  expect(firstBox, `${label}: first element should be measurable`).not.toBeNull();
  expect(secondBox, `${label}: second element should be measurable`).not.toBeNull();

  const overlaps = !(
    firstBox!.x + firstBox!.width <= secondBox!.x ||
    secondBox!.x + secondBox!.width <= firstBox!.x ||
    firstBox!.y + firstBox!.height <= secondBox!.y ||
    secondBox!.y + secondBox!.height <= firstBox!.y
  );

  expect(overlaps, `${label} should not overlap`).toBe(false);
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

function vendorMatchesSearch(vendor: MockNearbyVendor, query: string) {
  const haystack = [
    vendor.name,
    vendor.slug,
    vendor.short_description ?? "",
    vendor.area ?? "",
    vendor.featured_dish?.dish_name ?? "",
    vendor.featured_dish?.description ?? "",
  ].join(" ").toLowerCase();

  return haystack.includes(query.toLowerCase());
}

async function mockSearchableNearbyDiscovery(page: Page, vendors: MockNearbyVendor[]) {
  await page.route("**/api/vendors/nearby**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const searchQuery = requestUrl.searchParams.get("search")?.trim() ?? "";
    const radiusKm = Number(requestUrl.searchParams.get("radius_km") ?? "10");
    const openNow = requestUrl.searchParams.get("open_now") === "true";
    const priceBand = requestUrl.searchParams.get("price_band") ?? "";
    const filteredVendors = vendors.filter((vendor) => {
      if (Number.isFinite(radiusKm) && vendor.distance_km > radiusKm) {
        return false;
      }

      if (searchQuery && !vendorMatchesSearch(vendor, searchQuery)) {
        return false;
      }

      if (openNow && !vendor.is_open_now) {
        return false;
      }

      if (priceBand && vendor.price_band !== priceBand) {
        return false;
      }

      return true;
    });

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
          vendors: filteredVendors.map((vendor) => ({
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

async function installPendingGeolocation(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        clearWatch() {},
        getCurrentPosition() {
          return undefined;
        },
        watchPosition() {
          return 0;
        },
      },
    });
  });
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

type MockAdminWorkspaceOptions = {
  role?: "admin" | "agent";
  analyticsRecentEventCount?: number;
  analyticsRankingRowCount?: number;
  auditLogCount?: number;
  auditHasMore?: boolean;
  operationalLogCount?: number;
  operationalLogsHasMore?: boolean;
  vendorCount?: number;
  riderCount?: number;
  adminRequestLog?: string[];
  riderUpdatePayloads?: unknown[];
  vendorImageUploadPayloads?: string[];
  delayInitialImageGetUntilUpload?: boolean;
};

function buildMockAnalyticsRecentEvents(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    event_type: index % 2 === 0 ? "vendor_selected" : "vendor_detail_opened",
    vendor_id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    vendor_name: `Mock Vendor ${index + 1}`,
    vendor_slug: `mock-vendor-${index + 1}`,
    device_type: index % 3 === 0 ? "desktop" : "mobile",
    location_source: index % 2 === 0 ? "precise" : "default_city",
    timestamp: new Date(Date.UTC(2026, 4, 8, 10, index, 0)).toISOString(),
  }));
}

function buildMockAnalyticsRankingRows(count: number, prefix: string) {
  return Array.from({ length: count }, (_, index) => ({
    vendor_id: `31000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    vendor_name: `${prefix} Vendor ${index + 1}`,
    vendor_slug: `${prefix.toLowerCase().replaceAll(/\s+/g, "-")}-vendor-${index + 1}`,
    count: count - index,
  }));
}

function buildMockAuditLogs(
  count: number,
  requestedRole: string,
  requestedAction: string,
) {
  const action = requestedAction === "all" ? "CREATE_VENDOR" : requestedAction;
  const userRole = requestedRole === "all" ? "admin" : requestedRole;
  const isAdminUserAction = action.includes("ADMIN_USER");

  return Array.from({ length: count }, (_, index) => ({
    id: `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    admin_user_id: "10000000-0000-4000-8000-000000000111",
    user_role: userRole,
    entity_type: isAdminUserAction ? "admin_user" : "vendor",
    entity_id: isAdminUserAction
      ? `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
      : `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    action,
    metadata: isAdminUserAction
      ? {
          target_name: `Scoped Agent ${index + 1}`,
          target_role: "agent",
        }
      : {
          target_name: `Mock Vendor ${index + 1}`,
          target_slug: `mock-vendor-${index + 1}`,
        },
    created_at: new Date(Date.UTC(2026, 4, 8, 10, index, 0)).toISOString(),
    admin_user: {
      id: "10000000-0000-4000-8000-000000000111",
      email: "admin@example.com",
      full_name: "Admin User",
      role: "admin",
    },
  }));
}

function buildMockAdminVendors(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `60000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name: `Mock Vendor ${index + 1}`,
    slug: `mock-vendor-${index + 1}`,
    short_description: `Mock description ${index + 1}`,
    phone_number: `+234800000${String(index + 1).padStart(4, "0")}`,
    area: index % 2 === 0 ? "Wuse II" : "Garki",
    latitude: 9.07 + index * 0.001,
    longitude: 7.49 + index * 0.001,
    price_band: index % 3 === 0 ? "$$$" : "$$",
    average_rating: 4.2,
    review_count: 8 + index,
    is_active: index % 5 !== 0,
    is_open_override: null,
    hours_count: index % 4 === 0 ? 4 : 7,
    images_count: index % 3 === 0 ? 0 : 2,
    featured_dishes_count: index % 2 === 0 ? 1 : 0,
  }));
}

function buildMockAdminRiders(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `81000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    display_name: `Mock Rider ${index + 1}`,
    full_name: `Mock Rider Legal ${index + 1}`,
    phone: `+234810000${String(index + 1).padStart(4, "0")}`,
    whatsapp_phone: `+234811000${String(index + 1).padStart(4, "0")}`,
    photo_url: null,
    vehicle_type: index % 2 === 0 ? "Motorcycle" : "Bicycle",
    plate_number: index % 2 === 0 ? `RID-${index + 1}` : null,
    operating_areas: index % 2 === 0 ? ["Wuse", "Garki"] : ["Maitama"],
    usual_available_hours: {
      label: index % 2 === 0 ? "Weekdays 9am-6pm" : "Evenings and weekends",
    },
    verification_status: index === 0 ? "pending" : "verified",
    visibility_status: index === 0 ? "hidden" : "visible",
    notes: index === 0 ? "Needs admin review" : "Reviewed profile",
    consent_accepted_at: "2026-05-17T09:00:00.000Z",
    created_at: new Date(Date.UTC(2026, 4, 17, 9, index, 0)).toISOString(),
    updated_at: new Date(Date.UTC(2026, 4, 17, 10, index, 0)).toISOString(),
    contact_intent_count: index === 0 ? 2 : 0,
    unavailable_report_count: index === 0 ? 1 : 0,
  }));
}

function buildMockOperationalLogs(
  count: number,
  requestedLevel: string,
  requestedArea: string,
  requestedEvent: string,
  requestedRoute: string,
) {
  const level = requestedLevel === "all" ? "error" : requestedLevel;
  const area = requestedArea === "all" ? "public_discovery" : requestedArea;
  const event = requestedEvent || "PUBLIC_NEARBY_ROUTE_FAILED";
  const route = requestedRoute || "/api/vendors/nearby";

  return Array.from({ length: count }, (_, index) => ({
    id: `71000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    created_at: new Date(Date.UTC(2026, 4, 8, 11, index, 0)).toISOString(),
    level,
    area,
    event,
    message: index === 0
      ? "Nearby discovery degraded after an upstream failure."
      : `${event} sample ${index + 1}`,
    route,
    method: route.startsWith("/api/vendors") ? "GET" : "POST",
    status: level === "error" ? 502 : 429,
    duration_ms: 120 + index,
    request_id: `req_mock_logs_${index + 1}`,
    actor_role: null,
    actor_id: null,
    vendor_id: null,
    vendor_slug: route.includes("/ratings") ? "mock-vendor-1" : null,
    environment: "staging",
    metadata: {
      degraded: route === "/api/vendors/nearby",
      html: "<img src=x onerror=alert(1)>",
      nested: {
        retry_after: level === "warn" ? 120 : null,
      },
    },
  }));
}

async function mockAuthenticatedAdminWorkspace(
  page: Page,
  auditLogRequests: Array<{ userRole: string; action: string }>,
  options: MockAdminWorkspaceOptions = {},
  operationalLogRequests: Array<{
    level: string;
    area: string;
    event: string;
    route: string;
    timeWindow: string;
  }> = [],
) {
  const role = options.role ?? "admin";
  const analyticsRecentEventCount = options.analyticsRecentEventCount ?? 1;
  const analyticsRankingRowCount = options.analyticsRankingRowCount ?? 0;
  const auditLogCount = options.auditLogCount ?? 1;
  const auditHasMore = options.auditHasMore ?? false;
  const operationalLogCount = options.operationalLogCount ?? 1;
  const operationalLogsHasMore = options.operationalLogsHasMore ?? false;
  const vendorCount = options.vendorCount ?? 0;
  const riderCount = options.riderCount ?? 0;
  const mockVendors = buildMockAdminVendors(vendorCount);
  let mockRiders = buildMockAdminRiders(riderCount);
  let hasUploadedVendorImage = false;
  let releaseInitialImageGet: (() => void) | null = null;
  const recordAdminRequest = (request: Request) => {
    const requestUrl = new URL(request.url());
    options.adminRequestLog?.push(`${request.method()} ${requestUrl.pathname}${requestUrl.search}`);
  };

  await page.context().addCookies([
    {
      name: "localman_admin_access",
      value: "test-access-token",
      url: "http://localhost:3000",
    },
    {
      name: "localman_admin_refresh",
      value: "test-refresh-token",
      url: "http://localhost:3000",
    },
    {
      name: "localman_admin_access",
      value: "test-access-token",
      url: "http://127.0.0.1:3001",
    },
    {
      name: "localman_admin_refresh",
      value: "test-refresh-token",
      url: "http://127.0.0.1:3001",
    },
  ]);

  await page.route("**/api/admin/session", async (route) => {
    recordAdminRequest(route.request());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: "00000000-0000-4000-8000-000000000111",
            email: "admin@example.com",
          },
          adminUser: {
            id: "10000000-0000-4000-8000-000000000111",
            email: "admin@example.com",
            full_name: "Admin User",
            role,
          },
        },
        error: null,
      }),
    });
  });

  await page.route("**/api/admin/analytics**", async (route) => {
    recordAdminRequest(route.request());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          range: "7d",
          summary: {
            total_sessions: 12,
            total_events: 18,
            vendor_selections: 5,
            vendor_detail_opens: 4,
            call_clicks: 3,
            directions_clicks: 2,
            searches_used: 2,
            filters_applied: 1,
          },
          vendor_performance: {
            most_selected_vendors: buildMockAnalyticsRankingRows(analyticsRankingRowCount, "Selected"),
            most_viewed_vendor_details: buildMockAnalyticsRankingRows(analyticsRankingRowCount, "Viewed"),
            most_call_clicks: buildMockAnalyticsRankingRows(analyticsRankingRowCount, "Calls"),
            most_directions_clicks: buildMockAnalyticsRankingRows(analyticsRankingRowCount, "Directions"),
          },
          dropoff: {
            session_metrics_available: false,
            sessions_without_meaningful_interaction: null,
            sessions_with_search_without_vendor_click: null,
            sessions_with_detail_without_action: null,
          },
          recent_events: buildMockAnalyticsRecentEvents(analyticsRecentEventCount),
        },
        error: null,
      }),
    });
  });

  await page.route("**/api/admin/audit-logs**", async (route) => {
    recordAdminRequest(route.request());
    const requestUrl = new URL(route.request().url());
    const requestedRole = requestUrl.searchParams.get("user_role") ?? "all";
    const requestedAction = requestUrl.searchParams.get("action") ?? "all";
    auditLogRequests.push({
      userRole: requestedRole,
      action: requestedAction,
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          auditLogs: buildMockAuditLogs(auditLogCount, requestedRole, requestedAction),
          pagination: {
            limit: 10,
            has_more: auditHasMore,
            next_cursor: auditHasMore ? String(auditLogCount) : null,
          },
        },
        error: null,
      }),
    });
  });

  await page.route("**/api/admin/logs**", async (route) => {
    recordAdminRequest(route.request());
    const requestUrl = new URL(route.request().url());
    const requestedLevel = requestUrl.searchParams.get("level") ?? "all";
    const requestedArea = requestUrl.searchParams.get("area") ?? "all";
    const requestedEvent = requestUrl.searchParams.get("event") ?? "";
    const requestedRoute = requestUrl.searchParams.get("route") ?? "";
    const requestedTimeWindow = requestUrl.searchParams.get("time_window") ?? "24h";
    operationalLogRequests.push({
      level: requestedLevel,
      area: requestedArea,
      event: requestedEvent,
      route: requestedRoute,
      timeWindow: requestedTimeWindow,
    });

    if (requestedEvent === "FAIL_REQUEST") {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          data: null,
          error: {
            code: "UPSTREAM_ERROR",
            message: "Unable to load logs.",
            detail: "Logs are temporarily unavailable.",
          },
        }),
      });
      return;
    }

    const operationalEvents = requestedEvent === "NO_MATCH"
      ? []
      : buildMockOperationalLogs(
        operationalLogCount,
        requestedLevel,
        requestedArea,
        requestedEvent,
        requestedRoute,
      );

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          operationalEvents,
          pagination: {
            limit: 25,
            has_more: operationalLogsHasMore,
            next_cursor: operationalLogsHasMore ? String(operationalLogCount) : null,
          },
        },
        error: null,
      }),
    });
  });

  await page.route(/\/api\/categories(?:\?.*)?$/, async (route) => {
    recordAdminRequest(route.request());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          categories: [
            {
              id: "70000000-0000-4000-8000-000000000001",
              name: "Suya",
              slug: "suya",
              description: "Mock category",
            },
          ],
        },
        error: null,
      }),
    });
  });

  await page.route(/\/api\/admin\/vendors\/[^/]+\/hours(?:\?.*)?$/, async (route) => {
    recordAdminRequest(route.request());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          hours: [],
        },
        error: null,
      }),
    });
  });

  await page.route(/\/api\/admin\/vendors\/[^/]+\/images(?:\?.*)?$/, async (route) => {
    recordAdminRequest(route.request());
    if (route.request().method() === "POST") {
      const vendorId = new URL(route.request().url()).pathname.split("/").at(-2) ?? "";
      options.vendorImageUploadPayloads?.push(route.request().postDataBuffer()?.toString("utf8") ?? "");

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            images: [
              {
                id: "90000000-0000-4000-8000-000000000001",
                vendor_id: vendorId,
                image_url: "/seed-images/rice.jpg",
                storage_object_path: `${vendorId}/mock-upload.webp`,
                sort_order: 0,
                created_at: "2026-01-01T00:00:00.000Z",
              },
            ],
          },
          error: null,
        }),
      });
      hasUploadedVendorImage = true;
      releaseInitialImageGet?.();
      releaseInitialImageGet = null;
      return;
    }

    if (options.delayInitialImageGetUntilUpload && !hasUploadedVendorImage) {
      await new Promise<void>((resolve) => {
        releaseInitialImageGet = resolve;
      });
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          images: [],
        },
        error: null,
      }),
    });
  });

  await page.route(/\/api\/admin\/vendors\/[^/]+\/dishes(?:\?.*)?$/, async (route) => {
    recordAdminRequest(route.request());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          dishes: [],
        },
        error: null,
      }),
    });
  });

  await page.route(/\/api\/admin\/vendors(?:\?.*)?$/, async (route) => {
    recordAdminRequest(route.request());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          vendors: mockVendors,
          pagination: {
            limit: 100,
            offset: 0,
            count: mockVendors.length,
          },
        },
        error: null,
      }),
    });
  });

  await page.route(/\/api\/admin\/riders\/[^/]+(?:\?.*)?$/, async (route) => {
    recordAdminRequest(route.request());
    const requestUrl = new URL(route.request().url());
    const riderId = requestUrl.pathname.split("/").at(-1) ?? "";
    const rider = mockRiders.find((entry) => entry.id === riderId) ?? null;

    if (!rider) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Rider was not found.",
            status: 404,
          },
        }),
      });
      return;
    }

    if (route.request().method() === "PATCH") {
      const payload = JSON.parse(route.request().postData() ?? "{}");
      options.riderUpdatePayloads?.push(payload);

      if (
        payload.verification_status === "approved" ||
        payload.visibility_status === "public"
      ) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            data: null,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid rider status.",
              status: 400,
            },
          }),
        });
        return;
      }

      const updatedRider = {
        ...rider,
        ...payload,
        updated_at: "2026-05-17T11:00:00.000Z",
      };
      mockRiders = mockRiders.map((entry) => entry.id === riderId ? updatedRider : entry);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            rider: updatedRider,
          },
          error: null,
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
          rider,
        },
        error: null,
      }),
    });
  });

  await page.route(/\/api\/admin\/riders(?:\?.*)?$/, async (route) => {
    recordAdminRequest(route.request());
    const requestUrl = new URL(route.request().url());
    const search = requestUrl.searchParams.get("search")?.trim().toLowerCase() ?? "";
    const verificationStatus = requestUrl.searchParams.get("verification_status") ?? "";
    const visibilityStatus = requestUrl.searchParams.get("visibility_status") ?? "";
    const filteredRiders = mockRiders.filter((rider) => {
      if (verificationStatus && rider.verification_status !== verificationStatus) {
        return false;
      }

      if (visibilityStatus && rider.visibility_status !== visibilityStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        rider.display_name,
        rider.full_name,
        rider.phone,
        rider.whatsapp_phone,
        rider.vehicle_type,
        rider.plate_number,
        ...rider.operating_areas,
      ].some((value) => value?.toLowerCase().includes(search));
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          riders: filteredRiders,
          pagination: {
            limit: 100,
            offset: 0,
            count: filteredRiders.length,
          },
        },
        error: null,
      }),
    });
  });
}

test.describe("Phase 3 browser smoke", () => {
  test.beforeEach(async ({ page }) => {
    await installLocalmanBrowserStateIsolation(page.context());
  });

  test("homepage loads, vendor cards render, and details are clickable", async ({ page }) => {
    const errors = trackClientErrors(page);

    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Local Man" })).toBeVisible();
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
      await expect(mapLibreSurface.locator(".maplibre-vendor-marker__icon")).toHaveCount(
        await page.locator(".vendor-card").count(),
      );
      await expect(mapLibreSurface.locator(".vendor-marker")).toHaveCount(0);
      const selectedMarkerVisual = await mapLibreSurface
        .locator(`.maplibre-vendor-marker[data-vendor-id="${vendorId}"]`)
        .evaluate((element) => {
          const pin = element.querySelector(".maplibre-vendor-marker__pin");
          const styles = pin instanceof HTMLElement ? getComputedStyle(pin) : null;

          return {
            backgroundColor: styles?.backgroundColor ?? "",
            text: element.textContent?.trim() ?? "",
          };
        });
      expect(selectedMarkerVisual.text).toBe("");
      expect(selectedMarkerVisual.backgroundColor).toBe("rgb(36, 97, 79)");

      const unselectedMarkerCount = await mapLibreSurface
        .locator(".maplibre-vendor-marker:not(.selected)")
        .count();
      if (unselectedMarkerCount > 0) {
        const defaultMarkerVisual = await mapLibreSurface
          .locator(".maplibre-vendor-marker:not(.selected)")
          .first()
          .evaluate((element) => {
            const pin = element.querySelector(".maplibre-vendor-marker__pin");
            const styles = pin instanceof HTMLElement ? getComputedStyle(pin) : null;

            return {
              backgroundColor: styles?.backgroundColor ?? "",
              text: element.textContent?.trim() ?? "",
            };
          });
        expect(defaultMarkerVisual.text).toBe("");
        expect(defaultMarkerVisual.backgroundColor).toBe("rgb(178, 58, 48)");
      }
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
    await expect(fallbackMarker.locator(".vendor-marker__icon")).toBeVisible();
    await expect(fallbackMarker).toHaveText("");
    await fallbackMarker.click();
    await expect(fallbackMarker).toHaveClass(/selected/);
    const fallbackMarkerBackground = await fallbackMarker.evaluate((element) =>
      getComputedStyle(element).backgroundColor,
    );
    expect(fallbackMarkerBackground).toBe("rgb(36, 97, 79)");
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

  test("MapLibre initializes on first load after delayed container layout readiness", async ({ page }) => {
    const errors = trackClientErrors(page);

    await primePublicLocation(page);
    await page.addInitScript(() => {
      const installDelayedMapSurfaceStyle = () => {
        const root = document.head ?? document.documentElement ?? document.body;
        if (!root) {
          window.requestAnimationFrame(installDelayedMapSurfaceStyle);
          return;
        }

        const style = document.createElement("style");
        style.textContent = ".maplibre-map-surface{min-height:0 !important;height:0 !important;}";
        root.appendChild(style);
        window.setTimeout(() => style.remove(), 350);
      };

      installDelayedMapSurfaceStyle();
    });

    await page.goto("/");
    await expect(page.locator('.discovery-map[data-map-mode="loading"]')).toBeVisible();
    await expect(page.locator('.discovery-map[data-map-mode="maplibre"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Map view limited, vendors still available below.")).toHaveCount(0);
    await expect(page.locator(".maplibregl-canvas")).toHaveCount(1);
    await expect(page.locator(".maplibre-vendor-marker")).not.toHaveCount(0);

    await expectNoClientErrors(errors);
  });

  test("vendor detail page loads successfully", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/vendors/jabi-office-lunch-bowl");
    await expect(page.getByRole("heading", { name: "Jabi Office Lunch Bowl" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Call" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Directions" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request Rider" })).toBeVisible();
    await expect(page.locator(".vendor-detail-image")).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("vendor detail Request Rider flow creates WhatsApp handoff", async ({ page }) => {
    const errors = trackClientErrors(page);
    const contactPayloads: unknown[] = [];
    const reportPayloads: unknown[] = [];
    let suggestionRequestCount = 0;

    await page.route("**/api/vendors/jabi-office-lunch-bowl/riders", async (route) => {
      suggestionRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            vendor_slug: "jabi-office-lunch-bowl",
            riders: [
              {
                rider_id: "11111111-1111-4111-8111-111111111111",
                display_name: "Amina Rider",
                photo_url: null,
                vehicle_type: "Motorcycle",
                operating_areas: ["Jabi", "Wuse"],
                usual_availability_label: "Usually available afternoons",
              },
            ],
          },
          error: null,
        }),
      });
    });

    await page.route("**/api/vendors/jabi-office-lunch-bowl/riders/contact", async (route) => {
      contactPayloads.push(JSON.parse(route.request().postData() ?? "{}"));
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            intent_id: "22222222-2222-4222-8222-222222222222",
            whatsapp_url: "https://wa.me/2348111111111?text=hello",
            rider: {
              rider_id: "11111111-1111-4111-8111-111111111111",
              display_name: "Amina Rider",
              photo_url: null,
              vehicle_type: "Motorcycle",
              operating_areas: ["Jabi", "Wuse"],
              usual_availability_label: "Usually available afternoons",
            },
          },
          error: null,
        }),
      });
    });

    await page.route(
      "**/api/vendors/jabi-office-lunch-bowl/riders/report-unavailable",
      async (route) => {
        reportPayloads.push(JSON.parse(route.request().postData() ?? "{}"));
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              received: true,
              report_id: "33333333-3333-4333-8333-333333333333",
              message: "Thanks. Localman saved this rider availability report for admin review.",
            },
            error: null,
          }),
        });
      },
    );

    await page.goto("/vendors/jabi-office-lunch-bowl");
    await page.getByRole("button", { name: "Request Rider" }).click();

    const dialog = page.getByRole("dialog", { name: "Find a Rider" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Please call the vendor first")).toBeVisible();
    await expect(dialog.getByText("Localman only connects users")).toBeVisible();
    await expect(dialog.getByText(/Order Now|Book Delivery|Pay Now|Localman Delivery|guaranteed delivery|assigned driver|official courier/i)).toHaveCount(0);

    await dialog.getByLabel("Customer name").fill("Ada");
    await dialog.getByLabel("Phone / WhatsApp").fill("+2348123456789");
    await dialog.getByLabel("Delivery location mode").selectOption("manual_address");
    await dialog.getByLabel("Payment coordination note").selectOption("already_paid_vendor");
    await dialog.getByLabel("Delivery address").fill("25 Ademola Adetokunbo Crescent");
    await dialog.getByLabel("Delivery area").fill("Wuse 2");
    await dialog.getByLabel("Order note").fill("Two plates of jollof rice.");
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Find a Rider" }).click();

    await expect(dialog.getByText("Amina Rider")).toBeVisible();
    await expect(dialog.getByText("Motorcycle")).toBeVisible();
    await expect(dialog.getByText("Jabi, Wuse")).toBeVisible();
    await expect(dialog.getByText("+2348111111111")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Select rider" }).click();

    await expect(dialog.getByText("Amina Rider is selected.")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Message rider" })).toHaveAttribute(
      "href",
      "https://wa.me/2348111111111?text=hello",
    );
    await expect(dialog.getByRole("button", { name: "Try another rider" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Back to vendor" })).toBeVisible();
    await dialog.getByLabel("Rider unavailable?").selectOption("no_response");
    await dialog.getByRole("button", { name: "Report rider unavailable" }).click();
    await expect(dialog.getByText("saved this rider availability report")).toBeVisible();
    await expect.poll(() => suggestionRequestCount).toBe(1);
    expect(contactPayloads).toHaveLength(1);
    expect(contactPayloads[0]).toMatchObject({
      riderId: "11111111-1111-4111-8111-111111111111",
      customerName: "Ada",
      customerPhone: "+2348123456789",
      deliveryLocationMode: "manual_address",
      deliveryAddress: "25 Ademola Adetokunbo Crescent",
      deliveryArea: "Wuse 2",
      orderNote: "Two plates of jollof rice.",
      paymentNoteType: "already_paid_vendor",
      disclaimerAccepted: true,
    });
    expect(reportPayloads).toHaveLength(1);
    expect(reportPayloads[0]).toMatchObject({
      riderId: "11111111-1111-4111-8111-111111111111",
      reason: "no_response",
      reporterPhone: "+2348123456789",
    });

    await expectNoClientErrors(errors);
  });

  test("vendor detail Request Rider modal remains usable on mobile", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/vendors/jabi-office-lunch-bowl");
    await expect(page.getByRole("button", { name: "Request Rider" })).toBeVisible();
    await page.getByRole("button", { name: "Request Rider" }).click();
    await expect(page.getByRole("dialog", { name: "Find a Rider" })).toBeVisible();
    await page.getByRole("button", { name: "Close Request Rider" }).click();
    await expect(page.getByRole("dialog", { name: "Find a Rider" })).toHaveCount(0);

    await expectNoClientErrors(errors);
  });

  test("vendor rating controls disable after one anonymous browser rating", async ({ page }) => {
    const errors = trackClientErrors(page);
    let ratingRequestCount = 0;

    await page.route("**/api/vendors/jabi-office-lunch-bowl/ratings", async (route) => {
      ratingRequestCount += 1;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            vendor_id: "20000000-0000-4000-8000-000000000008",
            rating_summary: {
              average_rating: 5,
              review_count: 1,
            },
          },
          error: null,
        }),
      });
    });

    await page.goto("/vendors/jabi-office-lunch-bowl");

    const fiveStarButton = page.getByRole("button", { name: "Rate 5 stars" });
    await fiveStarButton.click();
    await expect(page.getByText("Rating saved. Thanks for helping other customers.")).toBeVisible();
    await expect(fiveStarButton).toBeDisabled();
    await expect.poll(() => ratingRequestCount).toBe(1);

    await page.reload();
    await expect(page.locator(".vendor-rating-status")).toHaveText(
      "You've already rated this vendor.",
    );
    await expect(page.getByRole("button", { name: "Rate 5 stars" })).toBeDisabled();
    await expect.poll(() => ratingRequestCount).toBe(1);

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

  test("map initializes and default-city vendors load while browser geolocation is still pending", async ({ page }) => {
    const errors = trackClientErrors(page);
    const nearbyUrls: string[] = [];

    await installPendingGeolocation(page);
    await page.route("**/api/vendors/nearby**", async (route) => {
      nearbyUrls.push(route.request().url());
      await route.continue();
    });

    await page.goto("/");

    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    expect(nearbyUrls.length).toBeGreaterThan(0);
    expect(nearbyUrls[0]).not.toContain("lat=");
    expect(nearbyUrls[0]).not.toContain("lng=");

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

    await setMockClientTime(page, "2026-04-25T13:04:00Z");
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

    await openMobileDiscoveryTab(page, "map");
    await expect(page.locator(".selected-vendor-panel h2")).toBeVisible();
    await openMobileDiscoveryTab(page, "home");
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
    await openMobileDiscoveryTab(page, "map");
    await expect(page.locator(".selected-vendor-panel h2")).toBeVisible();
    await expectUniqueMapVendorMarkers(page);
    await openMobileDiscoveryTab(page, "home");

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
    const applyButton = page.locator('button:has-text("Apply"):visible');
    await applyButton.scrollIntoViewIfNeeded();
    await applyButton.click();

    await expect(page).toHaveURL(/q=rice/);
    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);

    const firstCard = page.locator(".vendor-card").first();
    await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(firstCard).toHaveClass(/selected/);
    const selectedVendorName = await firstCard.getByRole("heading", { level: 3 }).textContent();
    await openMobileDiscoveryTab(page, "map");
    await expect(page.locator(".selected-vendor-panel h2")).toContainText(selectedVendorName ?? "");
    await openMobileDiscoveryTab(page, "home");

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
    await openMobileDiscoveryTab(page, "map");
    await expect(page.locator(".selected-vendor-panel h2")).toContainText(selectedVendorName ?? "");
    await expectUniqueMapVendorMarkers(page);
    await openMobileDiscoveryTab(page, "home");

    const restoredApplyButton = page.locator('button:has-text("Apply"):visible');
    await expect(restoredApplyButton).toBeEnabled();
    await page.locator('select[name="priceBand"]:visible').selectOption("budget");
    await restoredApplyButton.click();

    await expect(page).toHaveURL(/price_band=budget/);
    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
    await expect(page.locator(".vendor-card").first().locator(".vendor-card-hours-line")).toContainText("Active hours:");

    await expectNoClientErrors(errors);
  });

  test("nearby vendor cards rank open status, distance, then close-distance popularity", async ({ page }) => {
    const errors = trackClientErrors(page);
    const trackedBodies: Array<Record<string, unknown>> = [];

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
    await mockNearbyDiscovery(page, [
      {
        vendor_id: "40000000-0000-4000-8000-000000000001",
        name: "Open Far Popular 6km",
        slug: "open-far-popular-6km",
        short_description: "Open farther popular vendor.",
        phone_number: "+2348000000001",
        area: "Wuse",
        latitude: 9.081,
        longitude: 7.401,
        price_band: "standard",
        average_rating: 4.1,
        review_count: 9,
        ranking_score: 50,
        distance_km: 6,
        is_open_now: true,
        featured_dish: {
          dish_name: "Rice",
          description: null,
        },
        today_hours: "12:00 AM - 11:59 PM",
      },
      {
        vendor_id: "40000000-0000-4000-8000-000000000003",
        name: "Open Popular 1.3km",
        slug: "open-popular-1-3km",
        short_description: "Open similarly nearby popular vendor.",
        phone_number: "+2348000000003",
        area: "Maitama",
        latitude: 9.083,
        longitude: 7.403,
        price_band: "premium",
        average_rating: 4.8,
        review_count: 40,
        ranking_score: 12,
        distance_km: 1.3,
        is_open_now: true,
        featured_dish: {
          dish_name: "Suya",
          description: null,
        },
        today_hours: "12:00 AM - 11:59 PM",
      },
      {
        vendor_id: "40000000-0000-4000-8000-000000000002",
        name: "Open Near 1km",
        slug: "open-near-1km",
        short_description: "Open nearby vendor.",
        phone_number: "+2348000000002",
        area: "Jabi",
        latitude: 9.082,
        longitude: 7.402,
        price_band: "budget",
        average_rating: 4.4,
        review_count: 12,
        ranking_score: 0,
        distance_km: 1.2,
        is_open_now: true,
        featured_dish: {
          dish_name: "Beans",
          description: null,
        },
        today_hours: "12:00 AM - 11:59 PM",
      },
      {
        vendor_id: "40000000-0000-4000-8000-000000000004",
        name: "Closed Popular Close",
        slug: "closed-popular-close",
        short_description: "Closed popular vendor.",
        phone_number: "+2348000000004",
        area: "Garki",
        latitude: 9.084,
        longitude: 7.404,
        price_band: "budget",
        average_rating: 3.9,
        review_count: 5,
        ranking_score: 50,
        distance_km: 0.5,
        is_open_now: false,
        featured_dish: {
          dish_name: "Akara",
          description: null,
        },
        today_hours: "Closed",
      },
      {
        vendor_id: "40000000-0000-4000-8000-000000000005",
        name: "Closed Near 2km",
        slug: "closed-near-2km",
        short_description: "Closed nearby vendor.",
        phone_number: "+2348000000005",
        area: "Utako",
        latitude: 9.085,
        longitude: 7.405,
        price_band: "standard",
        average_rating: 4,
        review_count: 8,
        ranking_score: 0,
        distance_km: 2,
        is_open_now: false,
        featured_dish: {
          dish_name: "Moi moi",
          description: null,
        },
        today_hours: "Closed",
      },
    ]);

    await page.goto("/");
    await expect.poll(async () => page.locator(".vendor-card").count()).toBe(5);

    const beforeSelectionSnapshot = await readVendorCardStateSnapshot(page);
    expect(beforeSelectionSnapshot.map((vendor) => vendor.name)).toEqual([
      "Open Popular 1.3km",
      "Open Near 1km",
      "Open Far Popular 6km",
      "Closed Popular Close",
      "Closed Near 2km",
    ]);

    await expect(
      page.locator(".vendor-card").filter({ hasText: "Open Popular 1.3km" }).locator(".vendor-card-popular-badge"),
    ).toHaveText("Popular nearby");
    await expect(
      page.locator(".vendor-card").filter({ hasText: "Closed Popular Close" }).locator(".vendor-card-popular-badge"),
    ).toHaveText("Popular nearby");

    const middleOpenCard = page.locator(".vendor-card").filter({ hasText: "Open Near 1km" });
    await middleOpenCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(page.locator(".selected-vendor-panel")).toContainText("Open Near 1km");

    const afterSelectionSnapshot = await readVendorCardStateSnapshot(page);
    expect(afterSelectionSnapshot.map((vendor) => vendor.name)).toEqual(
      beforeSelectionSnapshot.map((vendor) => vendor.name),
    );
    expect(trackedBodies.some((body) => body.event_type === "vendor_selected")).toBe(true);

    await expectNoClientErrors(errors);
  });

  test("cleanup invalidation prevents stale discovery snapshot and retention state from resurfacing deleted vendors", async ({ page }) => {
    const errors = trackClientErrors(page);
    const staleVendorId = "39999999-0000-4000-8000-000000000001";
    const staleVendorSlug = "qa-admin-vendor-playwright-stale";

    await seedPublicDiscoverySnapshot(page.context(), {
      snapshot: {
        nearbyData: {
          location: {
            source: "precise",
            label: "Current location",
            coordinates: {
              lat: 9.08,
              lng: 7.4,
            },
            isApproximate: false,
          },
          vendors: [
            {
              vendor_id: staleVendorId,
              name: "QA Admin Vendor PLAYWRIGHT_STALE",
              slug: staleVendorSlug,
              short_description: "Stale deleted vendor",
              phone_number: "+2348000000099",
              area: "Jabi",
              latitude: 9.0606,
              longitude: 7.4219,
              price_band: "standard",
              average_rating: 0,
              review_count: 0,
              ranking_score: 0,
              distance_km: 1.1,
              is_open_now: true,
              featured_dish: {
                dish_name: "Old dish",
                description: null,
              },
              today_hours: "9:00 AM - 5:00 PM",
            },
          ],
        },
        nearbyDataUpdatedAt: "2026-05-07T17:00:00.000Z",
        selectedVendorId: staleVendorId,
        selectedVendorSlug: staleVendorSlug,
        scrollY: 180,
      },
      invalidationPayload: {
        reason: "vendor_cleanup",
        vendorId: staleVendorId,
        timestamp: "2026-05-07T17:01:00.000Z",
      },
      recentlyViewed: [
        {
          vendor_id: staleVendorId,
          slug: staleVendorSlug,
          name: "QA Admin Vendor PLAYWRIGHT_STALE",
          area: "Jabi",
          today_hours: "9:00 AM - 5:00 PM",
          is_open_now: true,
          timestamp: "2026-05-07T17:00:00.000Z",
        },
      ],
      lastSelected: {
        vendor_id: staleVendorId,
        slug: staleVendorSlug,
        name: "QA Admin Vendor PLAYWRIGHT_STALE",
        area: "Jabi",
        today_hours: "9:00 AM - 5:00 PM",
        is_open_now: true,
        timestamp: "2026-05-07T17:00:00.000Z",
      },
    });

    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await mockNearbyDiscovery(page, [
      {
        vendor_id: "30000000-0000-4000-8000-000000000099",
        name: "Fresh Nearby Grill",
        slug: "fresh-nearby-grill",
        short_description: "Fresh live vendor after cleanup",
        phone_number: "+2348000000098",
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
    await expect(page.locator(".vendor-card")).toHaveCount(1);
    await expect(page.locator(".vendor-card").first()).toContainText("Fresh Nearby Grill");
    await expect(page.getByText("QA Admin Vendor PLAYWRIGHT_STALE")).toHaveCount(0);

    const retainedStateAfterInvalidation = await page.evaluate(() => ({
      recentlyViewed: window.localStorage.getItem("public-recently-viewed-vendors"),
      lastSelected: window.localStorage.getItem("public-last-selected-vendor"),
    }));
    expect(retainedStateAfterInvalidation.recentlyViewed).toBe("[]");
    expect(
      retainedStateAfterInvalidation.lastSelected === null
      || retainedStateAfterInvalidation.lastSelected === "[]",
    ).toBeTruthy();

    const lastSelectedTab = page
      .locator(".vendor-section-nav")
      .getByRole("button", { name: "Last selected" });
    if ((await lastSelectedTab.count()) > 0) {
      await lastSelectedTab.click();
      await expect(page.locator(".retention-panel-secondary")).toContainText("No saved vendor yet");
      await expect(page.locator(".retention-panel-secondary")).not.toContainText("QA Admin Vendor PLAYWRIGHT_STALE");
    }

    await page.reload();
    await expect(page.locator(".vendor-card")).toHaveCount(1);
    await expect(page.getByText("QA Admin Vendor PLAYWRIGHT_STALE")).toHaveCount(0);

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

  test("admin logs route loads behind auth", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/admin/logs");
    await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("admin riders route loads behind auth", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/admin/riders");
    await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("agent is redirected away from admin riders", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];

    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      role: "agent",
      riderCount: 1,
      vendorCount: 2,
    });

    await page.goto("/admin/riders");
    await expect(page).toHaveURL(/\/admin\/agent$/);
    await expect(page.getByRole("heading", { name: "Agent dashboard", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Riders", level: 1 })).toHaveCount(0);

    await expectNoClientErrors(errors);
  });

  test("admin riders page renders and manages rider status", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];
    const adminRequestLog: string[] = [];
    const riderUpdatePayloads: unknown[] = [];

    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      adminRequestLog,
      riderCount: 2,
      riderUpdatePayloads,
    });

    await page.goto("/admin/riders");
    const riderFiltersPanel = page.locator('section[aria-labelledby="rider-filters"]');
    await expect(page.getByRole("heading", { name: "Riders", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Riders" })).toBeVisible();
    await expect(page.locator(".admin-nav-link.active")).toContainText("Riders");
    await expect(riderFiltersPanel.getByLabel("Search by name, phone, or area")).toBeVisible();
    await expect(riderFiltersPanel.getByLabel("Verification")).toBeVisible();
    await expect(riderFiltersPanel.getByLabel("Visibility")).toBeVisible();
    await expect(page.getByText("Riders are independent. Making a rider visible only allows them")).toBeVisible();
    await expect(page.getByRole("button", { name: /Mock Rider 1/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mock Rider 1/ })).toContainText("Pending");
    await expect(page.getByRole("button", { name: /Mock Rider 1/ })).toContainText("Hidden");
    await expect(page.getByRole("button", { name: /Mock Rider 1/ })).toContainText("2 contacts");
    await expect(page.getByRole("button", { name: /Mock Rider 1/ })).toContainText("1 reports");

    await riderFiltersPanel.getByLabel("Search by name, phone, or area").fill("Maitama");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByRole("button", { name: /Mock Rider 2/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mock Rider 1/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByRole("button", { name: /Mock Rider 1/ })).toBeVisible();

    await page.getByLabel("Verification status").selectOption("verified");
    await page.getByLabel("Visibility status").selectOption("visible");
    await page.getByRole("button", { name: "Save rider" }).click();

    await expect(page.locator(".admin-status-copy")).toContainText("Mock Rider 1 updated.");
    await expect(page.getByRole("button", { name: /Mock Rider 1/ })).toContainText("Verified");
    await expect(page.getByRole("button", { name: /Mock Rider 1/ })).toContainText("Visible");
    expect(riderUpdatePayloads).toHaveLength(1);
    expect(riderUpdatePayloads[0]).toMatchObject({
      verification_status: "verified",
      visibility_status: "visible",
    });

    const invalidUpdate = await page.evaluate(async () => {
      const response = await fetch("/api/admin/riders/81000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          verification_status: "approved",
        }),
      });
      const payload = await response.json();

      return {
        status: response.status,
        success: payload.success,
      };
    });
    expect(invalidUpdate).toEqual({
      status: 400,
      success: false,
    });

    await expectNoClientErrors(
      errors.filter(
        (message) => !isExpectedAdminRiderInvalidStatusConsoleMessage(message),
      ),
    );
  });

  test("admin riders page preserves filters through background session refresh", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];
    const adminRequestLog: string[] = [];

    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      adminRequestLog,
      riderCount: 2,
    });

    await page.goto("/admin/riders");
    const riderFiltersPanel = page.locator('section[aria-labelledby="rider-filters"]');
    await expect(page.getByRole("heading", { name: "Riders", level: 1 })).toBeVisible();
    await riderFiltersPanel.getByLabel("Search by name, phone, or area").fill("Wuse");
    await riderFiltersPanel.getByLabel("Verification").selectOption("pending");
    await riderFiltersPanel.getByLabel("Visibility").selectOption("hidden");

    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect
      .poll(() => adminRequestLog.filter((entry) => entry === "GET /api/admin/session").length)
      .toBeGreaterThanOrEqual(2);

    await expect(page).toHaveURL(/\/admin\/riders$/);
    await expect(page.getByRole("heading", { name: "Riders", level: 1 })).toBeVisible();
    await expect(riderFiltersPanel.getByLabel("Search by name, phone, or area")).toHaveValue("Wuse");
    await expect(riderFiltersPanel.getByLabel("Verification")).toHaveValue("pending");
    await expect(riderFiltersPanel.getByLabel("Visibility")).toHaveValue("hidden");
    await expect(page.getByRole("button", { name: /Mock Rider 1/ })).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("recent team activity lives on /admin/activity and analytics no longer duplicates it", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];

    await mockAuthenticatedAdminWorkspace(page, auditLogRequests);

    await page.goto("/admin/activity");
    await expect(page.getByRole("heading", { name: "Activity", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent team activity" })).toBeVisible();
    await expect(page.locator(".admin-nav-link.active")).toContainText("Activity");
    await expect(page.locator(".analytics-table")).toContainText("Admin User");
    await expect(page.locator(".analytics-table")).toContainText("Mock Vendor");
    await expect
      .poll(() => auditLogRequests.length)
      .toBeGreaterThan(0);
    expect(auditLogRequests[0]).toEqual({
      userRole: "all",
      action: "all",
    });

    const auditFilterSelects = page.locator(".analytics-audit-filter-bar .analytics-filter-field select");
    await auditFilterSelects.first().selectOption("agent");
    await expect
      .poll(() => auditLogRequests.at(-1)?.userRole)
      .toBe("agent");
    await expect(page.locator(".analytics-table")).toContainText("agent");

    await auditFilterSelects.nth(1).selectOption("CREATE_ADMIN_USER");
    await expect
      .poll(() => auditLogRequests.at(-1)?.action)
      .toBe("CREATE_ADMIN_USER");
    await expect(page.locator(".analytics-table")).toContainText("created agent");
    await expect(page.locator(".analytics-table")).toContainText("Scoped Agent");

    await page.getByRole("link", { name: "Analytics" }).click();
    await expect(page).toHaveURL(/\/admin\/analytics$/);
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent user events" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent team activity" })).toHaveCount(0);
    await expect(page.locator(".admin-nav-link.active")).toContainText("Analytics");

    await page.getByRole("link", { name: "Activity" }).click();
    await expect(page).toHaveURL(/\/admin\/activity$/);
    await expect(page.getByRole("heading", { name: "Recent team activity" })).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("admin analytics, activity, and vendor registry lists scroll internally instead of expanding the page", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];
    const operationalLogRequests: Array<{
      level: string;
      area: string;
      event: string;
      route: string;
      timeWindow: string;
    }> = [];

    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      analyticsRecentEventCount: 14,
      analyticsRankingRowCount: 12,
      auditLogCount: 16,
      auditHasMore: true,
      operationalLogCount: 14,
      operationalLogsHasMore: true,
      vendorCount: 18,
    }, operationalLogRequests);

    await page.goto("/admin/analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent user events" })).toBeVisible();
    await expect(page.getByRole("button", { name: "View more activity" })).toHaveCount(0);
    await expect(page.locator(".admin-scroll-panel-events")).toBeVisible();
    await expectInnerScroll(page.locator(".admin-scroll-panel-events"));
    await expect(page.locator(".admin-scroll-panel-ranking")).toHaveCount(4);
    await expectInnerScroll(page.locator(".admin-scroll-panel-ranking").first());

    await page.getByRole("link", { name: "Activity" }).click();
    await expect(page).toHaveURL(/\/admin\/activity$/);
    await expect(page.getByRole("heading", { name: "Recent team activity" })).toBeVisible();
    await expect(page.getByRole("button", { name: "View more activity" })).toBeVisible();
    await expect(page.locator(".admin-scroll-panel-activity")).toBeVisible();
    await expectInnerScroll(page.locator(".admin-scroll-panel-activity"));

    const auditFilterSelects = page.locator(".analytics-audit-filter-bar .analytics-filter-field select");
    await auditFilterSelects.first().selectOption("agent");
    await expect
      .poll(() => auditLogRequests.at(-1)?.userRole)
      .toBe("agent");

    await page.getByRole("link", { name: "Logs" }).click();
    await expect(page).toHaveURL(/\/admin\/logs$/);
    await expect(page.getByRole("heading", { name: "Recent platform logs" })).toBeVisible();
    await expect(page.locator(".admin-scroll-panel-logs")).toBeVisible();
    await expectInnerScroll(page.locator(".admin-scroll-panel-logs"));
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect
      .poll(() => operationalLogRequests.at(-1)?.timeWindow)
      .toBe("24h");

    await page.getByRole("link", { name: "Manage vendors" }).click();
    await expect(page).toHaveURL(/\/admin\/vendors$/);
    await expect(page.getByRole("heading", { name: "Manage vendors", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Read more" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Read less" })).toHaveCount(0);
    await expect(page.locator(".admin-scroll-panel-vendors")).toBeVisible();
    await expectInnerScroll(page.locator(".admin-scroll-panel-vendors"));

    await expectNoClientErrors(errors);
  });

  test("admin vendor registry defers edit artifact requests until edit workspace", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];
    const adminRequestLog: string[] = [];
    const artifactRequestPattern = /\/api\/admin\/vendors\/[^/]+\/(hours|images|dishes)/;

    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      vendorCount: 1,
      adminRequestLog,
    });

    await page.goto("/admin/vendors");
    await expect(page.getByRole("heading", { name: "Manage vendors", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mock Vendor 1" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    expect(adminRequestLog.filter((entry) => artifactRequestPattern.test(entry))).toHaveLength(0);

    await page.getByRole("link", { name: "Open edit workspace" }).click();
    await expect(page).toHaveURL(/\/admin\/vendors\/60000000-0000-4000-8000-000000000001$/);
    await expect(page.getByRole("heading", { name: "Vendor images", exact: true })).toBeVisible();
    await expect
      .poll(() => adminRequestLog.filter((entry) => artifactRequestPattern.test(entry)).length)
      .toBeGreaterThanOrEqual(3);

    await expectNoClientErrors(errors);
  });

  test("admin vendor images upload still posts after native file input reset", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];

    await page.addInitScript(() => {
      // Simulates browsers without ES2023 Array.prototype.toSorted support.
      Reflect.deleteProperty(Array.prototype, "toSorted");
    });
    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      vendorCount: 1,
    });

    await page.goto("/admin/vendors");
    await page.getByRole("button", { name: /Mock Vendor 1/ }).click();
    await page.getByRole("link", { name: "Open edit workspace" }).click();
    await expect(page).toHaveURL(/\/admin\/vendors\/60000000-0000-4000-8000-000000000001$/);
    await expect(page.getByRole("heading", { name: "Vendor images", exact: true })).toBeVisible();

    await page.locator('input[name="image"]').setInputFiles({
      name: "vendor-upload.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });
    await expect(page.locator(".vendor-image-local-preview")).toBeVisible();
    await page.locator('input[name="image"]').evaluate((input) => {
      (input as HTMLInputElement).value = "";
    });

    const uploadRequest = page.waitForRequest((request) =>
      request.method() === "POST" &&
      request.url().includes("/api/admin/vendors/60000000-0000-4000-8000-000000000001/images"),
    );

    await page.getByRole("button", { name: "Upload vendor image" }).click();
    await uploadRequest;

    await expect(page).toHaveURL(/\/admin\/vendors\/60000000-0000-4000-8000-000000000001$/);
    await expect(page.locator(".admin-status-copy")).toContainText("Image uploaded successfully.");
    await expect(page.locator(".vendor-image-item")).toHaveCount(1);
    await expect(page.locator(".vendor-image-item")).toContainText("mock-upload.webp");
    await expectNoClientErrors(errors);
  });

  test("admin vendor image selection does not reset when local preview creation fails", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];
    const adminRequestLog: string[] = [];

    await page.addInitScript(() => {
      URL.createObjectURL = () => {
        throw new Error("blob preview unavailable");
      };
    });
    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      vendorCount: 1,
      adminRequestLog,
    });

    await page.goto("/admin/vendors");
    await page.getByRole("button", { name: /Mock Vendor 1/ }).click();
    await page.getByRole("link", { name: "Open edit workspace" }).click();
    await expect(page).toHaveURL(/\/admin\/vendors\/60000000-0000-4000-8000-000000000001$/);
    await expect(page.getByRole("heading", { name: "Vendor images", exact: true })).toBeVisible();

    await page.locator('input[name="image"]').setInputFiles({
      name: "vendor-upload.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });
    await expect(page).toHaveURL(/\/admin\/vendors\/60000000-0000-4000-8000-000000000001$/);
    await expect
      .poll(() => page.locator('input[name="image"]').evaluate((input) => (input as HTMLInputElement).files?.length ?? 0))
      .toBe(1);
    expect(
      adminRequestLog.filter(
        (entry) =>
          entry === "POST /api/admin/vendors/60000000-0000-4000-8000-000000000001/images",
      ),
    ).toHaveLength(0);

    const uploadRequest = page.waitForRequest((request) =>
      request.method() === "POST" &&
      request.url().includes("/api/admin/vendors/60000000-0000-4000-8000-000000000001/images"),
    );

    await page.getByRole("button", { name: "Upload vendor image" }).click();
    await uploadRequest;

    await expect(page.locator(".admin-status-copy")).toContainText("Image uploaded successfully.");
    await expect(page.locator(".vendor-image-item")).toHaveCount(1);
    await expectNoClientErrors(errors);
  });

  test("admin vendor image upload uses the current native file when state diverges", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];
    const vendorImageUploadPayloads: string[] = [];

    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      vendorCount: 1,
      vendorImageUploadPayloads,
    });

    await page.goto("/admin/vendors");
    await page.getByRole("button", { name: /Mock Vendor 1/ }).click();
    await page.getByRole("link", { name: "Open edit workspace" }).click();
    await expect(page).toHaveURL(/\/admin\/vendors\/60000000-0000-4000-8000-000000000001$/);
    await expect(page.getByRole("heading", { name: "Vendor images", exact: true })).toBeVisible();

    await page.locator('input[name="image"]').setInputFiles({
      name: "first-upload.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });

    await page.locator('input[name="image"]').evaluate((input) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], "second-upload.jpg", {
        type: "image/jpeg",
      }));
      (input as HTMLInputElement).files = transfer.files;
    });
    await expect
      .poll(() =>
        page.locator('input[name="image"]').evaluate((input) => (input as HTMLInputElement).files?.[0]?.name ?? null)
      )
      .toBe("second-upload.jpg");

    await page.getByRole("button", { name: "Upload vendor image" }).click();
    await expect(page.locator(".admin-status-copy")).toContainText("Image uploaded successfully.");
    expect(vendorImageUploadPayloads).toHaveLength(1);
    expect(vendorImageUploadPayloads[0]).toContain('filename="second-upload.jpg"');
    expect(vendorImageUploadPayloads[0]).not.toContain('filename="first-upload.jpg"');
    await expectNoClientErrors(errors);
  });

  test("admin vendor image selection resets when switching vendors", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];
    const adminRequestLog: string[] = [];
    const vendorImageUploadPayloads: string[] = [];

    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      vendorCount: 2,
      adminRequestLog,
      vendorImageUploadPayloads,
    });

    await page.goto("/admin/vendors");
    await page.getByRole("button", { name: /Mock Vendor 1/ }).click();
    await page.getByRole("link", { name: "Open edit workspace" }).click();
    await expect(page).toHaveURL(/\/admin\/vendors\/60000000-0000-4000-8000-000000000001$/);
    await expect(page.locator("#edit-vendor-identity")).toHaveText("Mock Vendor 1");

    await page.locator('input[name="image"]').setInputFiles({
      name: "vendor-one-upload.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });
    await expect(page.locator(".vendor-image-local-preview")).toBeVisible();
    await expect
      .poll(() =>
        page.locator('input[name="image"]').evaluate((input) => (input as HTMLInputElement).files?.[0]?.name ?? null)
      )
      .toBe("vendor-one-upload.jpg");

    await page.getByRole("button", { name: /Mock Vendor 2/ }).click();
    await expect(page.locator("#edit-vendor-identity")).toHaveText("Mock Vendor 2");
    await expect(page.locator(".vendor-image-local-preview")).toHaveCount(0);
    await expect(page.locator(".vendor-image-item")).toHaveCount(0);
    await expect
      .poll(() => page.locator('input[name="image"]').evaluate((input) => (input as HTMLInputElement).files?.length ?? 0))
      .toBe(0);

    await page.locator('input[name="image"]').setInputFiles({
      name: "vendor-two-upload.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });
    await page.getByRole("button", { name: "Upload vendor image" }).click();

    await expect(page.locator(".admin-status-copy")).toContainText("Image uploaded successfully.");
    await expect(page.locator(".vendor-image-item")).toHaveCount(1);
    expect(
      adminRequestLog.filter(
        (entry) =>
          entry === "POST /api/admin/vendors/60000000-0000-4000-8000-000000000002/images",
      ),
    ).toHaveLength(1);
    expect(vendorImageUploadPayloads).toHaveLength(1);
    expect(vendorImageUploadPayloads[0]).toContain('filename="vendor-two-upload.jpg"');
    expect(vendorImageUploadPayloads[0]).not.toContain('filename="vendor-one-upload.jpg"');
    await expectNoClientErrors(errors);
  });

  test("admin create vendor image selection preserves form state through session refresh", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];
    const adminRequestLog: string[] = [];

    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      adminRequestLog,
    });

    await page.goto("/admin/vendors/new");
    await expect(page.getByRole("heading", { name: "New vendor" })).toBeVisible();

    await page.locator('input[name="name"]').fill("Create Upload Probe");
    await page.locator('input[name="phone_number"]').fill("+2348000000000");
    await page.locator('input[name="area"]').fill("Wuse");
    await page.locator('textarea[name="short_description"]').fill("Testing create image selection state.");

    await page.locator('input[name="create-image"]').setInputFiles({
      name: "create-upload.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });
    await expect(page.locator(".vendor-image-local-preview")).toBeVisible();

    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect
      .poll(() => adminRequestLog.filter((entry) => entry === "GET /api/admin/session").length)
      .toBeGreaterThanOrEqual(2);

    await expect(page).toHaveURL(/\/admin\/vendors\/new$/);
    await expect(page.locator('input[name="name"]')).toHaveValue("Create Upload Probe");
    await expect(page.locator('input[name="phone_number"]')).toHaveValue("+2348000000000");
    await expect(page.locator('input[name="area"]')).toHaveValue("Wuse");
    await expect(page.locator('textarea[name="short_description"]')).toHaveValue(
      "Testing create image selection state.",
    );
    await expect
      .poll(() =>
        page.locator('input[name="create-image"]').evaluate((input) =>
          (input as HTMLInputElement).files?.[0]?.name ?? null
        )
      )
      .toBe("create-upload.jpg");
    expect(adminRequestLog.some((entry) => entry === "POST /api/admin/vendors")).toBe(false);
    expect(adminRequestLog.some((entry) => /^POST \/api\/admin\/vendors\/.+\/images$/.test(entry))).toBe(false);
    await expectNoClientErrors(errors);
  });

  test("admin vendor image upload is not overwritten by stale image-list responses", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];

    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      vendorCount: 1,
      delayInitialImageGetUntilUpload: true,
    });

    await page.goto("/admin/vendors");
    await page.getByRole("button", { name: /Mock Vendor 1/ }).click();
    await page.getByRole("link", { name: "Open edit workspace" }).click();
    await expect(page).toHaveURL(/\/admin\/vendors\/60000000-0000-4000-8000-000000000001$/);
    await expect(page.getByRole("heading", { name: "Vendor images", exact: true })).toBeVisible();

    await page.locator('input[name="image"]').setInputFiles({
      name: "vendor-upload.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });

    await page.getByRole("button", { name: "Upload vendor image" }).click();
    await expect(page.locator(".admin-status-copy")).toContainText("Image uploaded successfully.");
    await expect(page.locator(".vendor-image-item")).toHaveCount(1);
    await expect(page.locator(".vendor-image-item")).toContainText("mock-upload.webp");
    await expect(page.locator(".admin-identity-panel .admin-completeness-list")).not.toContainText("Missing images");
    await expectNoClientErrors(errors);
  });

  test("admin logs page loads, filters work, and sanitized metadata stays inert", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];
    const operationalLogRequests: Array<{
      level: string;
      area: string;
      event: string;
      route: string;
      timeWindow: string;
    }> = [];

    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      operationalLogCount: 2,
    }, operationalLogRequests);

    await page.goto("/admin/logs");
    await expect(page.getByRole("heading", { name: "Logs", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent platform logs" })).toBeVisible();
    await expect(page.locator(".admin-nav-link.active")).toContainText("Logs");
    await expect(page.locator(".admin-log-item").first()).toContainText("PUBLIC_NEARBY_ROUTE_FAILED");
    await expect(page.locator(".admin-log-expanded")).toHaveCount(0);

    await page.locator(".admin-log-toggle").first().click();
    await expect(page.locator(".admin-log-expanded")).toHaveCount(1);
    await page.locator(".admin-log-details summary").first().click();
    await expect(page.locator(".admin-log-details pre").first()).toContainText("<img src=x onerror=alert(1)>");
    await expect(page.locator(".admin-log-details img")).toHaveCount(0);
    await page.locator(".admin-log-toggle").first().click();
    await expect(page.locator(".admin-log-expanded")).toHaveCount(0);

    await page.getByLabel("Level").selectOption("warn");
    await page.getByLabel("Area").selectOption("abuse");
    await page.locator(".admin-logs-filter-bar").getByRole("textbox", { name: "Route" }).fill("/api/admin/login");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect.poll(() => operationalLogRequests.at(-1)?.level).toBe("warn");
    await expect.poll(() => operationalLogRequests.at(-1)?.area).toBe("abuse");
    await expect.poll(() => operationalLogRequests.at(-1)?.route).toBe("/api/admin/login");

    await page.getByLabel("Event").fill("NO_MATCH");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByText("No operational events matched the current filters.")).toBeVisible();

    await page.getByLabel("Event").fill("FAIL_REQUEST");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.locator(".analytics-empty-state strong")).toContainText("Unable to load logs right now");
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator(".admin-log-item")).toHaveCount(2);
    await page.setViewportSize({ width: 320, height: 780 });
    await expect(page.locator(".admin-scroll-panel-logs")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
      .toBe(true);

    expect(errors.some(isExpectedAdminLogsFailureConsoleMessage)).toBe(true);
    await expectNoClientErrors(
      errors.filter(
        (message) =>
          !isExpectedAdminLogsFailureConsoleMessage(message),
      ),
    );
  });

  test("agent is redirected away from admin logs", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];

    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      role: "agent",
      vendorCount: 4,
    });

    await page.goto("/admin/logs");
    await expect(page).toHaveURL(/\/admin\/agent$/);
    await expect(page.getByRole("heading", { name: "Agent dashboard", level: 1 })).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("agent workspace vendor lists stay scrollable and contained at 320px", async ({ page }) => {
    const errors = trackClientErrors(page);
    const auditLogRequests: Array<{ userRole: string; action: string }> = [];

    await page.setViewportSize({ width: 320, height: 900 });
    await mockAuthenticatedAdminWorkspace(page, auditLogRequests, {
      role: "agent",
      vendorCount: 16,
    });

    await page.goto("/admin/agent");
    await expect(page.getByRole("heading", { name: "Agent dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Loaded vendors" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Read more" })).toHaveCount(0);
    await expect(page.locator(".admin-scroll-panel-vendors-compact")).toHaveCount(1);
    await expectInnerScroll(page.locator(".admin-scroll-panel-vendors-compact"));

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await expectNoClientErrors(errors);
  });

  test("admin activity route loads behind auth", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.goto("/admin/activity");
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

    await expect(page.getByTestId("mobile-discovery-dock")).toBeVisible();
    await expect(page.getByTestId("mobile-discovery-tab-home")).toHaveAttribute("data-active", "true");
    await expect(page.locator(".discovery-map")).toBeHidden();
    await expect(page.locator(".location-panel div > span").first()).toHaveText("Wuse II, Abuja");
    await expect(page.locator(".vendor-section-nav").getByRole("button", { name: "Last selected" })).toBeVisible();
    await expect(page.locator(".retention-panel-secondary")).toBeHidden();
    await expect(page.locator(".vendor-card").first()).toBeVisible();
    await expect(page.locator(".vendor-card").first().getByText("Tap to preview on map")).toBeHidden();
    await expect(page.getByTestId("mobile-about-view")).toBeHidden();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await expectNoClientErrors(errors);
  });

  test("mobile discovery splits Home, Map, and About without losing selected vendor state", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await page.goto("/");

    const firstCard = page.locator(".vendor-card").first();
    const firstVendorId = await firstCard.getAttribute("data-vendor-id");
    const firstVendorName = await firstCard.locator("h3").textContent();
    expect(firstVendorId).toBeTruthy();

    await expect(page.locator(".discovery-heading")).toBeVisible();
    await expect(page.locator(".mobile-discovery-filters")).toBeVisible();
    await expect(firstCard).toBeVisible();
    await expect(page.locator(".discovery-map")).toBeHidden();

    const headerTop = await topPosition(page.locator(".discovery-heading"));
    const filtersTop = await topPosition(page.locator(".mobile-discovery-filters"));
    const firstCardTop = await topPosition(firstCard);

    expect(headerTop).toBeLessThan(filtersTop);
    expect(filtersTop).toBeLessThan(firstCardTop);

    await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(firstCard).toHaveClass(/selected/);

    await openMobileDiscoveryTab(page, "map");
    await expect(page.getByTestId("mobile-discovery-tab-map")).toHaveAttribute("data-active", "true");
    await expect(page.locator(".vendor-card").first()).toBeHidden();
    await expect(page.getByTestId("mobile-map-filters").locator('input[name="search"]')).toBeVisible();
    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect(page.locator(".selected-vendor-panel h2")).toContainText(firstVendorName ?? "");
    await expect(page.locator(`.discovery-map [data-vendor-id="${firstVendorId}"].selected`)).toBeVisible();

    const mapTop = await topPosition(page.locator(".discovery-map"));
    const selectedTop = await topPosition(page.locator(".selected-vendor-panel"));
    expect(mapTop).toBeLessThan(selectedTop);

    await openMobileDiscoveryTab(page, "about");
    await expect(page.getByTestId("mobile-discovery-tab-about")).toHaveAttribute("data-active", "true");
    await expect(page.getByTestId("mobile-about-view")).toBeVisible();
    await expect(page.getByText("Find useful vendors near you.")).toBeVisible();
    await expect(page.locator(".discovery-map")).toBeHidden();
    await expect(page.locator('[data-testid="mobile-home-filters"] input[name="search"]:visible')).toHaveCount(0);
    await expect(page.locator('[data-testid="mobile-map-filters"] input[name="search"]:visible')).toHaveCount(0);

    await expectNoClientErrors(errors);
  });

  test("mobile Home and Map share search and filter state without showing filters on About", async ({ page }) => {
    const errors = trackClientErrors(page);
    const riceVendorId = "50000000-0000-4000-8000-000000000001";
    const suyaVendorId = "50000000-0000-4000-8000-000000000002";

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await mockSearchableNearbyDiscovery(page, [
      {
        vendor_id: riceVendorId,
        name: "Rice Home Stall",
        slug: "rice-home-stall",
        short_description: "Jollof rice and stew bowls.",
        phone_number: "+2348000000101",
        area: "Wuse",
        latitude: 9.071,
        longitude: 7.43,
        price_band: "standard",
        average_rating: 4.4,
        review_count: 12,
        distance_km: 1.2,
        is_open_now: true,
        featured_dish: {
          dish_name: "Jollof rice",
          description: "Smoky party rice",
        },
        today_hours: "9:00 AM - 8:00 PM",
      },
      {
        vendor_id: suyaVendorId,
        name: "Suya Map Grill",
        slug: "suya-map-grill",
        short_description: "Evening suya and grilled chicken.",
        phone_number: "+2348000000102",
        area: "Garki",
        latitude: 9.055,
        longitude: 7.49,
        price_band: "premium",
        average_rating: 4.8,
        review_count: 22,
        distance_km: 2.6,
        is_open_now: true,
        featured_dish: {
          dish_name: "Beef suya",
          description: "Peppered grill skewers",
        },
        today_hours: "10:00 AM - 11:00 PM",
      },
    ]);

    await page.goto("/");
    await page.evaluate(() => {
      (window as Window & { __LOCALMAN_NO_RELOAD_MARKER?: string }).__LOCALMAN_NO_RELOAD_MARKER =
        "alive";
    });

    const homeFilters = page.getByTestId("mobile-home-filters");
    const homeSearch = homeFilters.locator('input[name="search"]');
    await expect(homeSearch).toBeVisible();
    await homeSearch.fill("rice");
    await homeSearch.press("Enter");

    await expect(page).toHaveURL(/q=rice/);
    await expect(page.locator(".vendor-card")).toHaveCount(1);
    await expect(page.locator(".vendor-card").first().locator("h3")).toContainText("Rice Home Stall");
    await expect.poll(async () =>
      page.evaluate(() =>
        (window as Window & { __LOCALMAN_NO_RELOAD_MARKER?: string }).__LOCALMAN_NO_RELOAD_MARKER ?? null,
      ),
    ).toBe("alive");

    await openMobileDiscoveryTab(page, "map");
    const mapFilters = page.getByTestId("mobile-map-filters");
    const mapSearch = mapFilters.locator('input[name="search"]');
    await expect(mapSearch).toBeVisible();
    await expect(mapSearch).toHaveValue("rice");
    await expect(page.locator(`.discovery-map [data-vendor-id="${riceVendorId}"]`)).toBeVisible();
    await expect(page.locator(`.discovery-map [data-vendor-id="${suyaVendorId}"]`)).toHaveCount(0);

    await mapSearch.fill("suya");
    await mapSearch.press("Enter");
    await expect(page).toHaveURL(/q=suya/);
    await expect(mapSearch).toHaveValue("suya");
    await expect(page.locator(`.discovery-map [data-vendor-id="${suyaVendorId}"]`)).toBeVisible();
    await expect(page.locator(`.discovery-map [data-vendor-id="${riceVendorId}"]`)).toHaveCount(0);

    await mapFilters.locator('button[aria-label="Open filters"]').click();
    await mapFilters.locator('select[name="radiusKm"]').selectOption("30");
    await mapFilters.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/radius_km=30/);
    await expect(mapSearch).toHaveValue("suya");

    await openMobileDiscoveryTab(page, "home");
    await expect(homeSearch).toBeVisible();
    await expect(homeSearch).toHaveValue("suya");
    await expect(page.locator(".vendor-card")).toHaveCount(1);
    await expect(page.locator(".vendor-card").first().locator("h3")).toContainText("Suya Map Grill");

    await openMobileDiscoveryTab(page, "about");
    await expect(page.getByTestId("mobile-about-view")).toBeVisible();
    await expect(page.locator('[data-testid="mobile-home-filters"] input[name="search"]:visible')).toHaveCount(0);
    await expect(page.locator('[data-testid="mobile-map-filters"] input[name="search"]:visible')).toHaveCount(0);

    await expectNoClientErrors(errors);
  });

  test("mobile radius filters refetch and render the shared Home and Map dataset", async ({ page }) => {
    const errors = trackClientErrors(page);
    const requestUrls: string[] = [];
    const radiusVendors: MockNearbyVendor[] = [
      {
        vendor_id: "5a000000-0000-4000-8000-000000000001",
        name: "One Kilometer Akara",
        slug: "one-kilometer-akara",
        short_description: "Breakfast akara close to the search point.",
        phone_number: "+2348000000201",
        area: "Wuse",
        latitude: 9.081,
        longitude: 7.401,
        price_band: "budget",
        average_rating: 4.2,
        review_count: 9,
        distance_km: 0.8,
        is_open_now: true,
        featured_dish: {
          dish_name: "Akara",
          description: "Hot akara and pap",
        },
        today_hours: "7:00 AM - 12:00 PM",
      },
      {
        vendor_id: "5a000000-0000-4000-8000-000000000002",
        name: "Five Kilometer Rice",
        slug: "five-kilometer-rice",
        short_description: "Rice bowls inside the five kilometer radius.",
        phone_number: "+2348000000202",
        area: "Jabi",
        latitude: 9.064,
        longitude: 7.43,
        price_band: "standard",
        average_rating: 4.5,
        review_count: 18,
        distance_km: 3.4,
        is_open_now: true,
        featured_dish: {
          dish_name: "Jollof rice",
          description: "Jollof and chicken",
        },
        today_hours: "10:00 AM - 8:00 PM",
      },
      {
        vendor_id: "5a000000-0000-4000-8000-000000000003",
        name: "Ten Kilometer Suya",
        slug: "ten-kilometer-suya",
        short_description: "Suya stand inside the ten kilometer radius.",
        phone_number: "+2348000000203",
        area: "Utako",
        latitude: 9.071,
        longitude: 7.456,
        price_band: "standard",
        average_rating: 4.7,
        review_count: 20,
        distance_km: 8.2,
        is_open_now: false,
        featured_dish: {
          dish_name: "Beef suya",
          description: "Spiced suya",
        },
        today_hours: "5:00 PM - 11:00 PM",
      },
      {
        vendor_id: "5a000000-0000-4000-8000-000000000004",
        name: "Thirty Kilometer Grill",
        slug: "thirty-kilometer-grill",
        short_description: "Grill vendor only visible on wider radius.",
        phone_number: "+2348000000204",
        area: "Guzape",
        latitude: 9.004,
        longitude: 7.519,
        price_band: "premium",
        average_rating: 4.8,
        review_count: 30,
        distance_km: 22.5,
        is_open_now: false,
        featured_dish: {
          dish_name: "Grilled chicken",
          description: "Evening grill",
        },
        today_hours: "6:00 PM - 12:00 AM",
      },
    ];

    page.on("request", (request: Request) => {
      if (request.url().includes("/api/vendors/nearby")) {
        requestUrls.push(request.url());
      }
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await mockSearchableNearbyDiscovery(page, radiusVendors);

    await page.goto("/");
    await expect.poll(async () => page.locator(".vendor-card:visible").count()).toBe(3);

    const homeFilters = page.getByTestId("mobile-home-filters");
    await homeFilters.locator('button[aria-label="Open filters"]').click();

    const expectedVisibleCounts: Record<string, number> = {
      "1": 1,
      "5": 2,
      "10": 3,
      "30": 4,
    };

    for (const radius of ["1", "5", "10", "30"]) {
      const responsePromise = page.waitForResponse((response) => {
        const url = new URL(response.url());

        return (
          url.pathname === "/api/vendors/nearby" &&
          url.searchParams.get("radius_km") === radius
        );
      });

      await homeFilters.locator('select[name="radiusKm"]').selectOption(radius);
      await homeFilters.getByRole("button", { name: "Apply" }).click();
      await responsePromise;
      await expect(page.locator(".vendor-card:visible")).toHaveCount(expectedVisibleCounts[radius]);

      const openFiltersButton = homeFilters.locator('button[aria-label="Open filters"]');
      if (await openFiltersButton.isVisible()) {
        await openFiltersButton.click();
      }
    }

    expect(requestUrls.some((url) => url.includes("radius_km=1"))).toBe(true);
    expect(requestUrls.some((url) => url.includes("radius_km=5"))).toBe(true);
    expect(requestUrls.some((url) => url.includes("radius_km=10"))).toBe(true);
    expect(requestUrls.some((url) => url.includes("radius_km=30"))).toBe(true);

    await openMobileDiscoveryTab(page, "map");
    const mapFilters = page.getByTestId("mobile-map-filters");
    await expect(mapFilters.locator('input[name="search"]')).toBeVisible();
    await expect(mapFilters.locator('input[name="search"]')).toHaveValue("");
    await expect(page.locator(`.discovery-map [data-vendor-id="${radiusVendors[3].vendor_id}"]`)).toBeVisible();

    await mapFilters.locator('button[aria-label="Open filters"]').click();
    const mapResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        url.pathname === "/api/vendors/nearby" &&
        url.searchParams.get("radius_km") === "5"
      );
    });

    await mapFilters.locator('select[name="radiusKm"]').selectOption("5");
    await mapFilters.getByRole("button", { name: "Apply" }).click();
    await mapResponsePromise;
    await expect(page.locator(`.discovery-map [data-vendor-id="${radiusVendors[0].vendor_id}"]`)).toBeVisible();
    await expect(page.locator(`.discovery-map [data-vendor-id="${radiusVendors[1].vendor_id}"]`)).toBeVisible();
    await expect(page.locator(`.discovery-map [data-vendor-id="${radiusVendors[2].vendor_id}"]`)).toHaveCount(0);
    await expect(page.locator(`.discovery-map [data-vendor-id="${radiusVendors[3].vendor_id}"]`)).toHaveCount(0);

    await openMobileDiscoveryTab(page, "home");
    await expect(homeFilters.locator('select[name="radiusKm"]')).toHaveValue("5");
    await expect(page.locator(".vendor-card:visible")).toHaveCount(2);

    await expectNoClientErrors(errors);
  });

  test("mobile radius filters ignore stale wider-radius cached snapshots", async ({ page }) => {
    const errors = trackClientErrors(page);
    const cachedFarVendor: MockNearbyVendor = {
      vendor_id: "5d000000-0000-4000-8000-000000000030",
      name: "Cached Thirty Kilometer Suya",
      slug: "cached-thirty-kilometer-suya",
      short_description: "This stale cache entry should not survive a 1km radius restore.",
      phone_number: "+2348000000210",
      area: "Guzape",
      latitude: 9.004,
      longitude: 7.519,
      price_band: "premium",
      average_rating: 4.8,
      review_count: 30,
      distance_km: 22.5,
      is_open_now: true,
      featured_dish: {
        dish_name: "Beef suya",
        description: "Stale wide-radius vendor",
      },
      today_hours: "6:00 PM - 12:00 AM",
    };
    const liveNearVendor: MockNearbyVendor = {
      vendor_id: "5d000000-0000-4000-8000-000000000001",
      name: "Live One Kilometer Akara",
      slug: "live-one-kilometer-akara",
      short_description: "Fresh vendor inside the selected tight radius.",
      phone_number: "+2348000000211",
      area: "Wuse",
      latitude: 9.081,
      longitude: 7.401,
      price_band: "budget",
      average_rating: 4.2,
      review_count: 9,
      distance_km: 0.8,
      is_open_now: true,
      featured_dish: {
        dish_name: "Akara",
        description: "Hot akara and pap",
      },
      today_hours: "7:00 AM - 12:00 PM",
    };

    await page.setViewportSize({ width: 390, height: 844 });
    await seedPublicDiscoverySnapshot(page.context(), {
      key: "public-discovery:/?radius_km=1",
      snapshot: {
        nearbyData: {
          location: {
            source: "precise",
            label: "Current location",
            coordinates: {
              lat: 9.08,
              lng: 7.4,
            },
            isApproximate: false,
          },
          vendors: [
            {
              ranking_score: 0,
              ...cachedFarVendor,
            },
          ],
        },
        nearbyDataUpdatedAt: new Date().toISOString(),
        nearbyRequestKey: JSON.stringify({
          source: "precise",
          lat: 9.08,
          lng: 7.4,
          search: "",
          radiusKm: 30,
          openNow: false,
          priceBand: "",
          category: "",
        }),
        selectedVendorId: cachedFarVendor.vendor_id,
        selectedVendorSlug: cachedFarVendor.slug,
        scrollY: 0,
      },
    });
    await primePublicLocation(page);
    await mockSearchableNearbyDiscovery(page, [liveNearVendor, cachedFarVendor]);

    const tightRadiusResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        url.pathname === "/api/vendors/nearby" &&
        url.searchParams.get("radius_km") === "1"
      );
    });
    await page.goto("/?radius_km=1");
    await tightRadiusResponse;

    await expect(page).toHaveURL(/radius_km=1/);
    await expect(page.locator(".vendor-card:visible")).toHaveCount(1);
    await expect(page.locator(".vendor-card:visible").first()).toContainText("Live One Kilometer Akara");
    await expect(page.getByText("Cached Thirty Kilometer Suya")).toHaveCount(0);

    await openMobileDiscoveryTab(page, "map");
    await expect(page.getByTestId("mobile-map-filters").locator('select[name="radiusKm"]')).toHaveValue("1");
    await expect(page.getByRole("button", { name: "Select Live One Kilometer Akara" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Cached Thirty Kilometer Suya" })).toHaveCount(0);

    await expectNoClientErrors(errors);
  });

  test("discovery empty states explain search and radius misses without hiding the map", async ({ page }) => {
    const errors = trackClientErrors(page);
    const vendor: MockNearbyVendor = {
      vendor_id: "5b000000-0000-4000-8000-000000000001",
      name: "Radius Rice Kitchen",
      slug: "radius-rice-kitchen",
      short_description: "Rice bowls beyond the tight radius.",
      phone_number: "+2348000000301",
      area: "Jabi",
      latitude: 9.064,
      longitude: 7.43,
      price_band: "standard",
      average_rating: 4.5,
      review_count: 18,
      distance_km: 3.4,
      is_open_now: true,
      featured_dish: {
        dish_name: "Jollof rice",
        description: "Jollof and chicken",
      },
      today_hours: "10:00 AM - 8:00 PM",
    };

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await mockSearchableNearbyDiscovery(page, [vendor]);

    await page.goto("/");
    await expect.poll(async () => page.locator(".vendor-card:visible").count()).toBe(1);

    const homeFilters = page.getByTestId("mobile-home-filters");
    await homeFilters.locator('input[name="search"]').fill("zzzz-impossible");
    await homeFilters.locator('input[name="search"]').press("Enter");
    await expect(page.getByTestId("discovery-empty-state")).toContainText("Nothing matched your search.");
    await expect(page.getByTestId("discovery-empty-state")).toContainText("Try another vendor, dish, or area.");

    await homeFilters.locator('input[name="search"]').fill("");
    await homeFilters.locator('input[name="search"]').press("Enter");
    await expect.poll(async () => page.locator(".vendor-card:visible").count()).toBe(1);

    await homeFilters.locator('button[aria-label="Open filters"]').click();
    await homeFilters.locator('select[name="radiusKm"]').selectOption("1");
    await homeFilters.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByTestId("discovery-empty-state")).toContainText("No vendors found nearby.");
    await expect(page.getByTestId("discovery-empty-state")).toContainText("within 1 km");

    await openMobileDiscoveryTab(page, "map");
    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect(page.getByTestId("mobile-map-empty-state")).toContainText("No vendors found nearby.");
    await expect(page.getByTestId("mobile-map-empty-state")).toContainText("Try a wider distance.");

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("mobile-discovery-dock")).toBeHidden();
    const desktopFilters = page.locator(".desktop-discovery-filters");
    await desktopFilters.locator('input[name="search"]').fill("zzzz-impossible");
    await desktopFilters.locator('input[name="search"]').press("Enter");
    await expect(page.getByTestId("discovery-empty-state")).toContainText("Nothing matched your search.");
    await expect(page.locator(".discovery-map")).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("mobile map refresh reloads vendors while preserving search and radius filters", async ({ page }) => {
    const errors = trackClientErrors(page);
    const refreshedVendor: MockNearbyVendor = {
      vendor_id: "5c000000-0000-4000-8000-000000000001",
      name: "Refresh Rice Stand",
      slug: "refresh-rice-stand",
      short_description: "Rice vendor returned after refreshing the map.",
      phone_number: "+2348000000401",
      area: "Wuse",
      latitude: 9.079,
      longitude: 7.42,
      price_band: "standard",
      average_rating: 4.6,
      review_count: 16,
      distance_km: 3.2,
      is_open_now: true,
      featured_dish: {
        dish_name: "Jollof rice",
        description: "Fresh rice bowl",
      },
      today_hours: "9:00 AM - 8:00 PM",
    };
    let targetRequestCount = 0;

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await page.route("**/api/vendors/nearby**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const isTargetRefresh =
        requestUrl.searchParams.get("search") === "rice" &&
        requestUrl.searchParams.get("radius_km") === "30";

      if (isTargetRefresh) {
        targetRequestCount += 1;
      }

      const vendors = isTargetRefresh && targetRequestCount >= 2
        ? [refreshedVendor]
        : [];

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

    await page.goto("/");
    const homeFilters = page.getByTestId("mobile-home-filters");
    await homeFilters.locator('input[name="search"]').fill("rice");
    await homeFilters.locator('button[aria-label="Open filters"]').click();
    const emptyResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        url.pathname === "/api/vendors/nearby" &&
        url.searchParams.get("search") === "rice" &&
        url.searchParams.get("radius_km") === "30"
      );
    });
    await homeFilters.locator('select[name="radiusKm"]').selectOption("30");
    await homeFilters.getByRole("button", { name: "Apply" }).click();
    await emptyResponsePromise;
    await expect(page.getByTestId("discovery-empty-state")).toContainText("Nothing matched your search.");

    await openMobileDiscoveryTab(page, "map");
    const mapFilters = page.getByTestId("mobile-map-filters");
    await expect(mapFilters.locator('input[name="search"]')).toHaveValue("rice");
    await expect(page).toHaveURL(/q=rice/);
    await expect(page).toHaveURL(/radius_km=30/);
    await expect(page.getByTestId("mobile-map-empty-state")).toBeVisible();

    const refreshResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        url.pathname === "/api/vendors/nearby" &&
        url.searchParams.get("search") === "rice" &&
        url.searchParams.get("radius_km") === "30"
      );
    });
    await page.getByTestId("mobile-map-refresh").click();
    await refreshResponsePromise;

    await expect(page.locator(`.discovery-map [data-vendor-id="${refreshedVendor.vendor_id}"]`)).toBeVisible();
    await expect(page.getByTestId("mobile-map-empty-state")).toHaveCount(0);
    await expect(mapFilters.locator('input[name="search"]')).toHaveValue("rice");
    await expect(page).toHaveURL(/q=rice/);
    await expect(page).toHaveURL(/radius_km=30/);

    await openMobileDiscoveryTab(page, "home");
    await expect(page.locator(".vendor-card:visible")).toHaveCount(1);
    await expect(page.locator(".vendor-card:visible").first()).toContainText("Refresh Rice Stand");

    await expectNoClientErrors(errors);
  });

  test("mobile map controls stay tappable without overlay collisions", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await page.goto("/");

    const firstCard = page.locator(".vendor-card").first();
    await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await openMobileDiscoveryTab(page, "map");
    await expect(page.locator(".discovery-map")).toBeVisible();
    await expectUniqueMapVendorMarkers(page);

    const refreshButton = page.getByTestId("mobile-map-refresh");
    const mapFilters = page.getByTestId("mobile-map-filters");
    const selectedPanel = page.locator(".selected-vendor-panel");
    await expect(refreshButton).toBeVisible();
    await expect(refreshButton).toBeEnabled();
    await expectTapTarget(refreshButton, "mobile map refresh button");
    await expect(mapFilters.locator('input[name="search"]')).toBeVisible();
    await expect(selectedPanel).toBeVisible();

    for (const width of [320, 375, 390, 414]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(refreshButton).toBeVisible();
      await expectNoBoxOverlap(refreshButton, mapFilters, `refresh button and search filters at ${width}px`);
      await expectNoBoxOverlap(refreshButton, selectedPanel, `refresh button and selected vendor card at ${width}px`);

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(hasHorizontalOverflow, `horizontal overflow at ${width}px`).toBe(false);
    }

    const mapLibreSurface = page.locator('.discovery-map[data-map-mode="maplibre"]');
    if (await mapLibreSurface.count()) {
      const zoomIn = mapLibreSurface.locator(".maplibregl-ctrl-zoom-in");
      const zoomOut = mapLibreSurface.locator(".maplibregl-ctrl-zoom-out");
      const locateMe = mapLibreSurface.locator(".maplibregl-ctrl-geolocate");
      await expect(zoomIn).toBeVisible();
      await expect(zoomOut).toBeVisible();
      await expect(locateMe).toBeVisible();
      await expect(locateMe).toBeEnabled();
      await expectTapTarget(zoomIn, "mobile map zoom in button");
      await expectTapTarget(zoomOut, "mobile map zoom out button");
      await expectTapTarget(locateMe, "mobile map locate-me button");
      await expectNoBoxOverlap(refreshButton, zoomIn, "refresh button and zoom in control");
      await expectNoBoxOverlap(refreshButton, zoomOut, "refresh button and zoom out control");
      await expectNoBoxOverlap(refreshButton, locateMe, "refresh button and locate-me control");
      await expectNoBoxOverlap(mapFilters, zoomIn, "floating search filters and zoom in control");

      await zoomIn.click();
      await zoomOut.click();
      await locateMe.click();
    }

    await refreshButton.click();
    await expect(refreshButton).toBeVisible();
    await expect(selectedPanel).toBeVisible();
    await expect(mapFilters.locator('input[name="search"]')).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByTestId("mobile-discovery-dock")).toBeHidden();
    await expect(page.getByTestId("mobile-map-refresh")).toBeHidden();

    await expectNoClientErrors(errors);
  });

  test("mobile Popular and Last Selected actions open vendor detail pages directly", async ({ page }) => {
    const errors = trackClientErrors(page);
    const popularVendorId = "61000000-0000-4000-8000-000000000001";
    const memoryVendorId = "61000000-0000-4000-8000-000000000002";

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await mockNearbyDiscovery(page, [
      {
        vendor_id: popularVendorId,
        name: "Popular Open Kitchen",
        slug: "popular-open-kitchen",
        short_description: "Popular vendor detail route regression case.",
        phone_number: "+2348000000201",
        area: "Wuse",
        latitude: 9.071,
        longitude: 7.43,
        price_band: "standard",
        average_rating: 4.6,
        review_count: 28,
        ranking_score: 40,
        distance_km: 1.8,
        is_open_now: true,
        featured_dish: {
          dish_name: "Popular rice",
          description: null,
        },
        today_hours: "9:00 AM - 9:00 PM",
      },
      {
        vendor_id: memoryVendorId,
        name: "Memory Noodle Bar",
        slug: "memory-noodle-bar",
        short_description: "Last selected vendor detail route regression case.",
        phone_number: "+2348000000202",
        area: "Garki",
        latitude: 9.055,
        longitude: 7.49,
        price_band: "budget",
        average_rating: 4.1,
        review_count: 9,
        ranking_score: 0,
        distance_km: 2.4,
        is_open_now: true,
        featured_dish: {
          dish_name: "Noodles",
          description: null,
        },
        today_hours: "10:00 AM - 10:00 PM",
      },
    ]);

    await page.goto("/");
    const mobileSections = page.locator(".vendor-section-nav");
    await mobileSections.getByRole("button", { name: "Popular" }).click();

    const popularPanel = page.locator(".retention-panel").filter({ hasText: "Popular vendors near you" });
    await expect(popularPanel.getByRole("link", { name: "Open" })).toBeVisible();
    await expect(popularPanel.getByRole("button", { name: "Preview" })).toHaveCount(0);
    await popularPanel.getByRole("link", { name: "Open" }).click();
    await expect(page).toHaveURL(/\/vendors\/popular-open-kitchen(\?.*)?$/);

    await page.goto("/");
    const memoryCard = page.locator(".vendor-card").filter({ hasText: "Memory Noodle Bar" });
    await expect(memoryCard).toBeVisible();
    await memoryCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await mobileSections.getByRole("button", { name: "Last selected" }).click();

    const lastSelectedPanel = page.locator(".retention-panel-secondary");
    await expect(lastSelectedPanel).toContainText("Memory Noodle Bar");
    await expect(lastSelectedPanel.getByRole("link", { name: "Open" })).toBeVisible();
    await expect(lastSelectedPanel.getByRole("button", { name: "Preview again" })).toHaveCount(0);
    await lastSelectedPanel.getByRole("link", { name: "Open" }).click();
    await expect(page).toHaveURL(/\/vendors\/memory-noodle-bar(\?.*)?$/);

    await expectNoClientErrors(errors);
  });

  test("desktop Popular and Last Selected preview controls stay unchanged", async ({ page }) => {
    const errors = trackClientErrors(page);
    const popularVendorId = "62000000-0000-4000-8000-000000000001";
    const memoryVendorId = "62000000-0000-4000-8000-000000000002";

    await page.setViewportSize({ width: 1280, height: 900 });
    await primePublicLocation(page);
    await mockReverseGeocode(page, "Wuse II, Abuja");
    await mockNearbyDiscovery(page, [
      {
        vendor_id: popularVendorId,
        name: "Desktop Popular Kitchen",
        slug: "desktop-popular-kitchen",
        short_description: "Desktop popular preview regression case.",
        phone_number: "+2348000000301",
        area: "Wuse",
        latitude: 9.071,
        longitude: 7.43,
        price_band: "standard",
        average_rating: 4.6,
        review_count: 28,
        ranking_score: 40,
        distance_km: 1.8,
        is_open_now: true,
        featured_dish: {
          dish_name: "Popular rice",
          description: null,
        },
        today_hours: "9:00 AM - 9:00 PM",
      },
      {
        vendor_id: memoryVendorId,
        name: "Desktop Memory Noodles",
        slug: "desktop-memory-noodles",
        short_description: "Desktop last selected preview regression case.",
        phone_number: "+2348000000302",
        area: "Garki",
        latitude: 9.055,
        longitude: 7.49,
        price_band: "budget",
        average_rating: 4.1,
        review_count: 9,
        ranking_score: 0,
        distance_km: 2.4,
        is_open_now: true,
        featured_dish: {
          dish_name: "Noodles",
          description: null,
        },
        today_hours: "10:00 AM - 10:00 PM",
      },
    ]);

    await page.goto("/");
    const desktopSections = page.locator(".desktop-vendor-section-nav");
    await desktopSections.getByRole("button", { name: "Popular" }).click();

    const popularPanel = page.locator(".retention-panel").filter({ hasText: "Popular vendors near you" });
    await expect(popularPanel.getByRole("button", { name: "Preview" })).toBeVisible();
    await expect(popularPanel.getByRole("link", { name: "Open" })).toHaveCount(0);

    await desktopSections.getByRole("button", { name: "Nearby" }).click();
    const memoryCard = page.locator(".vendor-card").filter({ hasText: "Desktop Memory Noodles" });
    await expect(memoryCard).toBeVisible();
    await memoryCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await desktopSections.getByRole("button", { name: "Last selected" }).click();

    const lastSelectedPanel = page.locator(".retention-panel-secondary");
    await expect(lastSelectedPanel).toContainText("Desktop Memory Noodles");
    await expect(lastSelectedPanel.getByRole("button", { name: "Preview again" })).toBeVisible();
    await expect(lastSelectedPanel.getByRole("link", { name: "Open" })).toHaveCount(0);

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
    const secondCard = page.locator(".vendor-card").nth(1);
    const secondVendorId = await secondCard.getAttribute("data-vendor-id");
    const secondVendorName = await secondCard.locator("h3").textContent();
    expect(firstVendorId).toBeTruthy();
    expect(secondVendorId).toBeTruthy();
    await openMobileDiscoveryTab(page, "map");
    await expect(page.locator(".discovery-map")).toBeVisible();
    await page.locator(".discovery-map").scrollIntoViewIfNeeded();
    const scrollBeforeMarkerTap = await page.evaluate(() => window.scrollY);
    const cameraStateBeforeMarkerTap = await readMapCameraState(page);

    await dispatchVendorMapClick(page, firstVendorId!);
    const scrollAfterMarkerTap = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollAfterMarkerTap - scrollBeforeMarkerTap)).toBeLessThan(12);

    const selectedPanel = page.locator(".selected-vendor-panel");
    await expect(selectedPanel).toBeInViewport();
    await expect(selectedPanel.locator("h2")).toContainText(firstVendorName ?? "");
    await expect(selectedPanel).toContainText("Active hours:");
    await expect(selectedPanel).toContainText("Area:");
    await expect(selectedPanel).toContainText(/Open|Closed|Hours unavailable/);
    await expect(selectedPanel.getByRole("link", { name: "View details" })).toBeVisible();
    await expect(selectedPanel.getByRole("link", { name: "Call" })).toBeVisible();
    await expect(selectedPanel.getByRole("link", { name: "Directions" })).toBeVisible();
    const cameraStateAfterMarkerTap = await readMapCameraState(page);
    if (cameraStateBeforeMarkerTap && cameraStateAfterMarkerTap) {
      expect(cameraStateAfterMarkerTap.count).toBe(cameraStateBeforeMarkerTap.count);
    }

    await openMobileDiscoveryTab(page, "home");
    await expect(secondCard).toBeVisible();
    await secondCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await openMobileDiscoveryTab(page, "map");
    await expect(selectedPanel.locator("h2")).toContainText(secondVendorName ?? "");
    await expectUniqueMapVendorMarkers(page);
    await expect(page.locator(".retention-panel-secondary")).toBeHidden();

    await openMobileDiscoveryTab(page, "home");
    const lastSelectedTab = page.locator(".vendor-section-nav").getByRole("button", {
      name: "Last selected",
    });
    await lastSelectedTab.click();
    const lastSelectedPanel = page.locator(".retention-panel-secondary");
    await expect(lastSelectedPanel).toBeVisible();
    await expect(lastSelectedPanel.getByText("Last selected vendor")).toBeVisible();
    await expect(lastSelectedPanel).toContainText(secondVendorName ?? "");
    await expect(lastSelectedPanel.getByRole("link", { name: "Open" })).toBeVisible();
    await expect(lastSelectedPanel.getByRole("button", { name: "Preview again" })).toHaveCount(0);

    await page.locator(".vendor-section-nav").getByRole("button", { name: "Nearby" }).click();
    await expect(lastSelectedPanel).toBeHidden();
    await openMobileDiscoveryTab(page, "map");
    await expect(page.locator(`.discovery-map [data-vendor-id="${secondVendorId}"].selected`)).toBeVisible();

    await openMobileDiscoveryTab(page, "home");
    await openDiscoveryFilters(page);
    await page.locator('select[name="radiusKm"]:visible').selectOption("30");
    const applyButton = page.locator('button:has-text("Apply"):visible');
    await expect(applyButton).toBeEnabled();
    await applyButton.click();
    await expect(page).toHaveURL(/radius_km=30/);
    await openMobileDiscoveryTab(page, "map");
    await expect(selectedPanel).toBeVisible();
    await expectUniqueMapVendorMarkers(page);
    if ((await page.locator('.discovery-map[data-map-mode="maplibre"]').count()) > 0) {
      const overviewZoom = await page.evaluate(() => window.__LOCAL_MAN_MAP_DEBUG__?.getZoom() ?? null);
      expect(overviewZoom).not.toBeNull();
      expect(overviewZoom!).toBeLessThan(15);
      const cameraStateAfterApply = await readMapCameraState(page);
      expect(cameraStateAfterApply).not.toBeNull();
      expect(cameraStateAfterApply?.lastAction).toBeTruthy();
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

    await expect(page.getByTestId("mobile-discovery-dock")).toBeVisible();
    await expect(page.locator(".discovery-map")).toBeHidden();
    await expect(page.locator(".vendor-card").first()).toBeVisible();
    await expect(page.locator(".vendor-card .vendor-card-footer").first()).toBeVisible();
    await page.locator(".vendor-card").first().getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(page.locator(".vendor-card").first()).toHaveClass(/selected/);
    await expect(page.locator(".vendor-card").first().locator(".vendor-card-hours-line")).toContainText("Active hours:");
    await expect(page.locator(".vendor-card").first().locator(".vendor-card-status-line")).toContainText("km");
    await openMobileDiscoveryTab(page, "map");
    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect(page.locator(".selected-vendor-panel h2")).toBeVisible();

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

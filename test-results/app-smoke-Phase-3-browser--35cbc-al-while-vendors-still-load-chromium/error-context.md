# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> denied geolocation keeps frontend location copy neutral while vendors still load
- Location: tests/e2e/app-smoke.spec.ts:562:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('.location-panel strong')
Expected: "Showing nearby vendors"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for locator('.location-panel strong')

```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
  472 |     ).toBeGreaterThanOrEqual(6);
  473 | 
  474 |     const actionEvents = trackedBodies.filter((body) =>
  475 |       body.event_type === "call_clicked" || body.event_type === "directions_clicked"
  476 |     );
  477 | 
  478 |     expect(actionEvents.length).toBeGreaterThanOrEqual(6);
  479 |     expect(actionEvents.some((body) => body.event_type === "call_clicked")).toBe(true);
  480 |     expect(actionEvents.some((body) => body.event_type === "directions_clicked")).toBe(true);
  481 |     expect(actionEvents.some((body) => (body.metadata as { source?: string } | undefined)?.source === "card")).toBe(true);
  482 |     expect(actionEvents.some((body) => (body.metadata as { source?: string } | undefined)?.source === "selected_preview")).toBe(true);
  483 |     expect(actionEvents.some((body) => (body.metadata as { source?: string } | undefined)?.source === "detail")).toBe(true);
  484 | 
  485 |     for (const body of actionEvents) {
  486 |       expect(body.vendor_id).toBe(vendorId);
  487 |       expect(body.vendor_slug).toBe(vendorSlug);
  488 |       expect(body.device_type === "mobile" || body.device_type === "tablet" || body.device_type === "desktop").toBe(true);
  489 |       expect(body.location_source).toBe("precise");
  490 |       expect(typeof body.timestamp).toBe("string");
  491 |       expect(typeof body.page_path).toBe("string");
  492 |     }
  493 | 
  494 |     await expectNoClientErrors(errors);
  495 |   });
  496 | 
  497 |   test("fallback map remains usable when the MapLibre style request fails", async ({ page }) => {
  498 |     let blockedStyleRequest = false;
  499 | 
  500 |     await primePublicLocation(page);
  501 |     await page.route("**/*", async (route) => {
  502 |       const requestUrl = route.request().url();
  503 |       if (
  504 |         requestUrl.includes("style.json") ||
  505 |         requestUrl.includes("tile.openstreetmap.org") ||
  506 |         requestUrl.includes("maptiler")
  507 |       ) {
  508 |         blockedStyleRequest = true;
  509 |         await route.abort();
  510 |         return;
  511 |       }
  512 | 
  513 |       await route.continue();
  514 |     });
  515 | 
  516 |     await page.goto("/");
  517 |     try {
  518 |       await expect.poll(async () => blockedStyleRequest).toBe(true);
  519 |       await expect(page.locator('.discovery-map[data-map-mode="fallback"]')).toBeVisible({
  520 |         timeout: 10_000,
  521 |       });
  522 |     } catch {
  523 |       await expect(page.locator('.discovery-map[data-map-mode="fallback"]')).toBeVisible();
  524 |     }
  525 |     await expect(page.getByText("Map view limited, vendors still available below.")).toBeVisible();
  526 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  527 | 
  528 |     const fallbackMarker = page.locator('.discovery-map[data-map-mode="fallback"] button[aria-label^="Select "]').first();
  529 |     await expect(fallbackMarker).toBeVisible();
  530 |     await fallbackMarker.click();
  531 |     await expect(page.locator(".selected-vendor-panel h2")).not.toHaveText("No vendor selected");
  532 | 
  533 |     await page.locator(".vendor-card").first().getByRole("button", { name: /Preview .* on map/ }).click();
  534 |     await expect(page.locator(".vendor-card").first()).toHaveClass(/selected/);
  535 |   });
  536 | 
  537 |   test("vendor detail page loads successfully", async ({ page }) => {
  538 |     const errors = trackClientErrors(page);
  539 | 
  540 |     await page.goto("/vendors/jabi-office-lunch-bowl");
  541 |     await expect(page.getByRole("heading", { name: "Jabi Office Lunch Bowl" })).toBeVisible();
  542 |     await expect(page.getByRole("link", { name: "Call" })).toBeVisible();
  543 |     await expect(page.getByRole("link", { name: "Directions" })).toBeVisible();
  544 |     await expect(page.locator(".vendor-detail-image")).toBeVisible();
  545 | 
  546 |     await expectNoClientErrors(errors);
  547 |   });
  548 | 
  549 |   test("search route works", async ({ page }) => {
  550 |     const errors = trackClientErrors(page);
  551 | 
  552 |     await primePublicLocation(page);
  553 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  554 |     await page.goto("/search?q=rice");
  555 |     await expect(page.getByRole("heading", { name: "Search local food" })).toBeVisible();
  556 |     await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue("rice");
  557 |     await expect(page.locator(".discovery-layout")).toBeVisible();
  558 | 
  559 |     await expectNoClientErrors(errors);
  560 |   });
  561 | 
  562 |   test("denied geolocation keeps frontend location copy neutral while vendors still load", async ({ page }) => {
  563 |     const errors = trackClientErrors(page);
  564 | 
  565 |     await installMockGeolocation(page, {
  566 |       kind: "error",
  567 |       code: 1,
  568 |       message: "User denied geolocation.",
  569 |     });
  570 |     await page.goto("/");
  571 | 
> 572 |     await expect(page.locator(".location-panel strong")).toHaveText("Showing nearby vendors");
      |                                                          ^ Error: expect(locator).toHaveText(expected) failed
  573 |     await expect(page.locator(".location-panel div > span").first()).toHaveText(
  574 |       "Turn on location for more accurate nearby vendors.",
  575 |     );
  576 |     await expect(page.locator(".location-panel p")).toHaveCount(0);
  577 |     await expect(page.locator(".location-trust-line")).toHaveCount(0);
  578 |     await expect(page.getByText("Showing Abuja")).toHaveCount(0);
  579 |     await expect(page.getByText("Approximate location was unavailable.")).toHaveCount(0);
  580 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  581 | 
  582 |     await expectNoClientErrors(errors);
  583 |   });
  584 | 
  585 |   test("retry clears denied state and reloads nearby vendors after precise location succeeds", async ({ page }) => {
  586 |     const errors = trackClientErrors(page);
  587 |     const nearbyUrls: string[] = [];
  588 | 
  589 |     await installMockGeolocation(page, {
  590 |       kind: "error",
  591 |       code: 1,
  592 |       message: "User denied geolocation.",
  593 |     });
  594 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  595 | 
  596 |     await page.route("**/api/vendors/nearby**", async (route) => {
  597 |       nearbyUrls.push(route.request().url());
  598 |       await route.continue();
  599 |     });
  600 | 
  601 |     await page.setViewportSize({ width: 390, height: 844 });
  602 |     await page.goto("/");
  603 | 
  604 |     await expect(page.locator(".location-panel strong")).toHaveText("Showing nearby vendors");
  605 |     await expect(page.locator(".location-panel div > span").first()).toHaveText(
  606 |       "Turn on location for more accurate nearby vendors.",
  607 |     );
  608 |     await expect(page.locator(".location-panel p")).toHaveCount(0);
  609 | 
  610 |     await setMockGeolocationMode(page, {
  611 |       kind: "success",
  612 |       lat: 9.08,
  613 |       lng: 7.4,
  614 |     });
  615 | 
  616 |     await page.getByRole("button", { name: "Retry location" }).click();
  617 | 
  618 |     await expect(page.locator(".location-panel strong")).toHaveText(
  619 |       "Using your current location",
  620 |     );
  621 |     await expect(page.locator(".location-panel div > span").first()).toHaveText("Wuse II, Abuja");
  622 |     await expect(page.locator(".location-trust-line")).toHaveText("High accuracy");
  623 |     await expect(page.locator(".location-panel p")).toHaveCount(0);
  624 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  625 | 
  626 |     expect(nearbyUrls.some((url) => !url.includes("lat=") && !url.includes("lng="))).toBe(true);
  627 |     expect(nearbyUrls.some((url) => url.includes("lat=") && url.includes("lng="))).toBe(true);
  628 | 
  629 |     await expectNoClientErrors(errors);
  630 |   });
  631 | 
  632 |   test("selection keeps open and closed status consistent across card and selected preview", async ({ page }) => {
  633 |     const errors = trackClientErrors(page);
  634 | 
  635 |     await primePublicLocation(page);
  636 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  637 |     await mockNearbyDiscovery(page, [
  638 |       {
  639 |         vendor_id: "30000000-0000-4000-8000-000000000001",
  640 |         name: "Closed Sunday Lunch Bowl",
  641 |         slug: "closed-sunday-lunch-bowl",
  642 |         short_description: "Closed vendor regression case.",
  643 |         phone_number: "+2348000000001",
  644 |         area: "Jabi",
  645 |         latitude: 9.0606,
  646 |         longitude: 7.4219,
  647 |         price_band: "standard",
  648 |         average_rating: 0,
  649 |         review_count: 0,
  650 |         distance_km: 3.11,
  651 |         is_open_now: false,
  652 |         featured_dish: {
  653 |           dish_name: "Rice bowl",
  654 |           description: null,
  655 |         },
  656 |         today_hours: "Closed",
  657 |       },
  658 |       {
  659 |         vendor_id: "30000000-0000-4000-8000-000000000002",
  660 |         name: "Opens Later Rice Corner",
  661 |         slug: "opens-later-rice-corner",
  662 |         short_description: "Future open regression case.",
  663 |         phone_number: "+2348000000002",
  664 |         area: "Jabi",
  665 |         latitude: 9.0643,
  666 |         longitude: 7.4291,
  667 |         price_band: "standard",
  668 |         average_rating: 4.2,
  669 |         review_count: 11,
  670 |         distance_km: 4.02,
  671 |         is_open_now: false,
  672 |         featured_dish: {
```
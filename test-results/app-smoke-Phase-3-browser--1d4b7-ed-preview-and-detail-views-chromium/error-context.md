# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> call and directions actions emit tracking events with vendor context across card, selected preview, and detail views
- Location: tests/e2e/app-smoke.spec.ts:415:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
  344 |     await expect(firstCard.locator(".vendor-card-status-line")).toContainText(/Open|Closed/);
  345 |     await expect(page.locator(".selected-vendor-panel h2")).toContainText(vendorName ?? "");
  346 |     await expect(page.locator(".selected-vendor-panel").getByText(/^Today:/)).toBeVisible();
  347 |     await expect(page.locator(".selected-vendor-panel").getByRole("link", { name: "Call" })).toBeVisible();
  348 |     await expect(
  349 |       page.locator(".selected-vendor-panel").getByRole("link", { name: "Directions" }),
  350 |     ).toBeVisible();
  351 |     await expect(
  352 |       page.locator(".selected-vendor-panel").getByRole("link", { name: "View details" }),
  353 |     ).toBeVisible();
  354 | 
  355 |     const selectedCardStyles = await firstCard.evaluate((element) => {
  356 |       const styles = getComputedStyle(element);
  357 |       const title = element.querySelector("h3");
  358 |       const titleStyles = title ? getComputedStyle(title) : null;
  359 | 
  360 |       return {
  361 |         backgroundColor: styles.backgroundColor,
  362 |         borderColor: styles.borderColor,
  363 |         boxShadow: styles.boxShadow,
  364 |         titleColor: titleStyles?.color ?? null,
  365 |       };
  366 |     });
  367 | 
  368 |     const [bgRed, bgGreen, bgBlue] = parseRgbChannels(selectedCardStyles.backgroundColor);
  369 |     const [titleRed, titleGreen, titleBlue] = parseRgbChannels(selectedCardStyles.titleColor ?? "");
  370 |     const backgroundAverage = (bgRed + bgGreen + bgBlue) / 3;
  371 |     const titleAverage = (titleRed + titleGreen + titleBlue) / 3;
  372 | 
  373 |     expect(backgroundAverage).toBeGreaterThan(225);
  374 |     expect(titleAverage).toBeLessThan(120);
  375 |     expect(selectedCardStyles.borderColor).not.toBe("rgba(0, 0, 0, 0)");
  376 |     expect(selectedCardStyles.boxShadow).not.toBe("none");
  377 | 
  378 |     await expectUniqueMapVendorMarkers(page);
  379 | 
  380 |     await clickVendorOnMap(page, vendorId!);
  381 |     await expect(page.locator(".selected-vendor-panel h2")).toContainText(vendorName ?? "");
  382 |     await expect(page.locator(`.discovery-map [data-vendor-id="${vendorId}"].selected`)).toBeVisible();
  383 | 
  384 |     const mapLibreSurface = page.locator('.discovery-map[data-map-mode="maplibre"]');
  385 |     if (await mapLibreSurface.count()) {
  386 |       await expect(mapLibreSurface.locator(".maplibregl-ctrl-zoom-in")).toBeVisible();
  387 |       await expect(mapLibreSurface.locator(".maplibregl-ctrl-zoom-out")).toBeVisible();
  388 |       await expect(mapLibreSurface.locator(".maplibregl-ctrl-geolocate")).toBeVisible();
  389 |       await expect(mapLibreSurface.locator(".maplibre-vendor-marker")).toHaveCount(
  390 |         await page.locator(".vendor-card").count(),
  391 |       );
  392 |       await expect(mapLibreSurface.locator(".vendor-marker")).toHaveCount(0);
  393 |       const interactionState = await readMapInteractionState(page);
  394 |       expect(interactionState).not.toBeNull();
  395 |       expect(interactionState).toMatchObject({
  396 |         boxZoom: true,
  397 |         doubleClickZoom: true,
  398 |         dragPan: true,
  399 |         dragRotate: false,
  400 |         keyboard: true,
  401 |         scrollZoom: true,
  402 |         touchZoomRotate: true,
  403 |       });
  404 |     }
  405 | 
  406 |     await firstCard.getByRole("link", { name: "View details →" }).click();
  407 | 
  408 |     await expect(page).toHaveURL(/\/vendors\/[a-z0-9-]+(\?.*)?$/);
  409 |     await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  410 |     await expect(page.getByRole("link", { name: "Call" })).toBeVisible();
  411 | 
  412 |     await expectNoClientErrors(errors);
  413 |   });
  414 | 
  415 |   test("call and directions actions emit tracking events with vendor context across card, selected preview, and detail views", async ({ page }) => {
  416 |     const errors = trackClientErrors(page);
  417 |     const trackedBodies: Array<Record<string, unknown>> = [];
  418 | 
  419 |     await page.addInitScript(() => {
  420 |       (window as typeof window & {
  421 |         __LOCALMAN_SUPPRESS_ACTION_NAVIGATION__?: boolean;
  422 |       }).__LOCALMAN_SUPPRESS_ACTION_NAVIGATION__ = true;
  423 |     });
  424 | 
  425 |     await page.route("**/api/events", async (route) => {
  426 |       const rawBody = route.request().postData() ?? "";
  427 |       trackedBodies.push(JSON.parse(rawBody) as Record<string, unknown>);
  428 |       await route.fulfill({
  429 |         status: 201,
  430 |         contentType: "application/json",
  431 |         body: JSON.stringify({
  432 |           success: true,
  433 |           data: {
  434 |             accepted: true,
  435 |           },
  436 |           error: null,
  437 |         }),
  438 |       });
  439 |     });
  440 | 
  441 |     await primePublicLocation(page);
  442 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  443 |     await page.goto("/");
> 444 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
      |     ^ Error: expect(received).toBeGreaterThan(expected)
  445 | 
  446 |     const firstCard = page.locator(".vendor-card").first();
  447 |     const vendorId = await firstCard.getAttribute("data-vendor-id");
  448 |     const detailHref = await firstCard.getByRole("link", { name: "View details →" }).getAttribute("href");
  449 |     expect(vendorId).toBeTruthy();
  450 |     expect(detailHref).toBeTruthy();
  451 |     const vendorSlug = detailHref?.split("/vendors/")[1]?.split("?")[0];
  452 |     expect(vendorSlug).toBeTruthy();
  453 | 
  454 |     await firstCard.getByRole("link", { name: "Call" }).click({ noWaitAfter: true });
  455 |     await firstCard.getByRole("link", { name: "Directions" }).click({ noWaitAfter: true });
  456 | 
  457 |     await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
  458 |     const selectedPanel = page.locator(".selected-vendor-panel");
  459 |     await expect(selectedPanel).toBeVisible();
  460 |     await selectedPanel.getByRole("link", { name: "Call" }).click({ noWaitAfter: true });
  461 |     await selectedPanel.getByRole("link", { name: "Directions" }).click({ noWaitAfter: true });
  462 | 
  463 |     await page.goto(detailHref!);
  464 |     await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  465 |     await page.getByRole("link", { name: "Call" }).click({ noWaitAfter: true });
  466 |     await page.getByRole("link", { name: "Directions" }).click({ noWaitAfter: true });
  467 | 
  468 |     await expect.poll(
  469 |       () => trackedBodies.filter((body) =>
  470 |         body.event_type === "call_clicked" || body.event_type === "directions_clicked"
  471 |       ).length,
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
```
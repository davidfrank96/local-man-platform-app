# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> homepage loads, vendor cards render, and details are clickable
- Location: tests/e2e/app-smoke.spec.ts:301:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'The Local Man' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'The Local Man' })

```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
  207 | }
  208 | 
  209 | async function setMockClientTime(page: Page, isoString: string) {
  210 |   const timestamp = new Date(isoString).valueOf();
  211 | 
  212 |   await page.addInitScript(({ now }) => {
  213 |     const RealDate = Date;
  214 | 
  215 |     class MockDate extends RealDate {
  216 |       constructor(...args: unknown[]) {
  217 |         switch (args.length) {
  218 |           case 0:
  219 |             super(now);
  220 |             return;
  221 |           case 1:
  222 |             super(args[0] as string | number | Date);
  223 |             return;
  224 |           case 2:
  225 |             super(args[0] as number, args[1] as number);
  226 |             return;
  227 |           case 3:
  228 |             super(args[0] as number, args[1] as number, args[2] as number);
  229 |             return;
  230 |           case 4:
  231 |             super(args[0] as number, args[1] as number, args[2] as number, args[3] as number);
  232 |             return;
  233 |           case 5:
  234 |             super(
  235 |               args[0] as number,
  236 |               args[1] as number,
  237 |               args[2] as number,
  238 |               args[3] as number,
  239 |               args[4] as number,
  240 |             );
  241 |             return;
  242 |           case 6:
  243 |             super(
  244 |               args[0] as number,
  245 |               args[1] as number,
  246 |               args[2] as number,
  247 |               args[3] as number,
  248 |               args[4] as number,
  249 |               args[5] as number,
  250 |             );
  251 |             return;
  252 |           default:
  253 |             super(
  254 |               args[0] as number,
  255 |               args[1] as number,
  256 |               args[2] as number,
  257 |               args[3] as number,
  258 |               args[4] as number,
  259 |               args[5] as number,
  260 |               args[6] as number,
  261 |             );
  262 |         }
  263 |       }
  264 | 
  265 |       static now() {
  266 |         return now;
  267 |       }
  268 | 
  269 |       static parse(value: string) {
  270 |         return RealDate.parse(value);
  271 |       }
  272 | 
  273 |       static UTC(...args: Parameters<typeof Date.UTC>) {
  274 |         return RealDate.UTC(...args);
  275 |       }
  276 |     }
  277 | 
  278 |     Object.setPrototypeOf(MockDate, RealDate);
  279 |     // @ts-expect-error overriding Date for deterministic browser tests
  280 |     globalThis.Date = MockDate;
  281 |   }, { now: timestamp });
  282 | }
  283 | 
  284 | async function mockReverseGeocode(page: Page, label: string | null, status = 200) {
  285 |   await page.route("**/api/location/reverse**", async (route) => {
  286 |     await route.fulfill({
  287 |       status,
  288 |       contentType: "application/json",
  289 |       body: JSON.stringify({
  290 |         success: true,
  291 |         data: {
  292 |           label,
  293 |         },
  294 |         error: null,
  295 |       }),
  296 |     });
  297 |   });
  298 | }
  299 | 
  300 | test.describe("Phase 3 browser smoke", () => {
  301 |   test("homepage loads, vendor cards render, and details are clickable", async ({ page }) => {
  302 |     const errors = trackClientErrors(page);
  303 | 
  304 |     await primePublicLocation(page);
  305 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  306 |     await page.goto("/");
> 307 |     await expect(page.getByRole("heading", { name: "The Local Man" })).toBeVisible();
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
  308 |     await expect(page.locator(".discovery-layout")).toBeVisible();
  309 |     await expect(page.locator(".discovery-map")).toBeVisible();
  310 |     await expect(page.locator(".location-panel strong")).toHaveText("Using your current location");
  311 |     await expect(page.locator(".location-panel div > span").first()).toHaveText("Wuse II, Abuja");
  312 |     await expect(page.locator(".location-trust-line")).toHaveText("High accuracy");
  313 |     await expect(page.locator(".desktop-vendor-section-nav")).toBeVisible();
  314 |     await expect(
  315 |       page.locator(".desktop-vendor-section-nav").getByRole("button", { name: "Nearby" }),
  316 |     ).toBeVisible();
  317 |     await expect(
  318 |       page.locator(".desktop-vendor-section-nav").getByRole("button", { name: "Recent" }),
  319 |     ).toBeVisible();
  320 |     await expect(
  321 |       page.locator(".desktop-vendor-section-nav").getByRole("button", { name: "Popular" }),
  322 |     ).toBeVisible();
  323 |     await expect(
  324 |       page.locator(".desktop-vendor-section-nav").getByRole("button", { name: "Last selected" }),
  325 |     ).toBeVisible();
  326 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
  327 |     const firstCard = page.locator(".vendor-card").first();
  328 |     await expect(firstCard).toBeVisible();
  329 |     await expect(firstCard.locator(".vendor-card-cue")).toBeVisible();
  330 |     await expect(firstCard.locator(".vendor-card-rating")).toBeVisible();
  331 |     await expect(firstCard.locator(".vendor-card-hours-line")).toContainText("Active hours:");
  332 |     await expect(firstCard.getByText("Tap to preview on map")).toBeVisible();
  333 |     await expect(firstCard.getByRole("link", { name: "Call" })).toBeVisible();
  334 |     await expect(firstCard.getByRole("link", { name: "Directions" })).toBeVisible();
  335 |     await expect(firstCard.getByRole("link", { name: "View details →" })).toBeVisible();
  336 | 
  337 |     const vendorName = await firstCard.getByRole("heading", { level: 3 }).textContent();
  338 |     const vendorId = await firstCard.getAttribute("data-vendor-id");
  339 |     expect(vendorId).toBeTruthy();
  340 |     await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
  341 |     await expect(firstCard).toHaveClass(/selected/);
  342 |     await expect(firstCard.locator(".vendor-card-hours-line")).toContainText("Active hours:");
  343 |     await expect(firstCard.locator(".vendor-card-status-line")).toContainText("km");
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
```
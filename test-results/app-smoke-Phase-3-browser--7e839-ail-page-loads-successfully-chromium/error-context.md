# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> vendor detail page loads successfully
- Location: tests/e2e/app-smoke.spec.ts:2031:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Jabi Office Lunch Bowl' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Jabi Office Lunch Bowl' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e4]:
    - paragraph [ref=e5]: Not found
    - heading "Page unavailable" [level=1] [ref=e6]
    - paragraph [ref=e7]: The requested Local Man route does not exist yet.
    - link "Return home" [ref=e8] [cursor=pointer]:
      - /url: /
  - button "Open Next.js Dev Tools" [ref=e14] [cursor=pointer]:
    - img [ref=e15]
  - alert [ref=e18]
```

# Test source

```ts
  1935 |       }
  1936 | 
  1937 |       await route.continue();
  1938 |     });
  1939 | 
  1940 |     await page.goto("/");
  1941 |     await expect.poll(async () => blockedNonCriticalRequest).toBe(true);
  1942 |     await expect(page.locator('.discovery-map[data-map-mode="maplibre"]')).toBeVisible({
  1943 |       timeout: 10_000,
  1944 |     });
  1945 |     await expect(page.getByText("Vendor list remains available below.")).toHaveCount(0);
  1946 |     await expect(page.locator(".maplibregl-canvas")).toHaveCount(1);
  1947 |     await expectMapLibreVendorMarkers(page);
  1948 |   });
  1949 | 
  1950 |   test("MapLibre initializes on first load after delayed container layout readiness", async ({ page }) => {
  1951 |     const errors = trackClientErrors(page);
  1952 | 
  1953 |     await primePublicLocation(page);
  1954 |     await page.addInitScript(() => {
  1955 |       const installDelayedMapSurfaceStyle = () => {
  1956 |         const root = document.head ?? document.documentElement ?? document.body;
  1957 |         if (!root) {
  1958 |           window.requestAnimationFrame(installDelayedMapSurfaceStyle);
  1959 |           return;
  1960 |         }
  1961 | 
  1962 |         const style = document.createElement("style");
  1963 |         style.textContent = ".maplibre-map-surface{min-height:0 !important;height:0 !important;}";
  1964 |         root.appendChild(style);
  1965 |         window.setTimeout(() => style.remove(), 350);
  1966 |       };
  1967 | 
  1968 |       installDelayedMapSurfaceStyle();
  1969 |     });
  1970 | 
  1971 |     await page.goto("/");
  1972 |     await expect(page.locator('.discovery-map[data-map-mode="loading"]')).toBeVisible();
  1973 |     await expect(page.locator('.discovery-map[data-map-mode="maplibre"]')).toBeVisible({
  1974 |       timeout: 10_000,
  1975 |     });
  1976 |     await expect(page.getByText("Vendor list remains available below.")).toHaveCount(0);
  1977 |     await expect(page.locator(".maplibregl-canvas")).toHaveCount(1);
  1978 |     await expectMapLibreVendorMarkers(page);
  1979 | 
  1980 |     await expectNoClientErrors(errors);
  1981 |   });
  1982 | 
  1983 |   test("MapLibre remains usable after PWA resume events", async ({ page }) => {
  1984 |     const errors = trackClientErrors(page);
  1985 | 
  1986 |     await primePublicLocation(page);
  1987 |     await mockReverseGeocode(page, "Wuse II, Abuja");
  1988 | 
  1989 |     await page.goto("/");
  1990 |     await expect(page.locator('.discovery-map[data-map-mode="maplibre"]')).toBeVisible({
  1991 |       timeout: 10_000,
  1992 |     });
  1993 |     await expect(page.locator(".maplibregl-canvas")).toHaveCount(1);
  1994 |     await expectMapLibreVendorMarkers(page);
  1995 | 
  1996 |     await page.evaluate(() => {
  1997 |       window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  1998 |       window.dispatchEvent(new Event("focus"));
  1999 |       document.dispatchEvent(new Event("visibilitychange"));
  2000 |     });
  2001 | 
  2002 |     await expect(page.locator('.discovery-map[data-map-mode="maplibre"]')).toBeVisible();
  2003 |     await expect(page.locator(".maplibregl-canvas")).toHaveCount(1);
  2004 |     await expectMapLibreVendorMarkers(page);
  2005 |     await expectNoClientErrors(errors);
  2006 |   });
  2007 | 
  2008 |   test("PWA runtime shows branded recovery fallback after repeated stale chunk failure", async ({ page }) => {
  2009 |     await primePublicLocation(page);
  2010 | 
  2011 |     await page.goto("/");
  2012 |     await page.evaluate(() => {
  2013 |       window.sessionStorage.setItem(
  2014 |         "localman:pwa-recovery-reload:2026-05-pwa-runtime-v4",
  2015 |         "2026-05-pwa-runtime-v4",
  2016 |       );
  2017 |       window.dispatchEvent(
  2018 |         new ErrorEvent("error", {
  2019 |           error: new Error("ChunkLoadError: Loading chunk app failed"),
  2020 |           message: "ChunkLoadError: Loading chunk app failed",
  2021 |         }),
  2022 |       );
  2023 |     });
  2024 | 
  2025 |     const fallback = page.locator("#localman-runtime-recovery");
  2026 |     await expect(fallback).toBeVisible();
  2027 |     await expect(fallback).toContainText("Localman needs to reload to continue.");
  2028 |     await expect(fallback.getByRole("button", { name: "Reload Localman" })).toBeVisible();
  2029 |   });
  2030 | 
  2031 |   test("vendor detail page loads successfully", async ({ page }) => {
  2032 |     const errors = trackClientErrors(page);
  2033 | 
  2034 |     await page.goto("/vendors/jabi-office-lunch-bowl");
> 2035 |     await expect(page.getByRole("heading", { name: "Jabi Office Lunch Bowl" })).toBeVisible();
       |                                                                                 ^ Error: expect(locator).toBeVisible() failed
  2036 |     await expect(page.getByRole("link", { name: "Call" })).toBeVisible();
  2037 |     await expect(page.getByRole("link", { name: "Directions" })).toBeVisible();
  2038 |     await expect(page.getByRole("button", { name: "Request Rider" })).toBeVisible();
  2039 |     await expect(page.locator(".vendor-detail-image")).toBeVisible();
  2040 | 
  2041 |     await expectNoClientErrors(errors);
  2042 |   });
  2043 | 
  2044 |   test("vendor detail scroll boundary ends at the Ratings section across responsive widths", async ({ page }) => {
  2045 |     const errors = trackClientErrors(page);
  2046 |     const viewports = [
  2047 |       { height: 740, width: 360 },
  2048 |       { height: 844, width: 390 },
  2049 |       { height: 932, width: 430 },
  2050 |       { height: 1024, width: 768 },
  2051 |       { height: 768, width: 1024 },
  2052 |       { height: 800, width: 1280 },
  2053 |     ];
  2054 | 
  2055 |     for (const viewport of viewports) {
  2056 |       await page.setViewportSize(viewport);
  2057 |       await page.goto("/vendors/jabi-office-lunch-bowl");
  2058 |       await expect(page.getByRole("heading", { name: "Rate this vendor" })).toBeVisible();
  2059 |       await expect(page.getByRole("heading", { name: "Share this vendor with a friend" })).toBeVisible();
  2060 | 
  2061 |       const metrics = await page.evaluate(() => {
  2062 |         const ratingSection = Array.from(
  2063 |           document.querySelectorAll<HTMLElement>(".vendor-detail-section"),
  2064 |         ).find((section) => section.textContent?.includes("Rate this vendor"));
  2065 | 
  2066 |         if (!ratingSection) {
  2067 |           throw new Error("Ratings section is missing from vendor detail.");
  2068 |         }
  2069 | 
  2070 |         const ratingRect = ratingSection.getBoundingClientRect();
  2071 |         const ratingBottom = ratingRect.bottom + window.scrollY;
  2072 |         const documentBottom = document.documentElement.scrollHeight;
  2073 | 
  2074 |         return {
  2075 |           hasHorizontalOverflow: document.documentElement.scrollWidth >
  2076 |             document.documentElement.clientWidth + 1,
  2077 |           trailingGap: documentBottom - ratingBottom,
  2078 |         };
  2079 |       });
  2080 | 
  2081 |       expect(metrics.hasHorizontalOverflow, `horizontal overflow at ${viewport.width}px`).toBe(false);
  2082 |       expect(metrics.trailingGap).toBeGreaterThanOrEqual(-2);
  2083 |       expect(metrics.trailingGap).toBeLessThanOrEqual(2);
  2084 |     }
  2085 | 
  2086 |     await expectNoClientErrors(errors);
  2087 |   });
  2088 | 
  2089 |   test("vendor detail share actions use canonical vendor profile links", async ({ page }) => {
  2090 |     const errors = trackClientErrors(page);
  2091 | 
  2092 |     await page.addInitScript(() => {
  2093 |       const shareStore: {
  2094 |         copied: string;
  2095 |         shared: ShareData | null;
  2096 |       } = {
  2097 |         copied: "",
  2098 |         shared: null,
  2099 |       };
  2100 | 
  2101 |       Object.defineProperty(navigator, "clipboard", {
  2102 |         configurable: true,
  2103 |         value: {
  2104 |           writeText: async (text: string) => {
  2105 |             shareStore.copied = text;
  2106 |           },
  2107 |         },
  2108 |       });
  2109 |       Object.defineProperty(navigator, "share", {
  2110 |         configurable: true,
  2111 |         value: async (data: ShareData) => {
  2112 |           shareStore.shared = data;
  2113 |         },
  2114 |       });
  2115 | 
  2116 |       (
  2117 |         window as typeof window & {
  2118 |           __LOCALMAN_VENDOR_SHARE_STORE__?: typeof shareStore;
  2119 |         }
  2120 |       ).__LOCALMAN_VENDOR_SHARE_STORE__ = shareStore;
  2121 |     });
  2122 | 
  2123 |     await page.goto("/vendors/jabi-office-lunch-bowl");
  2124 | 
  2125 |     const canonicalUrl = `${new URL(page.url()).origin}/vendors/jabi-office-lunch-bowl`;
  2126 |     await expect(
  2127 |       page.getByRole("heading", { name: "Share this vendor with a friend" }),
  2128 |     ).toBeVisible();
  2129 |     await expect(page.getByRole("button", { name: "Share link" })).toBeVisible();
  2130 |     await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveCount(0);
  2131 |     await expect(page.locator(".vendor-detail-actions .vendor-share-actions")).toHaveCount(0);
  2132 |     await expect(
  2133 |       page
  2134 |         .locator(".vendor-detail-section")
  2135 |         .filter({ hasText: "Location" })
```
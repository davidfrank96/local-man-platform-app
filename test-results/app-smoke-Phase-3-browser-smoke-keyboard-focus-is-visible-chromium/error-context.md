# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-smoke.spec.ts >> Phase 3 browser smoke >> keyboard focus is visible
- Location: tests/e2e/app-smoke.spec.ts:1173:3

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not "BODY"
```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
  1104 |       "9.08000, 7.40000",
  1105 |     );
  1106 |     await expect(page.locator(".location-trust-line")).toHaveText("High accuracy");
  1107 | 
  1108 |     await expectNoClientErrors(errors);
  1109 |   });
  1110 | 
  1111 |   test("unavailable location keeps fallback copy calm on desktop and mobile", async ({ page }) => {
  1112 |     const errors = trackClientErrors(page);
  1113 | 
  1114 |     await installMockGeolocation(page, {
  1115 |       kind: "error",
  1116 |       code: 2,
  1117 |       message: "Geolocation unavailable.",
  1118 |     });
  1119 |     await page.goto("/");
  1120 | 
  1121 |     await expect(page.locator(".location-panel strong")).toHaveText("Showing nearby vendors");
  1122 |     await expect(page.locator(".location-panel div > span").first()).toHaveText(
  1123 |       "Turn on location for more accurate nearby vendors.",
  1124 |     );
  1125 |     await expect(page.locator(".location-trust-line")).toHaveCount(0);
  1126 |     await expect(page.getByText("Showing Abuja")).toHaveCount(0);
  1127 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  1128 | 
  1129 |     await page.setViewportSize({ width: 390, height: 844 });
  1130 |     await page.reload();
  1131 | 
  1132 |     await expect(page.locator(".location-panel strong")).toHaveText("Showing nearby vendors");
  1133 |     await expect(page.locator(".location-panel div > span").first()).toHaveText(
  1134 |       "Turn on location for more accurate nearby vendors.",
  1135 |     );
  1136 |     await expect(page.locator(".vendor-card").first()).toBeVisible();
  1137 | 
  1138 |     await expectNoClientErrors(errors);
  1139 |   });
  1140 | 
  1141 |   test("tablet layout keeps map and list balanced", async ({ page }) => {
  1142 |     const errors = trackClientErrors(page);
  1143 | 
  1144 |     await page.setViewportSize({ width: 768, height: 1024 });
  1145 |     await primePublicLocation(page);
  1146 |     await page.goto("/");
  1147 | 
  1148 |     const layout = page.locator(".discovery-layout");
  1149 |     await expect(layout).toBeVisible();
  1150 |     await expect(page.locator(".discovery-map")).toBeVisible();
  1151 |     await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
  1152 |     const firstCard = page.locator(".vendor-card").first();
  1153 |     await expect(firstCard).toBeVisible();
  1154 | 
  1155 |     const layoutBox = await layout.boundingBox();
  1156 |     const mapBox = await page.locator(".discovery-map").boundingBox();
  1157 |     const sidebarBox = await page.locator(".discovery-sidebar").boundingBox();
  1158 | 
  1159 |     expect(layoutBox).not.toBeNull();
  1160 |     expect(mapBox).not.toBeNull();
  1161 |     expect(sidebarBox).not.toBeNull();
  1162 |     expect(mapBox?.width).toBeGreaterThan(0);
  1163 |     expect(sidebarBox?.width).toBeGreaterThan(0);
  1164 | 
  1165 |     const hasHorizontalOverflow = await page.evaluate(
  1166 |       () => document.documentElement.scrollWidth > window.innerWidth + 1,
  1167 |     );
  1168 |     expect(hasHorizontalOverflow).toBe(false);
  1169 | 
  1170 |     await expectNoClientErrors(errors);
  1171 |   });
  1172 | 
  1173 |   test("keyboard focus is visible", async ({ page }) => {
  1174 |     const errors = trackClientErrors(page);
  1175 | 
  1176 |     await primePublicLocation(page);
  1177 |     await page.goto("/");
  1178 | 
  1179 |     let activeElementInfo = null as {
  1180 |       tagName: string | null;
  1181 |       outlineStyle: string | null;
  1182 |       outlineWidth: string | null;
  1183 |     } | null;
  1184 | 
  1185 |     for (let attempt = 0; attempt < 4; attempt += 1) {
  1186 |       activeElementInfo = await page.evaluate(() => {
  1187 |         const element = document.activeElement as HTMLElement | null;
  1188 | 
  1189 |         return {
  1190 |           tagName: element?.tagName ?? null,
  1191 |           outlineStyle: element ? getComputedStyle(element).outlineStyle : null,
  1192 |           outlineWidth: element ? getComputedStyle(element).outlineWidth : null,
  1193 |         };
  1194 |       });
  1195 | 
  1196 |       if (activeElementInfo.tagName && activeElementInfo.tagName !== "BODY") {
  1197 |         break;
  1198 |       }
  1199 | 
  1200 |       await page.keyboard.press("Tab");
  1201 |     }
  1202 | 
  1203 |     expect(activeElementInfo).not.toBeNull();
> 1204 |     expect(activeElementInfo?.tagName).not.toBe("BODY");
       |                                            ^ Error: expect(received).not.toBe(expected) // Object.is equality
  1205 |     expect(activeElementInfo?.outlineStyle).not.toBe("none");
  1206 |     expect(activeElementInfo?.outlineWidth).not.toBe("0px");
  1207 | 
  1208 |     await expectNoClientErrors(errors);
  1209 |   });
  1210 | });
  1211 | 
```
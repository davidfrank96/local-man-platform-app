import { expect, test, type Page } from "@playwright/test";

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

async function primePublicLocation(page: Page) {
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 9.08, longitude: 7.4 });
}

test.describe("Phase 3 browser smoke", () => {
  test("homepage loads, vendor cards render, and details are clickable", async ({ page }) => {
    const errors = trackClientErrors(page);

    await primePublicLocation(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "The Local Man" })).toBeVisible();
    await expect(page.locator(".discovery-layout")).toBeVisible();
    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
    const firstCard = page.locator(".vendor-card").first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator(".vendor-card-cue")).toBeVisible();
    await expect(firstCard.locator(".vendor-card-rating")).toBeVisible();
    await expect(firstCard.getByText(/^Today:/)).toBeVisible();
    await expect(firstCard.getByText("Tap to preview on map")).toBeVisible();
    await expect(firstCard.getByRole("link", { name: "Call" })).toBeVisible();
    await expect(firstCard.getByRole("link", { name: "Directions" })).toBeVisible();
    await expect(firstCard.getByRole("link", { name: "View details →" })).toBeVisible();

    const vendorName = await firstCard.getByRole("heading", { level: 3 }).textContent();
    await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(page.locator(".selected-vendor-panel h2")).toContainText(vendorName ?? "");
    await expect(page.locator(".selected-vendor-panel").getByText(/^Today:/)).toBeVisible();
    await expect(page.locator(".selected-vendor-panel").getByRole("link", { name: "Call" })).toBeVisible();
    await expect(
      page.locator(".selected-vendor-panel").getByRole("link", { name: "Directions" }),
    ).toBeVisible();
    await expect(
      page.locator(".selected-vendor-panel").getByRole("link", { name: "View details" }),
    ).toBeVisible();

    await firstCard.getByRole("link", { name: "View details →" }).click();

    await expect(page).toHaveURL(/\/vendors\/[a-z0-9-]+(\?.*)?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Call" })).toBeVisible();

    await expectNoClientErrors(errors);
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
    await page.goto("/search?q=rice");
    await expect(page.getByRole("heading", { name: "Search local food" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue("rice");
    await expect(page.locator(".discovery-layout")).toBeVisible();

    await expectNoClientErrors(errors);
  });

  test("discovery state restores after vendor detail back navigation", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await page.goto("/");

    await page.getByRole("textbox", { name: "Search" }).fill("rice");
    await page.locator('select[name="radiusKm"]').selectOption("30");
    const applyButton = page.getByRole("button", { name: "Apply" });
    await applyButton.scrollIntoViewIfNeeded();
    await applyButton.click();

    await expect(page).toHaveURL(/q=rice/);
    await expect(page).toHaveURL(/radius_km=30/);

    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
    const firstCard = page.locator(".vendor-card").first();
    const vendorName = await firstCard.getByRole("heading", { level: 3 }).textContent();
    await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();

    await expect(page.locator(".selected-vendor-panel h2")).toContainText(vendorName ?? "");
    await expect(page).toHaveURL(/selected=/);

    await firstCard.getByRole("link", { name: "View details →" }).click();
    await expect(page).toHaveURL(/\/vendors\/[a-z0-9-]+(\?.*)?$/);

    await page.goBack();

    await expect(page).toHaveURL(/q=rice/);
    await expect(page).toHaveURL(/radius_km=30/);
    await expect(page.locator(".vendor-card").first()).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue("rice");
    await expect(page.locator('select[name="radiusKm"]')).toHaveValue("30");
    await expect(page.locator(".selected-vendor-panel h2")).toContainText(vendorName ?? "");

    await expectNoClientErrors(errors);
  });

  test("back to map link restores discovery state", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await page.goto("/");

    await page.getByRole("textbox", { name: "Search" }).fill("rice");
    await page.locator('select[name="radiusKm"]').selectOption("30");
    await page.getByRole("button", { name: "Apply" }).click();

    await expect(page).toHaveURL(/q=rice/);
    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);

    const firstCard = page.locator(".vendor-card").first();
    const vendorName = await firstCard.getByRole("heading", { level: 3 }).textContent();
    await firstCard.getByRole("button", { name: /Preview .* on map/ }).click();
    await expect(page.locator(".selected-vendor-panel h2")).toContainText(vendorName ?? "");

    await firstCard.getByRole("link", { name: "View details →" }).click();
    await expect(page).toHaveURL(/returnTo=/);

    await page.getByRole("link", { name: "Back to map" }).click();

    await expect(page).toHaveURL(/q=rice/);
    await expect(page).toHaveURL(/radius_km=30/);
    await expect(page).toHaveURL(/selected=/);
    await expect.poll(async () => page.locator(".vendor-card").count()).toBeGreaterThan(0);
    await expect(page.locator(".vendor-card").first()).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue("rice");
    await expect(page.locator('select[name="radiusKm"]')).toHaveValue("30");
    await expect(page.locator(".selected-vendor-panel h2")).toContainText(vendorName ?? "");

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

  test("mobile homepage keeps core content visible", async ({ page }) => {
    const errors = trackClientErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await primePublicLocation(page);
    await page.goto("/");

    await expect(page.locator(".discovery-map")).toBeVisible();
    await expect(page.locator(".vendor-card").first()).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

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

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

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

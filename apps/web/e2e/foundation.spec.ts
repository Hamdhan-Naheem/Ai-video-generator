import { expect, test } from "@playwright/test";

test("shared navigation works and preserves the approved canvas", async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveURL(/\/preview\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Bring your next idea to life.", exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const nav = page.getByRole("navigation", { name: isMobile ? "Mobile navigation" : "Main navigation", exact: true });
  await expect(nav.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 246, 242)");
  await expect(page.getByRole("main")).toHaveCSS("background-color", "rgb(247, 246, 242)");
  await page.screenshot({ path: testInfo.outputPath("foundation.png"), fullPage: true });

  for (const label of ["Create video", "My videos", "Settings"]) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("main")).toHaveCSS("background-color", "rgb(247, 246, 242)");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const link of await nav.getByRole("link").all()) {
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  if (isMobile) {
    await page.setViewportSize({ width: 320, height: 568 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const backLink = nav.getByRole("link", { name: "Dashboard", exact: true });
    await backLink.scrollIntoViewIfNeeded();
    await backLink.tap();
    await expect(page.getByRole("heading", { name: "Bring your next idea to life.", exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("keyboard skip link reaches the content", async ({ page }) => {
  await page.goto("/preview/dashboard");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("unavailable paths recover to preview", async ({ page }) => {
  const response = await page.goto("/preview/not-a-section");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page isn’t available" })).toBeVisible();
  await page.getByRole("link", { name: "Back to preview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bring your next idea to life.", exact: true })).toBeVisible();
});


test("Dashboard follows the design and labels fixture data", async ({ page, isMobile }) => {
  await page.goto("/preview/dashboard");
  await expect(page.getByRole("heading", { name: "Recent projects", exact: true })).toBeVisible();
  await expect(page.getByText("Sample project data", { exact: true })).toBeVisible();
  await expect(page.getByText("Design preview —", { exact: false })).toBeVisible();
  const cards = page.locator(".mode-card");
  await expect(cards).toHaveCount(3);
  for (const [index, mode] of ["education", "software", "branding"].entries()) {
    await expect(cards.nth(index)).toHaveAttribute("href", "/preview/create?mode=" + mode);
  }
  await expect(page.getByRole("button", { name: "Open video", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
  const first = await cards.nth(0).boundingBox();
  const second = await cards.nth(1).boundingBox();
  expect(Boolean(first && second && (isMobile ? second.y > first.y : second.x > first.x))).toBe(true);
  const broken = await page.locator("main img").evaluateAll(images => images.some(image => !(image as HTMLImageElement).complete || !(image as HTMLImageElement).naturalWidth));
  expect(broken).toBe(false);
  await cards.nth(0).click();
  await expect(page).toHaveURL(/mode=education$/);
});

import { expect, test } from "@playwright/test";

test("selection opens each mode destination and returns to all types", async ({ page }) => {
  await page.goto("/preview/create");
  for (const [mode, action, heading] of [
    ["education", "Create education video", "Create an education video"],
    ["software", "Create software showcase", "Create a software showcase"],
    ["branding", "Create branding video", "Create a product branding video"],
  ]) {
    await page.getByRole("link", { name: action, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`mode=${mode}$`));
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page.getByText("Its input form has been designed", { exact: false })).toBeVisible();
    await page.getByRole("link", { name: "All video types", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create video", exact: true })).toBeVisible();
  }
  await page.goto("/preview/create?mode=unknown");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Choose one of the three types");
});

test("sample profile validates locally and makes no persistent account change", async ({ page }) => {
  await page.goto("/preview/settings");
  const name = page.getByRole("textbox", { name: "Full name", exact: true });
  const save = page.getByRole("button", { name: "Save changes", exact: true });
  await expect(save).toBeDisabled();
  await expect(page.getByRole("textbox", { name: /Email/ })).toHaveAttribute("readonly", "");
  await name.fill("   ");
  await name.press("Tab");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Enter a full name");
  await expect(save).toBeDisabled();
  await name.fill("Sam Preview");
  await save.click();
  await expect(page.getByRole("status")).toContainText("this page only");
  await expect(save).toBeDisabled();
  await page.reload();
  await expect(name).toHaveValue("Alex Morgan");
});

test("preview dialogs trap focus, close with Escape and never submit account actions", async ({ page, isMobile }) => {
  await page.goto("/preview/settings");
  if (isMobile) await page.setViewportSize({ width: 320, height: 568 });
  for (const [action, title, submit] of [
    ["Change password", "Change password", "Update password"],
    ["Sign out", "Sign out?", "Sign out"],
    ["Delete account", "Delete your account?", "Delete account"],
  ]) {
    const trigger = page.getByRole("button", { name: action, exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: title, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
    await expect(dialog.getByRole("button", { name: submit, exact: true })).toBeDisabled();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await page.goto("/preview/videos");
  await page.getByRole("button", { name: "Video actions", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("This is a design sample");
  await page.getByRole("button", { name: "Close preview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Saved videos", exact: false })).toBeVisible();
});

test("all three layouts retain colors, readable controls and mobile width", async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const section of ["create", "videos", "settings"]) {
    await page.goto(`/preview/${section}`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("main")).toHaveCSS("background-color", "rgb(247, 246, 242)");
    await expect(page.getByText("Application scaffold", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${section}.png`), fullPage: true });
    if (isMobile) {
      await page.setViewportSize({ width: 320, height: 568 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.setViewportSize({ width: 390, height: 844 });
    }
  }
  expect(errors).toEqual([]);
});

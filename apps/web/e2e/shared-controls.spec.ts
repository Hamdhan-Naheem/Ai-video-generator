import { expect, test } from "@playwright/test";

test("shared fields expose labels, errors, limits and native keyboard choices", async ({ page }) => {
  await page.goto("/preview/controls");
  const topic = page.getByRole("textbox", { name: "What would you like to explain?" });
  await page.getByRole("button", { name: "Run loading/error example" }).click();
  await expect(topic).toBeFocused();
  await expect(topic).toHaveAttribute("aria-invalid", "true");
  await expect(topic).toHaveAccessibleDescription(/Be specific.*Maximum 300 characters.*Enter a topic/);
  await topic.fill("Solar energy");
  await expect(topic).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("12 / 300", { exact: true })).toBeVisible();
  await topic.fill("x".repeat(300));
  await topic.press("End");
  await topic.press("x");
  await expect(topic).toHaveValue("x".repeat(300));
  const beginner = page.getByRole("radio", { name: /Beginner/ });
  await beginner.focus();
  await beginner.press("ArrowRight");
  await expect(page.getByRole("radio", { name: /School learner/ })).toBeChecked();
  const permission = page.getByRole("checkbox", { name: /I have permission/ });
  await permission.focus();
  await permission.press("Space");
  await expect(permission).toBeChecked();
  await expect(page.getByRole("textbox", { name: "Language", exact: true })).toHaveAttribute("readonly", "");
  await expect(page.getByRole("textbox", { name: "Unavailable field" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Generate video", exact: true })).toBeDisabled();
});

test("loading prevents duplicate submission, failure preserves inputs and retry recovers without a request", async ({ page }) => {
  const mutations: string[] = [];
  page.on("request", request => { if (request.method() !== "GET") mutations.push(request.method()); });
  await page.goto("/preview/controls");
  const topic = page.getByRole("textbox", { name: "What would you like to explain?" });
  await topic.fill("How solar panels work");
  await page.getByRole("checkbox", { name: /I have permission/ }).check();
  await page.getByRole("button", { name: "Run loading/error example" }).click();
  await expect(page.getByRole("button", { name: "Checking example…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Checking example…" })).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Simulated request failed");
  await expect(topic).toHaveValue("How solar panels work");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Checking example…" })).toBeDisabled();
  await expect(page.getByRole("status").filter({ hasText: "Example recovered" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run loading/error example" })).toBeEnabled();
  expect(mutations).toEqual([]);
});

test("password visibility retains value and focus and never submits the example", async ({ page }) => {
  await page.goto("/preview/controls");
  const password = page.getByLabel("Sample password", { exact: true });
  await password.fill("sample-only-123");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show sample password", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  const hide = page.getByRole("button", { name: "Hide sample password", exact: true });
  await expect(hide).toBeFocused();
  await expect(hide).toHaveAttribute("aria-pressed", "true");
  await hide.press("Space");
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("sample-only-123");
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("dialog supports reverse tab, Escape, close and explicit discard with focus return", async ({ page }) => {
  await page.goto("/preview/controls");
  const topic = page.getByRole("textbox", { name: "What would you like to explain?" });
  await topic.fill("Keep this topic");
  const trigger = page.getByRole("button", { name: "Open dialog example" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Discard example inputs?" });
  await expect(dialog.getByRole("button", { name: "Keep editing" })).toBeFocused();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(topic).toHaveValue("Keep this topic");
  await trigger.click();
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Discard example inputs", exact: true }).click();
  await expect(topic).toHaveValue("");
  await expect(trigger).toBeFocused();
});

test("controls retain palette, touch targets and short narrow viewport access", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/preview/controls");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("main")).toHaveCSS("background-color", "rgb(247, 246, 242)");
  await page.screenshot({ path: testInfo.outputPath("shared-controls.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 480 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of ["Run loading/error example", "Show sample password", "Open dialog example"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "Open dialog example" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Keep editing" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("textbox", { name: "What would you like to explain?" }).fill("Sample topic");
  await page.getByRole("checkbox", { name: /I have permission/ }).check();
  await page.getByRole("button", { name: "Run loading/error example" }).click();
  await expect(page.locator(".ui-spinner")).toHaveCSS("animation-name", "none");
  expect(errors).toEqual([]);
});

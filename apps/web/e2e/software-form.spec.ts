import { expect, test } from "@playwright/test";

test("Software opens with blank inputs, empty uploads and matching settings", async ({ page }) => {
  await page.goto("/preview/create");
  await page.getByRole("link", { name: "Create software showcase", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Create a software showcase", exact: true })).toBeVisible();
  for (const label of ["Software name", "What does your software do?", "Features to highlight"]) await expect(page.getByRole("textbox", { name: label, exact: true })).toHaveValue("");
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Intended use" })).toHaveValue("");
  await expect(page.getByRole("radio", { name: /60 sec/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Landscape/ })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Narration voice" })).toHaveValue("kore");
  for (const checkbox of await page.getByRole("checkbox").all()) await expect(checkbox).not.toBeChecked();
  await expect(page.getByRole("status")).toContainText("No files added");
  await expect(page.getByText("sprint-overview-board.png", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "File requirements" })).toContainText("up to 8 screenshots, 5 MB each");
  await expect(page.getByRole("list", { name: "File requirements" })).toContainText("45 MB and 120 seconds");
  await expect(page.getByRole("list", { name: "File requirements" })).toContainText("60 MB combined");
  await page.getByRole("link", { name: "All video types", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Create video", exact: true })).toBeVisible();
});

test("Software validates required text and the combined description/features budget", async ({ page }) => {
  await page.goto("/preview/create?mode=software");
  const name = page.getByRole("textbox", { name: "Software name", exact: true });
  await name.fill("  "); await name.press("Tab");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription(/Enter your software name/);
  await name.fill("Task planner");
  await expect(name).not.toHaveAttribute("aria-invalid", "true");
  const description = page.getByRole("textbox", { name: "What does your software do?", exact: true });
  await description.fill("   "); await description.press("Tab");
  await expect(description).toHaveAttribute("aria-invalid", "true");
  await description.fill("x".repeat(3999));
  const features = page.getByRole("textbox", { name: "Features to highlight", exact: true });
  await features.fill("ab");
  await expect(features).toHaveAttribute("aria-invalid", "true");
  await expect(features).toHaveAccessibleDescription(/4,000 characters or fewer/);
  await expect(page.locator("#software-text-budget")).toContainText("4,001 / 4,000");
  await expect(description).toHaveValue("x".repeat(3999));
  await description.fill("A tool for planning projects.");
  await expect(features).not.toHaveAttribute("aria-invalid", "true");
  await expect(features).toHaveValue("ab");
  const use = page.getByRole("combobox", { name: "Intended use" });
  await use.focus(); await use.press("Tab");
  await expect(use).toHaveAttribute("aria-invalid", "true");
  await use.selectOption("promotional");
  await expect(use).not.toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAttribute("maxlength", "120");
  await name.fill("x".repeat(120)); await name.press("End"); await name.press("x");
  await expect(name).toHaveValue("x".repeat(120));
  await page.getByRole("radio", { name: /90 sec/ }).check();
  await page.getByRole("radio", { name: /Portrait/ }).check();
  await expect(features).toHaveValue("ab");
});

test("Software makes no upload or mutation request and prevents dropped-file navigation", async ({ page }) => {
  const mutations: string[] = [];
  page.on("request", request => { if (request.method() !== "GET") mutations.push(request.method()); });
  await page.goto("/preview/create?mode=software");
  await page.getByRole("textbox", { name: "Software name", exact: true }).fill("Task planner");
  await page.getByRole("textbox", { name: "What does your software do?", exact: true }).fill("Organizes project tasks.");
  await page.getByRole("combobox", { name: "Intended use" }).selectOption("personal-learning");
  for (const checkbox of await page.getByRole("checkbox").all()) await checkbox.check();
  for (const label of ["Choose files", "Preview voice", "Save draft", "Generate video"]) await expect(page.getByRole("button", { name: label, exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Choose files", exact: true })).toHaveAccessibleDescription(/not connected/);
  await expect(page.getByRole("button", { name: "Generate video", exact: true })).toHaveAccessibleDescription(/not connected/);
  const prevented = await page.locator(".software-upload-zone").evaluate(element => {
    const transfer = new DataTransfer(); transfer.items.add(new File(["sample"], "example.png", { type: "image/png" }));
    const event = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer });
    element.dispatchEvent(event); return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  await expect(page.getByRole("status")).toContainText("No file was opened or uploaded");
  await expect(page).toHaveURL(/mode=software$/);
  await expect(page.locator('input[type="file"], audio, video')).toHaveCount(0);
  await nameEnter(page);
  expect(mutations).toEqual([]);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Software name", exact: true })).toHaveValue("");
});

async function nameEnter(page: import("@playwright/test").Page) {
  await page.getByRole("textbox", { name: "Software name", exact: true }).press("Enter");
  await expect(page).toHaveURL(/mode=software$/);
}

test("Software matches responsive source/settings structure and accessible shared controls", async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/preview/create?mode=software");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("main")).toHaveCSS("background-color", "rgb(247, 246, 242)");
  expect(await page.locator("[id]").evaluateAll(elements => { const ids = elements.map(element => element.id); return ids.filter((id,index) => ids.indexOf(id) !== index); })).toEqual([]);
  const media = await page.locator(".software-media").boundingBox();
  const settings = await page.locator(".education-settings").boundingBox();
  const acknowledgments = await page.locator(".education-acknowledgments").boundingBox();
  if (isMobile) { expect(settings!.y).toBeGreaterThan(media!.y); expect(acknowledgments!.y).toBeGreaterThan(settings!.y); }
  else expect(settings!.x).toBeGreaterThan(media!.x + media!.width);
  await page.screenshot({ path: testInfo.outputPath("software-form.png"), fullPage: true });
  for (const size of [{width:320,height:480},{width:768,height:900},{width:1024,height:900}]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({width:320,height:480});
  await page.getByRole("combobox", { name: "Narration voice" }).focus(); await page.keyboard.press("Tab");
  await expect(page.getByRole("checkbox", { name: /I have permission/ })).toBeFocused();
  expect(errors).toEqual([]);
});

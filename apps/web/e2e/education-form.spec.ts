import { expect, test } from "@playwright/test";

test("Education opens from mode selection with empty inputs and approved defaults", async ({ page }) => {
  await page.goto("/preview/create");
  await page.getByRole("link", { name: "Create education video", exact: true }).click();
  await expect(page).toHaveURL(/mode=education$/);
  await expect(page.getByRole("heading", { name: "Create an education video", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "What would you like to explain?" })).toHaveValue("");
  await expect(page.getByRole("radio", { name: /Beginner/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /60 sec/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Landscape/ })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Intended use" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Narration voice" })).toHaveValue("kore");
  await expect(page.getByRole("combobox", { name: "Narration voice" }).getByRole("option")).toHaveCount(1);
  for (const checkbox of await page.getByRole("checkbox").all()) await expect(checkbox).not.toBeChecked();
  await expect(page.getByText("English (Fixed)", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.locator("details.education-optional")).not.toHaveAttribute("open", "");
  await page.getByRole("link", { name: "All video types", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Create video", exact: true })).toBeVisible();
});

test("Education validates touched required fields and keeps settings and optional inputs", async ({ page }) => {
  await page.goto("/preview/create?mode=education");
  const topic = page.getByRole("textbox", { name: "What would you like to explain?" });
  await topic.fill("   ");
  await topic.press("Tab");
  await expect(topic).toHaveAttribute("aria-invalid", "true");
  await expect(topic).toHaveAccessibleDescription(/Enter a topic/);
  await topic.fill("How solar panels work");
  await expect(topic).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("21 / 300", { exact: true })).toBeVisible();
  const use = page.getByRole("combobox", { name: "Intended use" });
  await use.focus();
  await use.press("Tab");
  await expect(use).toHaveAttribute("aria-invalid", "true");
  await use.selectOption("promotional");
  await expect(use).not.toHaveAttribute("aria-invalid", "true");
  const beginner = page.getByRole("radio", { name: /Beginner/ });
  await beginner.focus();
  await beginner.press("ArrowRight");
  await expect(page.getByRole("radio", { name: /School learner/ })).toBeChecked();
  await page.getByRole("radio", { name: /90 sec/ }).check();
  await page.getByRole("radio", { name: /Portrait/ }).check();
  await page.locator("summary").filter({ hasText: "Optional details" }).click();
  const objective = page.getByRole("textbox", { name: "Learning objective", exact: true });
  await objective.fill("Understand electricity conversion");
  const notes = page.getByRole("textbox", { name: "Reference notes", exact: true });
  await notes.fill("Solar panels convert sunlight into electricity.");
  await page.locator("summary").filter({ hasText: "Optional details" }).click();
  await page.locator("summary").filter({ hasText: "Optional details" }).click();
  await expect(objective).toHaveValue("Understand electricity conversion");
  await expect(notes).toHaveValue("Solar panels convert sunlight into electricity.");
  await expect(topic).toHaveAttribute("maxlength", "300");
  await expect(objective).toHaveAttribute("maxlength", "500");
  await expect(notes).toHaveAttribute("maxlength", "10000");
  await topic.fill("x".repeat(300));
  await topic.press("End"); await topic.press("x");
  await expect(topic).toHaveValue("x".repeat(300));
  await expect(page.getByRole("radio", { name: /90 sec/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Portrait/ })).toBeChecked();
});

test("Education never submits, saves or plays audio and explains availability", async ({ page }) => {
  const mutations: string[] = [];
  page.on("request", request => { if (request.method() !== "GET") mutations.push(request.method()); });
  await page.goto("/preview/create?mode=education");
  await page.getByRole("textbox", { name: "What would you like to explain?" }).fill("Solar energy");
  await page.getByRole("combobox", { name: "Intended use" }).selectOption("personal-learning");
  const rights = page.getByRole("checkbox", { name: /I have permission/ });
  await rights.focus(); await rights.press("Tab");
  await expect(rights).toHaveAttribute("aria-invalid", "true");
  await rights.check();
  await expect(rights).not.toHaveAttribute("aria-invalid", "true");
  await page.getByRole("checkbox", { name: /external AI services/ }).check();
  for (const name of ["Save draft", "Generate video", "Preview voice"]) await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Generate video", exact: true })).toHaveAccessibleDescription(/not connected/);
  await expect(page.getByRole("button", { name: "Preview voice", exact: true })).toHaveAccessibleDescription(/not connected/);
  await page.locator("summary").filter({ hasText: "Optional details" }).click();
  await page.getByRole("textbox", { name: "Learning objective", exact: true }).fill("Understand energy");
  await page.getByRole("textbox", { name: "Learning objective", exact: true }).press("Enter");
  await expect(page).toHaveURL(/mode=education$/);
  expect(mutations).toEqual([]);
  await expect(page.locator("audio,video")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "What would you like to explain?" })).toHaveValue("");
});

test("Education preserves responsive structure, field order and shared palette", async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/preview/create?mode=education");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.locator("[id]").evaluateAll(elements => { const ids = elements.map(element => element.id); return ids.filter((id,index) => ids.indexOf(id) !== index); })).toEqual([]);
  await expect(page.getByRole("main")).toHaveCSS("background-color", "rgb(247, 246, 242)");
  await expect(page.locator(".education-intro img")).toHaveJSProperty("naturalWidth", 220);
  const source = await page.locator(".education-source").boundingBox();
  const settings = await page.locator(".education-settings").boundingBox();
  const topic = await page.locator(".education-topic").boundingBox();
  if (isMobile) {
    expect(settings!.y).toBeGreaterThan(topic!.y);
    const permission = await page.locator(".education-acknowledgments").boundingBox();
    expect(permission!.y).toBeGreaterThan(settings!.y);
  } else expect(settings!.x).toBeGreaterThan(source!.x + source!.width);
  await page.screenshot({ path: testInfo.outputPath("education-form.png"), fullPage: true });
  for (const viewport of [{width:320,height:568},{width:768,height:900},{width:1024,height:900}]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({width:320,height:480});
  await page.getByRole("combobox", { name: "Narration voice" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("checkbox", { name: /I have permission/ })).toBeFocused();
  await expect(page.getByRole("radio", { name: /Portrait/ })).toBeVisible();
  expect(errors).toEqual([]);
});

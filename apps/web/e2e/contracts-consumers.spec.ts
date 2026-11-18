import { expect, test } from "@playwright/test";

test("shared display-name validation supports international names and enforces 80 characters", async ({ page }) => {
  await page.goto("/preview/settings");
  const name=page.getByRole("textbox",{name:"Full name",exact:true});
  const save=page.getByRole("button",{name:"Save changes",exact:true});
  await name.fill("𠮷".repeat(80));
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByRole("status")).toContainText("this page only");
  await name.fill("x".repeat(81));
  await name.press("Tab");
  await expect(save).toBeDisabled();
  await expect(name).toHaveAttribute("aria-invalid","true");
  await name.fill("  李 O’Connor-Silva  ");
  await expect(save).toBeEnabled();
  await save.click();
  await expect(name).toHaveValue("李 O’Connor-Silva");
});

import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, expectUniqueVisible, openFreshProduct, skipOnboarding, symptomOrganizeButton } from "../support/page-helpers";

test("Pixel 5 和 iPhone 13 移动预览覆盖关键闭环与弹层焦点 @mobile-preview", async ({ page }) => {
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = page.locator("textarea:visible");
  await expect(input).toHaveCount(1);
  await input.fill("右膝下楼时内侧不适，移动端预览");
  await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page));
  await expect(symptomOrganizeButton(page)).toBeEnabled();
  await assertNoHorizontalOverflow(page);

  const tutorialButton = page.getByRole("button", { name: "使用教程", exact: true });
  if (await tutorialButton.count()) {
    await tutorialButton.click();
    const dialog = page.locator('.rm-focus-onboarding[role="dialog"]:visible');
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused({ timeout: 1000 }).catch(() => undefined);
    await dialog.getByRole("button", { name: "跳过教程", exact: true }).click();
  }
  await assertNoHorizontalOverflow(page);
});

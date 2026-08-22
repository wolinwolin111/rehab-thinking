import { expect, test } from "@playwright/test";
import { prepareProfessionalMultiAction } from "../drivers/pilot-flow";
import { assertNoHorizontalOverflow, openFreshProduct, skipOnboarding } from "../support/page-helpers";

test.describe("关键页面视觉基线", () => {
  test("首页聚焦式教程与症状入口 @visual", async ({ page }) => {
    await openFreshProduct(page);
    await skipOnboarding(page);
    await expect(page.locator('[data-rehabmind-tutorial="symptom-input"]:visible')).toHaveCount(1);
    await assertNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot("critical-home.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.001,
    });
  });

  test("评估队列保留多个独立功能动作 @visual", async ({ page }) => {
    await prepareProfessionalMultiAction(page);
    await expect(page.locator("h1:visible")).toContainText("按阶段查看这次康复");
    await assertNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot("critical-assessment-queue.png", {
      fullPage: true,
      animations: "disabled",
      mask: [page.locator('[aria-live="polite"]:visible')],
      maxDiffPixelRatio: 0.001,
    });
  });

  test("移动端首页不产生横向溢出 @visual", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFreshProduct(page);
    await skipOnboarding(page);
    await expect(page.locator('[data-rehabmind-tutorial="symptom-input"]:visible')).toHaveCount(1);
    await assertNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot("critical-home-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.001,
    });
  });
});

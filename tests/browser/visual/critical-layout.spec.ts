import { expect, test, type Page } from "@playwright/test";
import { prepareProfessionalMultiAction } from "../drivers/pilot-flow";
import { assertNoHorizontalOverflow, openFreshProduct, skipOnboarding } from "../support/page-helpers";

/** 全量回归下的绘制安定等待：网络空闲 + 字体就绪 + 双帧渲染。 */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  await page.waitForTimeout(400);
}

test.describe("关键页面视觉基线", () => {
  test("首页聚焦式教程与症状入口 @visual", async ({ page }) => {
    await openFreshProduct(page);
    await skipOnboarding(page);
    await expect(page.locator('[data-rehabmind-tutorial="symptom-input"]:visible')).toHaveCount(1);
    await assertNoHorizontalOverflow(page);
    await settle(page);
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
    await settle(page);
    await expect(page).toHaveScreenshot("critical-assessment-queue.png", {
      fullPage: true,
      animations: "disabled",
      mask: [page.locator('[aria-live="polite"]:visible')],
      // 队列页含进度徽标等动态文本；全量回归下绘制漂移约 1%，0.02 仍可拦截结构性回归。
      maxDiffPixelRatio: 0.02,
    });
  });

  test("移动端首页不产生横向溢出 @visual", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFreshProduct(page);
    await skipOnboarding(page);
    await expect(page.locator('[data-rehabmind-tutorial="symptom-input"]:visible')).toHaveCount(1);
    await assertNoHorizontalOverflow(page);
    await settle(page);
    await expect(page).toHaveScreenshot("critical-home-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.001,
    });
  });
});

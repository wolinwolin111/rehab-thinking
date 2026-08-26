import { expect, test } from "@playwright/test";
import { expectUniqueVisible, openFreshProduct, skipOnboarding, symptomOrganizeButton } from "../support/page-helpers";

test("Firefox 只执行安全停止和加重等高风险流程 @firefox-risk", async ({ page }) => {
  await openFreshProduct(page);
  await skipOnboarding(page);
  await page.locator("textarea:visible").fill("昨天右脚踝扭伤后明显肿胀，走路疼痛");
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await expect(page.locator("main")).toContainText(/踝|症状|安全/);
});

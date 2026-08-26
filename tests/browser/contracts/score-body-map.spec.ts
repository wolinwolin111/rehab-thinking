import { expect, test, type Page } from "@playwright/test";
import { expectUniqueVisible, openFreshProduct, skipOnboarding, symptomOrganizeButton } from "../support/page-helpers";
import { prepareGuidedChiefProgression } from "../drivers/pilot-flow";

async function openComplaintLocationPicker(page: Page) {
  await openFreshProduct(page);
  await skipOnboarding(page);
  await page.locator("textarea:visible").fill("右膝下蹲时内侧不适，有三个月了");
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await page.getByRole("button", { name: /自助康复/ }).click();
  await page.getByRole("button", { name: /下一步/ }).click();
  await expect(page.locator(".rm-lower-limb-picker:visible")).toBeVisible();
}

async function chooseRightKneeMedial(page: Page) {
  await page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "右侧" }).first().click();
  await page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "膝盖" }).first().click();
  await page.locator('[aria-label="右侧 · 膝内侧关节线"]:visible').click();
}

test("SCORE-UI-01 评分滑杆输入、键盘端点和状态文案保持一致", async ({ page }) => {
  await prepareGuidedChiefProgression(page, { stopAtBaselineScore: true });
  const score = page.locator(".rm-score:visible").first();
  const slider = await expectUniqueVisible(page, "评分滑杆", score.locator('input[type="range"]'));

  await slider.fill("4");
  await expect(slider).toHaveValue("4");
  await expect(score.locator("output")).toContainText("4");
  await expect(score.locator(".rm-score-guide")).toContainText("4/10");

  await slider.press("End");
  await expect(slider).toHaveValue("10");
  await expect(score.locator("output")).toContainText("10");
  await slider.press("Home");
  await expect(slider).toHaveValue("0");
  await expect(score.locator(".rm-score-guide")).toContainText("0/10");
  await expect(score.locator(".rm-score-status")).toContainText(/记录|松手/);
});

test("BODY-MAP-UI-01 侧别和具体标记组成独立身份，删除一个不会误删另一个", async ({ page }) => {
  await openComplaintLocationPicker(page);
  await chooseRightKneeMedial(page);
  await expect(page.getByRole("button", { name: "删除右侧膝内侧关节线", exact: true })).toBeVisible();

  await page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "左侧" }).first().click();
  const leftZone = page.locator('[aria-label^="左侧 · "]:visible').first();
  await leftZone.click();
  await expect(page.getByRole("button", { name: /^删除左侧/, exact: false })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "删除右侧膝内侧关节线", exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "删除右侧膝内侧关节线", exact: true }).click();
  await expect(page.getByRole("button", { name: "删除右侧膝内侧关节线", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^删除左侧/, exact: false })).toHaveCount(1);
});

test("BODY-MAP-UI-02 切换主要大部位必须保留旧标记并要求显式清理", async ({ page }) => {
  await openComplaintLocationPicker(page);
  await chooseRightKneeMedial(page);
  await page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "大腿" }).first().click();
  await page.locator('[aria-label^="右侧 · "]:visible').first().click();
  await expect(page.locator(".rm-location-selection-list article:visible")).toHaveCount(2);
  await expect(page.getByRole("status")).toContainText(/删除|清理|不能混入/);
});

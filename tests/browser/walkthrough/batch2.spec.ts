import { test } from "@playwright/test";

// 走查审查资产（非回归断言）：默认跳过，仅 WALKTHROUGH_REVIEW=1 时执行。
const WALK = process.env.WALKTHROUGH_REVIEW === "1";
test.skip(!WALK, "走查默认跳过（WALKTHROUGH_REVIEW=1 启用）");
import { launchWorkbenchScenario, collectRuntimeErrors } from "../support/page-helpers";
import { driveGuidedAcuteAnkleToSafetyConfirmation, prepareGuidedChiefProgression } from "../drivers/pilot-flow";
import { answerGuidedAssessment } from "./drivers";
import { beginWalk, walkLog, snap } from "./recorder";
import { writeFileSync } from "node:fs";

// 双视角走查 · 第二批：P2-P8（患者视角，7 案例）。
// 主路径案例完整走；分支型案例（双侧/专项/组织路径/出口）用定向场景直达并记录关键屏。

async function saveLog(caseId: string) {
  const snaps = walkLog(caseId);
  writeFileSync(`artifacts/quality/walkthrough/${caseId}.json`, JSON.stringify(snaps, null, 1), "utf8");
  console.log(`WALK-${caseId}: ${snaps.length} snaps`);
}

test("WALK-P2 自助踝外侧疼+上周崴脚：完整评估到处理 @walkthrough", async ({ page }) => {
  const caseId = "P2-ankle-self";
  beginWalk(caseId);
  test.setTimeout(300_000);
  // 踝自助入口到安全确认
  await driveGuidedAcuteAnkleToSafetyConfirmation(page);
  await page.waitForTimeout(600);
  await snap(page, caseId, "踝自助安全确认");
  // 完成安全：骨性风险→影像→开始评估
  const main = page.locator("main:visible");
  const safetyItems = page.locator(".rm-safety-list article:visible");
  for (let i = 0; i < await safetyItems.count(); i += 1) {
    await safetyItems.nth(i).getByRole("button", { name: "没有", exact: true }).click();
  }
  const boneNext = page.getByRole("button", { name: /继续填写骨性风险|继续/ }).first();
  if (await boneNext.count()) { await snap(page, caseId, "骨性风险"); await boneNext.click(); await page.waitForTimeout(400); }
  const boneItems = page.locator(".rm-bone-check article:visible");
  for (let i = 0; i < await boneItems.count(); i += 1) {
    await boneItems.nth(i).getByRole("button", { name: "不是", exact: true }).click().catch(() => {});
    await boneItems.nth(i).getByRole("button", { name: "能", exact: true }).click().catch(() => {});
  }
  const cont = page.getByRole("button", { name: /继续填写影像结论/ }).first();
  if (await cont.count()) await cont.click();
  const noImg = page.getByRole("button", { name: "没有做影像", exact: true });
  if (await noImg.count()) await noImg.click();
  const begin = page.getByRole("button", { name: /开始评估检查/ }).first();
  if (await begin.count()) await begin.click();
  await page.waitForTimeout(600);
  await snap(page, caseId, "踝评估开始");
  await answerGuidedAssessment(page, caseId);
  await snap(page, caseId, "踝评估完成→处理");
  await saveLog(caseId);
});

test("WALK-P3 自助膝内侧下楼疼一月：评估到处理 @walkthrough", async ({ page }) => {
  const caseId = "P3-knee-medial-self";
  beginWalk(caseId);
  test.setTimeout(300_000);
  await prepareGuidedChiefProgression(page);
  await page.waitForTimeout(600);
  await snap(page, caseId, "膝内侧自助评估开始");
  await answerGuidedAssessment(page, caseId);
  await snap(page, caseId, "膝内侧评估完成→处理");
  await saveLog(caseId);
});

test("WALK-P4 自助大腿后侧跑步拉伤：组织路径 @walkthrough", async ({ page }) => {
  const caseId = "P4-thigh-strain";
  beginWalk(caseId);
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const { openFreshProduct, skipOnboarding, symptomOrganizeButton, expectUniqueVisible } = await import("../support/page-helpers");
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  await input.fill("跑步时右大腿后侧拉伤，疼得厉害，走路会牵扯");
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await page.getByRole("button", { name: /自助康复/ }).first().click();
  await page.getByRole("button", { name: /下一步/ }).first().click();
  await page.waitForTimeout(800);
  await snap(page, caseId, "大腿后侧拉伤症状（组织路径）");
  await saveLog(caseId);
});

test("WALK-P5 自助小腿跑步后外侧紧酸：局部+骨应力筛查 @walkthrough", async ({ page }) => {
  const caseId = "P5-calf-lateral";
  beginWalk(caseId);
  test.setTimeout(240_000);
  const { openFreshProduct, skipOnboarding, symptomOrganizeButton, expectUniqueVisible } = await import("../support/page-helpers");
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  await input.fill("右小腿外侧跑步后发紧发酸，走多了也会不舒服，有俩星期了");
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await page.getByRole("button", { name: /自助康复/ }).first().click();
  await page.getByRole("button", { name: /下一步/ }).first().click();
  await page.waitForTimeout(800);
  await snap(page, caseId, "小腿外侧症状（局部/骨应力筛查）");
  await saveLog(caseId);
});

test("WALK-P6 自助肩/髋不支持区出口 @walkthrough", async ({ page }) => {
  const caseId = "P6-unsupported-region";
  beginWalk(caseId);
  test.setTimeout(180_000);
  const { openFreshProduct, skipOnboarding, symptomOrganizeButton, expectUniqueVisible } = await import("../support/page-helpers");
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  await input.fill("左肩膀抬手时疼，有一个月了");
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await page.getByRole("button", { name: /自助康复/ }).first().click();
  await page.getByRole("button", { name: /下一步/ }).first().click();
  await page.waitForTimeout(800);
  await snap(page, caseId, "不支持区（肩）提示");
  await saveLog(caseId);
});

test("WALK-P7 自助腰臀麻电：神经安全出口 @walkthrough", async ({ page }) => {
  const caseId = "P7-neural-safety";
  beginWalk(caseId);
  test.setTimeout(180_000);
  const { openFreshProduct, skipOnboarding, symptomOrganizeButton, expectUniqueVisible } = await import("../support/page-helpers");
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  await input.fill("右臀部到小腿发麻，走路时会窜麻，持续一周了");
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await page.getByRole("button", { name: /自助康复/ }).first().click();
  await page.getByRole("button", { name: /下一步/ }).first().click();
  await page.waitForTimeout(800);
  await snap(page, caseId, "麻电（神经）提示");
  await saveLog(caseId);
});

test("WALK-P8 双侧膝下蹲都疼：双侧低负荷门 @walkthrough", async ({ page }) => {
  const caseId = "P8-bilateral";
  beginWalk(caseId);
  test.setTimeout(180_000);
  const runtime = await launchWorkbenchScenario(page, "bilateral-training-gate");
  await page.waitForTimeout(600);
  await snap(page, caseId, "双侧训练低负荷门");
  const { assertNoRuntimeErrors } = await import("../support/page-helpers");
  assertNoRuntimeErrors(collectRuntimeErrors(page));
  await saveLog(caseId);
});

import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, launchWorkbenchScenario } from "../support/page-helpers";

// SG 组：种子缺口靶子正式断言（Phase 4.2 前置，dev 00e417a 落地）。
//
// SG-1 钉 treatment-worse-stop（page_boundary / step 3 / fixtureKind
// treatment-worse-stop）：target:chief 一条 result:"worse"（5→7）trialRecord
// → treatmentWorsened=treatmentMustStop(trialRecords) 直派，落「本次处理已暂停」
// 停止面板（treatment-retest-stage.tsx :650）。面板文案已随批 J 迁移为不良反应
// 重评流（dev seed-gaps 通知档 §3 的「刚才的处理使症状或活动表现加重/重新评估」
// 为旧口径，实际渲染以本断言为准）：span「刚才的反应」+ h2「症状或活动表现变差」
// + 三出口「确认加重后的变化（beginAdverseReassessment）/补充症状信息/保存并结束」，
// 面板不含指向训练步的动作，rail 4/5 步待解锁。
// 断言一律作用域到 runtime 容器：/test launcher 的场景描述文本含同字样，全页
// 匹配会假阳性（dev 踩坑通报 #1）。
//
// SG-2（bilateral-per-side-retest）暂不挂断言：实探落点为双侧训练闸门
// checkpoint「另一侧针对性评估还未完成」（treatment-retest-stage.tsx :720，
// 守卫只有 双侧+!midpointDecisionDone），而非通知档宣称的右侧逐侧复测台账
// （:834，需 showingRetest=readyToRetest||…，夹具未种 readyToRetest；且其余
// motion 项无双侧分侧结果 → bilateralAssessmentComplete=false → 队列不生成）。
// 夹具修正归 dev（catalog 为 dev 所有），等 dev 修夹具后再钉。

test("SG-1 处理后加重停止面板：刚才的反应 + 三出口 + 无训练入口 @scenario", async ({ page }) => {
  test.setTimeout(90_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "treatment-worse-stop");
  await page.waitForTimeout(600);
  // 落点即停止面板：is-referral 变体，非完成面板/工作台。
  const panel = runtime.locator(".rm-complete-panel.is-referral").filter({ hasText: "刚才的反应" });
  await expect(panel).toHaveCount(1);
  await expect(runtime.locator(".rm-complete-panel").filter({ hasText: "本轮处理已完成" })).toHaveCount(0);
  // StepHeading：第4步 · 处理与即时复测 / 本次处理已暂停。
  await expect(runtime.locator(".rm-page").filter({ hasText: "本次处理已暂停" })).toHaveCount(1);
  // 不可分分支（5→7 纯变重，无疼痛降/活动升混合）：h2 = 症状或活动表现变差。
  await expect(panel.locator("h2")).toHaveText("症状或活动表现变差");
  await expect(panel.locator("p")).toContainText("先停止刚才的处理。接下来只确认症状变化和直接相关的检查，不会返回整套评估。");
  // 三出口：确认加重后的变化（主按钮，不良反应重评）+ 补充症状信息 + 保存并结束。
  const actions = panel.locator(".rm-page-actions.three button");
  await expect(actions).toHaveCount(3);
  await expect(actions.filter({ hasText: "确认加重后的变化" }).first()).toHaveClass(/rm-primary/);
  await expect(actions.filter({ hasText: "补充症状信息" })).toHaveCount(1);
  await expect(actions.filter({ hasText: "保存并结束" })).toHaveCount(1);
  // 面板不含指向训练步的动作（fixtureNote 不变式；导轨标签不算）。
  await expect(panel.locator("button", { hasText: "训练" })).toHaveCount(0);
  // rail：处理复测进行中，训练居家/康复总结待解锁（停止态不放行后续步）。
  const rail = runtime.locator(".rm-step-rail button");
  await expect(rail.filter({ hasText: "处理复测" }).locator("b")).toHaveText("进行中");
  await expect(rail.filter({ hasText: "训练居家" }).locator("b")).toHaveText("待解锁");
  await expect(rail.filter({ hasText: "康复总结" }).locator("b")).toHaveText("待解锁");
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

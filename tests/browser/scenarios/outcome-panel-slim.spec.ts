import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, launchWorkbenchScenario } from "../support/page-helpers";

// OP 组：成果面板视觉瘦身（outcome-slim）。
//
// OP-1 用 dev 第二轮靶子 outcome-panel-chief-action-line（page_boundary / step 3 /
// fixtureKind outcome-panel-records）钉住「本轮处理已完成」面板 + 训练交接。
// dev a2fcaf7 修复死出口后的形态：多主诉动作（下楼、下蹲）→ reportedActionSummary
// 长度 2 → retestEligibility not-comparable → chiefScoreComparable=false，面板走降级
// 行；trialRecords 首条 chiefRetested:true + afterScore<beforeScore → chiefImproved=true
// → 结论句分支「主诉变轻」；chiefRetested 避免生成 pending 主诉义务 →
// treatmentComplete → maxUnlocked=4 → rail「训练居家」可进入、「进入训练」可导航
// （修复前 baselineScoreConfirmed:false → intakeComplete=false → maxUnlocked=0，
// goToStep(4) 被 workflow navigate-requested 拒绝，按钮可见但点击无效）。
// 断言一律作用域到 runtime 容器：/test launcher 的场景描述文本含「本轮处理已完成」
// 等同样字样，全页匹配会假阳性（dev 踩坑通报 #1）。

test("OP-1 成果面板：结论句 + 主诉动作降级行 + 清单表 + 训练交接 @scenario", async ({ page }) => {
  test.setTimeout(90_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "outcome-panel-chief-action-line");
  await page.waitForTimeout(600);
  const panel = runtime.locator(".rm-complete-panel").filter({ hasText: "本轮处理已完成" });
  await expect(panel).toHaveCount(1);
  // 结论句大标题：chiefImprovedDuringTreatment=true（主诉复测 5→4）。
  await expect(panel.locator("h2")).toHaveText("主诉变轻");
  // 不可分（多主诉动作 → not-comparable）：无分数对比块；主诉动作降级为一行小字，
  // 两条动作以顿号拼接（reportedActionSummary 取 raw）。
  await expect(panel.locator(".rm-final-score")).toHaveCount(0);
  const actionLine = panel.locator("p.rm-chief-action-line");
  await expect(actionLine).toHaveCount(1);
  await expect(actionLine).toHaveText("主诉动作：下楼、下蹲");
  // 清单表：有效处理类别（控制候选行以 actionLabel 呈现，probe 实测「训练股四头末端控制」）
  // + 活动范围变化类别（rangeOutcomes better-passive-limited → 改善行）。
  const table = panel.locator(".rm-stage-outcome-table");
  await expect(table).toHaveCount(1);
  await expect(table.locator(".rm-stage-outcome-kind").filter({ hasText: "有效处理" })).toHaveCount(1);
  const effectiveRow = table.locator(".rm-stage-outcome-row").filter({ hasText: "训练股四头末端控制" });
  await expect(effectiveRow).toHaveCount(1);
  await expect(effectiveRow.locator("small")).toHaveText("主诉变轻");
  await expect(table.locator(".rm-stage-outcome-kind").filter({ hasText: "活动范围变化" })).toHaveCount(1);
  const rangeRow = table.locator(".rm-stage-outcome-row").filter({ hasText: "膝关节主动伸直（AROM）" });
  await expect(rangeRow.locator("small")).toHaveText("有改善，仍小于健侧");
  // 落点即完成面板：无「还有问题没得到解释」卡（继续排查池已清空）。
  await expect(panel.locator(".rm-outcome-unexplained")).toHaveCount(0);
  // 无待办复测义务（chiefRetested:true → 不生成 pending 主诉；guided 模式不渲染
  // 复查台账，渲染处若有任何非 0 pending 计数都算失败）。
  await expect(runtime.locator("[data-pending-count]:not([data-pending-count=\"0\"])")).toHaveCount(0);
  // rail「训练居家」可进入（修复前 maxUnlocked=0 → 待解锁）。
  const trainingRail = runtime.locator(".rm-step-rail button").filter({ hasText: "训练居家" });
  await expect(trainingRail.locator("b")).toHaveText("可进入");
  await expect(trainingRail).toBeEnabled();
  // 「进入训练」点击 → 「05 下一阶段 · 处理复测完成 → 开始训练」过渡页
  // （修复前 goToStep(4) 被 navigate-requested 静默拒绝，死按钮）。
  await panel.locator("button.rm-primary").filter({ hasText: "进入训练" }).click();
  const transition = runtime.locator(".rm-stage-transition");
  await expect(transition).toHaveCount(1);
  await expect(transition.locator(".rm-stage-transition-number")).toHaveText("05");
  await expect(transition.locator("h1")).toHaveText("处理复测完成");
  await expect(transition.locator("button.rm-primary")).toHaveText("开始训练");
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

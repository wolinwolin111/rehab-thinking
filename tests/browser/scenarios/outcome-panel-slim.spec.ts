import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, launchWorkbenchScenario } from "../support/page-helpers";

// OP 组：成果面板视觉瘦身（outcome-slim）。
//
// OP-1 用 dev 第二轮靶子 outcome-panel-chief-action-line（page_boundary / step 3 /
// fixtureKind outcome-panel-records）钉住「本轮处理已完成」面板：基线不可分
// （baselineScoreConfirmed:false）→ 无分数对比块，主诉动作降级为「主诉动作：」小字；
// 处理记录 result=better → 清单表出「有效处理」行；瘢痕项已种 → 继续排查池空，
// 落点不被 :782 出口抢走（dev 踩坑通报 #3）。
// 断言一律作用域到 runtime 容器：/test launcher 的场景描述文本含「本轮处理已完成」
// 等同样字样，全页匹配会假阳性（dev 踩坑通报 #1）。

test("OP-1 成果面板：结论句 + 主诉动作降级行 + 清单表 @scenario", async ({ page }) => {
  test.setTimeout(90_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "outcome-panel-chief-action-line");
  await page.waitForTimeout(600);
  const panel = runtime.locator(".rm-complete-panel").filter({ hasText: "本轮处理已完成" });
  await expect(panel).toHaveCount(1);
  // 结论句大标题（不可分 + 未变轻 → 已复查分支）。
  await expect(panel.locator("h2")).toHaveText("主诉动作已复查");
  // 不可分：无分数对比块；主诉动作降级为一行小字。
  await expect(panel.locator(".rm-final-score")).toHaveCount(0);
  const actionLine = panel.locator("p.rm-chief-action-line");
  await expect(actionLine).toHaveCount(1);
  await expect(actionLine).toHaveText("主诉动作：下楼和下蹲");
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
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

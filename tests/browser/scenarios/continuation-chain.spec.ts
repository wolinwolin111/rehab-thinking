import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors } from "../support/page-helpers";
import { completeContinuationAssessmentRound, completeSingleActionAssessment, completeSingleActionTreatment, prepareProfessionalSingleAction } from "../drivers/pilot-flow";

// C 组：继续排查链路（开发侧交接第三部分 C-1~C-4，8150b06 实装、8191fb0 修复）。
//
// 8191fb0 根因修复：问题台账"复测过 ≠ 已解决"导致 hasUnresolvedImmediateTreatmentProblem
// 恒 true，流程恒落入「仍有待处理」分支。修复新增 continuationExitActive =
// treatmentComplete && continuationSuggestions.length > 0：有可查建议时跳过该分支
// 落到完成面板显示卡片；无建议（查无可查）时原分支与「重新确认剩余问题」保留。

test("C-1 继续排查完整链路：主诉未解决→卡片→接受→回评估→补查→计划刷新 @scenario", async ({ page }) => {
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalSingleAction(page);
  await completeSingleActionAssessment(page);
  await completeSingleActionTreatment(page, { chiefScore: "5" });

  // 卡片出现：主诉还没有得到解释。
  const card = page.locator("main:visible").locator(".rm-outcome-unexplained", { hasText: "还没有得到解释" });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("处理和复查都完成了，但原来的不适还在");

  // 接受建议 → toast 确认 → 回评估（工作台或已展开的检查卡）→ 补查 → 计划刷新。
  await card.getByRole("button", { name: "继续检查这些方向", exact: true }).click();
  await expect(page.locator(".rm-toast")).toContainText("已加入继续检查的方向", { timeout: 5_000 });
  await expect(
    page.locator("main:visible").getByRole("button", { name: /打开检查|下一个检查|查看评估结果/ }).first(),
  ).toBeVisible({ timeout: 10_000 });
  // 补查建议项 → 汇总确认 → 回到处理复查（第二轮）。
  await completeContinuationAssessmentRound(page);
  await completeSingleActionTreatment(page, { chiefScore: "5" });
  // 第二轮面板：处理复查走通、无运行时错误即链路收敛（建议池只减不增在 C-3 断言）。
  await expect(page.locator("main:visible")).toContainText(/本阶段成果|针对性处理/, { timeout: 10_000 });
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("C-3 收敛：反复接受补查直到查无可查，卡片消失且「仍有待处理」分支保留 @scenario", async ({ page }) => {
  // dev 复测点反向确认：所有区域项查完后建议池空 → continuationExitActive=false →
  // 无卡片，原「仍有待处理」面板与「重新确认剩余问题」按钮原样保留（不得静默完成）。
  test.setTimeout(300_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalSingleAction(page);
  await completeSingleActionAssessment(page);
  await completeSingleActionTreatment(page, { chiefScore: "5" });

  const main = page.locator("main:visible");
  let rounds = 0;
  while (rounds < 6) {
    rounds += 1;
    const card = main.locator(".rm-outcome-unexplained", { hasText: "还没有得到解释" });
    if (!(await card.count())) break;
    await card.getByRole("button", { name: "继续检查这些方向", exact: true }).click();
    await completeContinuationAssessmentRound(page);
    await completeSingleActionTreatment(page, { chiefScore: "5" });
  }
  // 查无可查：卡片消失，「仍有待处理」分支保留（含重新确认剩余问题出口）。
  await expect(main.locator(".rm-outcome-unexplained", { hasText: "还没有得到解释" })).toHaveCount(0);
  await expect(main).toContainText(/仍有待处理|重新确认剩余问题/, { timeout: 10_000 });
  // 视觉瘦身（outcome-slim）：成果面板大标题为结论句而非主诉动作清单（旧 h2 为「蹲起」）；
  // 活动范围变化等以一张清单表渲染（类别 | 名称 | 状态行），不再有 article 卡壳结构。
  const outcomePanel = main.locator(".rm-complete-panel").filter({ hasText: "本轮处理已完成" });
  await expect(outcomePanel.locator("h2")).toHaveCount(1);
  await expect(outcomePanel.locator("h2")).toContainText(/主诉暂无明显变化|主诉变轻|主诉动作已复查/);
  await expect(outcomePanel.locator("h2")).not.toContainText("蹲起");
  await expect(outcomePanel.locator(".rm-final-score")).toHaveCount(1);
  const outcomeTable = outcomePanel.locator(".rm-stage-outcome-table");
  await expect(outcomeTable).toHaveCount(1);
  await expect(outcomeTable.locator(".rm-stage-outcome-kind", { hasText: "活动范围变化" })).toHaveCount(1);
  const rangeRow = outcomeTable.locator(".rm-stage-outcome-row").filter({ hasText: "膝关节主动屈曲" });
  await expect(rangeRow).toHaveCount(1);
  await expect(rangeRow.locator("small")).toHaveText("已接近健侧");
  await expect(outcomePanel.locator(".rm-stage-outcome-effective article, .rm-stage-outcome-range article")).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("C-2 跳过路径：点进入训练不阻断，返回面板卡片不重复 @scenario", async ({ page }) => {
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalSingleAction(page);
  await completeSingleActionAssessment(page);
  await completeSingleActionTreatment(page, { chiefScore: "5" });

  const main = page.locator("main:visible");
  const card = main.locator(".rm-outcome-unexplained", { hasText: "还没有得到解释" });
  await expect(card).toHaveCount(1);
  // 卡片与完成面板动作并存：点「查看训练与居家方案」→ 过渡确认页 → 开始训练，不阻断。
  await page.locator("button:visible").filter({ hasText: /查看训练.*居家方案/ }).first().click({ timeout: 15_000 });
  await page.locator("button:visible").filter({ hasText: /开始训练/ }).first().click({ timeout: 10_000 });
  await expect(page.locator("main:visible")).toContainText(/训练|居家/, { timeout: 10_000 });
  // 经侧栏返回处理复查面板：卡片不重复渲染。
  await page.getByRole("navigation").getByRole("button", { name: /处理复测/ }).click();
  await expect(page.locator("main:visible")).toContainText(/本阶段成果|针对性处理|处理复测/, { timeout: 10_000 });
  await expect(page.locator("main:visible").locator(".rm-outcome-unexplained", { hasText: "还没有得到解释" })).toHaveCount(1);
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("C-4 会话隔离：接受建议后修改症状信息，问题线程重置 @scenario", async ({ page }) => {
  // 8150b06 + startNewProblemThread：接受建议（continuationRoundIds 非空）后
  // 修改任一 intake 字段（恢复目标）→ startNewProblemThread 重置会话
  //（setContinuationRoundIds([]) + 评估结果清空 + 回症状信息流程）。
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalSingleAction(page);
  await completeSingleActionAssessment(page);
  await completeSingleActionTreatment(page, { chiefScore: "5" });

  const main = page.locator("main:visible");
  const card = main.locator(".rm-outcome-unexplained", { hasText: "还没有得到解释" });
  await expect(card).toHaveCount(1);
  await card.getByRole("button", { name: "继续检查这些方向", exact: true }).click();
  await expect(page.locator(".rm-toast")).toContainText("已加入继续检查的方向", { timeout: 5_000 });

  // 回症状信息（侧栏可回看）→ 修改恢复目标字段（当前为基本活动档，点未选中的
  // 「恢复一般运动」触发 onChange → invalidateAfterIntake → startNewProblemThread）。
  await page.getByRole("navigation").getByRole("button", { name: /症状信息/ }).click();
  const goalButton = main.locator("button:visible").filter({ hasText: "恢复一般运动" }).first();
  await expect(goalButton).toBeVisible({ timeout: 10_000 });
  await goalButton.click({ force: true, timeout: 15_000 });
  // 重置后流程回到症状信息确认（未确认状态需重新提交才能进入后续阶段）。
  await expect(
    page.locator("main:visible").locator("button:visible").filter({ hasText: /保存并继续|进入关键确认|下一步/ }).first(),
  ).toBeVisible({ timeout: 10_000 });
  await assertNoRuntimeErrors(runtimeErrors);
});

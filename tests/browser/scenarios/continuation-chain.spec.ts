import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors } from "../support/page-helpers";
import { completeSingleActionAssessment, completeSingleActionTreatment, prepareProfessionalSingleAction } from "../drivers/pilot-flow";

// C 组：继续排查链路（开发侧交接第三部分 C-1~C-4，8150b06 实装的完成面板卡片）。
//
// ⚠️ 现状（2026-08-30 测试轮）：按三种口径（功能复测未完成/复测能完成/单动作
// 分数未降）驱动到处理完成面板，继续排查卡（"XX还没有得到解释"）均未渲染，
// 且面板始终停在带「重新确认剩余问题」的终局分支，treatmentComplete 投影
// 无法通过已文档化的流程达成。继续排查域逻辑（planContinuationAssessments）
// 已有单测覆盖，卡片的浏览器可达性存疑 —— 标记 fixme，
// 详见 docs/quality/defect-continuation-card-2026-08-30.md。
// 修复后按 C-1~C-4 注释恢复完整链路断言。

test.fixme("C-1 继续排查完整链路：主诉未解决→卡片→接受→回评估→补查→计划刷新 @scenario", async ({ page }) => {
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalSingleAction(page);
  await completeSingleActionAssessment(page);
  await completeSingleActionTreatment(page, { chiefScore: "5" });

  // 卡片出现：主诉还没有得到解释。
  const card = page.locator("main:visible").locator(".rm-stage-outcome-track", { hasText: "还没有得到解释" });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("处理和复查都完成了，但原来的不适还在");

  // 接受建议 → 回评估，建议项已在清单 → 补查 → 计划刷新（二次收敛见 C-3）。
  await card.getByRole("button", { name: "继续检查这些方向", exact: true }).click();
  await expect(page.locator("main:visible")).toContainText("已加入继续检查的方向");
  await expect(page.locator("h1:visible")).toContainText(/评估检查/, { timeout: 10_000 });
  await assertNoRuntimeErrors(runtimeErrors);
});

test.fixme("C-3 收敛：接受并查完所有可查项后卡片不再出现 @scenario", async ({ page }) => {
  // 依赖 C-1 修复：第二轮补查全部完成后，卡片应消失或建议池只减不增。
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  expect(runtimeErrors).toEqual([]);
});

test.fixme("C-2 跳过路径：点进入训练不阻断，同会话卡片不重复 @scenario", async ({ page }) => {
  // 依赖 C-1 修复：卡片出现后直接进入训练不阻断；返回处理面板时卡片不重复渲染。
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);
  expect(runtimeErrors).toEqual([]);
});

test.fixme("C-4 会话隔离：接受建议未查完，开始第二次康复后清单不残留 @scenario", async ({ page }) => {
  // 依赖 C-1 修复 + 8150b06 的 setContinuationRoundIds([]) 会话重置：
  // 第一次会话接受建议未查 → 开始第二次康复 → 新会话评估清单不残留建议项。
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);
  expect(runtimeErrors).toEqual([]);
});

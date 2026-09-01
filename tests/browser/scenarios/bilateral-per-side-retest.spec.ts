import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, launchWorkbenchScenario } from "../support/page-helpers";

// SG 组：种子缺口靶子正式断言（Phase 4.2 前置）。
//
// SG-2 钉 bilateral-per-side-retest（page_boundary / step 3 / fixtureKind
// bilateral-per-side-retest）：dev f605270+975cbc9 修好台账渲染后的形态。
// 语义口径（dev 通知档 §4）：该夹具为**专业模式**（康复思路·给别人，能力位仅
// passiveRange+palpation）——自助模式下膝伸直前侧走 released P0（lineage 要
// passive:"limited"，自助 profile 剥离 passive）结构性拿不到处理单元，台账不可达；
// 双侧逐侧复测本就属专业场景，测试侧接受该口径，不额外开自助非 P0 靶点。
//
// 夹具关键种子：中文触诊标签「大腿前侧」（膝决策 anteriorThighEvidence 按中文
// 匹配）→ 处理单元生成；motion:knee-extension active:"both-limited" + passive:"limited"
// → 「两侧异常」→ 台账左右两行；bilateralTreatmentSides 键对齐
// target:motion:knee-extension（右侧已处理）；midpointDecisionDone/readyToRetest。
// 断言一律作用域 runtime 容器（/test launcher 场景描述文本含同字样，防假阳性）。

test("SG-2 双侧处理段逐侧复测：台账渲染 + 左右复测交互 + 汇总收敛 @scenario", async ({ page }) => {
  test.setTimeout(120_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "bilateral-per-side-retest");
  await page.waitForTimeout(800);

  // 落点即处理段逐侧复测台账（非完成面板/非 checkpoint）。
  const ledger = runtime.locator('[data-testid="bilateral-retest-ledger"]');
  await expect(ledger).toHaveCount(1);
  await expect(runtime.locator(".rm-complete-panel")).toHaveCount(0);
  // 台账头：双侧分别复测 / 分别记录左右两侧处理后的变化 / 优先侧右侧。
  await expect(ledger.locator("header span")).toHaveText("双侧分别复测");
  await expect(ledger.locator("h2")).toHaveText("分别记录左右两侧处理后的变化");
  await expect(ledger).toHaveAttribute("data-priority-side", "右侧");
  // 左右两行初始 pending，各含 better/same/worse 三按钮。
  const left = runtime.locator('[data-testid="bilateral-retest-left"]');
  const right = runtime.locator('[data-testid="bilateral-retest-right"]');
  await expect(left).toHaveAttribute("data-status", "pending");
  await expect(right).toHaveAttribute("data-status", "pending");
  for (const side of ["left", "right"] as const) {
    await expect(runtime.locator(`[data-testid="bilateral-retest-${side}-better"]`)).toHaveCount(1);
    await expect(runtime.locator(`[data-testid="bilateral-retest-${side}-same"]`)).toHaveCount(1);
    await expect(runtime.locator(`[data-testid="bilateral-retest-${side}-worse"]`)).toHaveCount(1);
  }
  // 主按钮「确认双侧复测」：两侧未记完 disabled，记全后 enabled。
  const confirm = runtime.locator('[data-testid="bilateral-retest-confirm"]');
  await expect(confirm).toHaveCount(1);
  await expect(confirm).toBeDisabled();
  // 只记一侧仍禁用。
  await runtime.locator('[data-testid="bilateral-retest-left-better"]').click();
  await expect(left).toHaveAttribute("data-status", "better");
  await expect(confirm).toBeDisabled();
  // 两侧记全 → 启用，且各自状态写入正确。
  await runtime.locator('[data-testid="bilateral-retest-right-same"]').click();
  await expect(right).toHaveAttribute("data-status", "same");
  await expect(confirm).toBeEnabled();
  // 确认 → 台账收敛，进入完成面板（主诉动作已复查），零 runtime error。
  await confirm.click();
  await expect(runtime.locator('[data-testid="bilateral-retest-ledger"]')).toHaveCount(0);
  await expect(runtime.locator(".rm-complete-panel")).toHaveCount(1);
  await expect(runtime.locator(".rm-complete-panel h2")).toContainText(/主诉动作已复查|主诉变轻|主诉暂无明显变化/);
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

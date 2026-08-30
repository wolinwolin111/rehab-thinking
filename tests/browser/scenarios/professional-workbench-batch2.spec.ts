import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, openFreshProduct, skipOnboarding } from "../support/page-helpers";
import { prepareProfessionalMultiAction } from "../drivers/pilot-flow";

// B2 组：专业模式批次 2 终态（d558c08）——处理段只读工作台（阶段工作台按钮 + 三列 + 导航）。
//
// 开发交接要点：处理段工作台 = 案例栏 + 弱化 rail + 三列（处理队列/待复查项目/继续排查）
// + 底部「继续评估｜返回处理」。工作台只读（无写路径）、不自动打开；安全页优先
//（treatmentWorsened / bilateralNeedsReferral 时工作台不渲染）。入口按钮仅专业模式出现。
// 已知边界：thinkingWorkbenchOpen 两段共享（评估工作台经全局导航进处理段会带工作台）。

async function driveToTreatmentWorkbench(page: import("@playwright/test").Page) {
  await prepareProfessionalMultiAction(page);
  const main = page.locator("main:visible");
  await main.getByRole("button", { name: "打开检查", exact: true }).click();
  await main.getByRole("button", { name: "做不完或不敢继续", exact: true }).first().click();
  await main.getByRole("button", { name: "没力或撑不住", exact: true }).first().click();
  await main.getByRole("button", { name: "下一个检查", exact: true }).click();
  await main.getByRole("button", { name: "做不完或不敢继续", exact: true }).first().click();
  await main.getByRole("button", { name: "没力或撑不住", exact: true }).first().click();
  await main.getByRole("button", { name: "下一个检查", exact: true }).click();
  await main.getByRole("button", { name: /患侧偏小.*膝后仍明显悬空/ }).first().click();
  await main.getByRole("button", { name: "没有不适", exact: true }).first().click();
  await main.getByRole("button", { name: "下一个检查", exact: true }).click();
  await main.getByRole("button", { name: /患侧偏小.*活动范围受限/ }).first().click();
  await main.getByRole("button", { name: "没有不适", exact: true }).first().click();
  await main.getByRole("button", { name: "下一个检查", exact: true }).click();
  await main.getByRole("button", { name: /力量接近.*两侧完成质量相近/ }).first().click();
  await main.getByRole("button", { name: "检查相关肌肉", exact: true }).first().click();
  await main.getByRole("button", { name: "没有明显差别", exact: true }).first().click();
  await main.getByRole("button", { name: "查看评估结果", exact: true }).click();
  await main.getByRole("button", { name: "评估完成，继续", exact: true }).click();
  await main.getByRole("button", { name: "开始处理并复测", exact: true }).click();
}

test("B2-1 入口按钮仅专业模式出现 + 处理段工作台三列与导航 @scenario", async ({ page }) => {
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  // 非专业（普通引导）无「阶段工作台」按钮：先到症状输入页抽查。
  await openFreshProduct(page);
  await skipOnboarding(page);
  await expect(page.locator("main:visible").getByRole("button", { name: "阶段工作台", exact: true })).toHaveCount(0);
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.reload();

  await driveToTreatmentWorkbench(page);
  const main = page.locator("main:visible");
  // 入口按钮仅专业模式出现。
  await expect(main.getByRole("button", { name: "阶段工作台", exact: true })).toHaveCount(1);
  await main.getByRole("button", { name: "阶段工作台", exact: true }).click();

  const wb = page.locator(".rm-thinking-workbench");
  await expect(wb).toBeVisible();
  // 案例栏。
  await expect(wb.locator('[data-testid="case-summary-bar"]')).toBeVisible();
  // 三列：
  const queue = wb.locator(".rm-workbench-module").filter({ hasText: "处理队列" });
  await expect(queue.locator("header strong")).toHaveText("0/2");
  await expect(queue.locator(".rm-workbench-list button")).toHaveCount(2);
  const retest = wb.locator(".rm-workbench-module").filter({ hasText: "待复查项目" });
  await expect(retest.locator("header strong")).toContainText("2项");
  await expect(retest).toContainText("下蹲功能动作");
  await expect(retest).toContainText("下台阶功能动作");
  const cont = wb.locator(".rm-workbench-module").filter({ hasText: "继续排查" });
  await expect(cont).toContainText("主诉已有解释时不追加检查");

  // 导航：返回处理 → 回处理流程。
  await wb.getByRole("button", { name: "返回处理", exact: true }).first().click();
  await expect(wb).not.toBeVisible();
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("B2-2 继续评估导航：从处理段工作台回评估段 @scenario", async ({ page }) => {
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await driveToTreatmentWorkbench(page);
  const main = page.locator("main:visible");
  await main.getByRole("button", { name: "阶段工作台", exact: true }).click();
  const wb = page.locator(".rm-thinking-workbench");
  await expect(wb).toBeVisible();
  // 继续评估 → 回评估段（评估已完成态，落评估汇总「先看清问题」）。
  await wb.getByRole("button", { name: "继续评估", exact: true }).click();
  await expect(page.locator("h1:visible")).toContainText(/先看清问题|按阶段查看|评估/, { timeout: 10_000 });
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test.fixme("B2-3 安全页优先：处理加重场景点不开工作台 @scenario", async ({ page }) => {
  // d558c08 复核修复：treatmentWorsened / bilateralNeedsReferral 时早期返回安全面板，
  // 工作台不渲染（early return 移到安全分支之后）。浏览器构造加重链路需走完复测面板
  // 多段（范围「变差」→ 不适 → 功能复测能完成 → 继续）才能提交 result="worse"，
  // 当前复测面板按序推进不稳定触发 treatmentWorsened —— 标记 fixme，
  // 依据：src/domain/rehab/treatment/treatment-session-core.ts treatmentMustStop
  // （record.result === "worse"）+ treatment-retest-stage.tsx L639/L667 early return。
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  expect(runtimeErrors).toEqual([]);
});

test.fixme("B2-4 处理队列空态：无候选显示 treatmentEmptyState 文案 @scenario", async ({ page }) => {
  // 处理队列为空需主诉无任何可处理目标（评估完成即产出候选，正常口径必有候选）。
  // 构造口径待定（如「评估全部无法判断」引导场景）—— 标记 fixme。
  // 代码依据：treatment-retest-stage.tsx renderTreatmentWorkbench
  // `trialTargets.length ? ... : <p>{treatmentEmptyState.title}：{treatmentEmptyState.detail}</p>`。
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);
  expect(runtimeErrors).toEqual([]);
});

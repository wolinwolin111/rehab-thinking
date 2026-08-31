import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, expectUniqueVisible, openFreshProduct, skipOnboarding, launchWorkbenchScenario } from "../support/page-helpers";
import { prepareProfessionalMultiAction } from "../drivers/pilot-flow";

// B2 组：专业模式批次 2 终态（d558c08）——处理段只读工作台（阶段工作台按钮 + 三列 + 导航）。
//
// 开发交接要点：处理段工作台 = 案例栏 + 弱化 rail + 三列（处理队列/待复查项目/继续排查）
// + 底部「继续评估｜返回处理」。工作台只读（无写路径）、不自动打开；安全页优先
// （treatmentWorsened / bilateralNeedsReferral 时工作台不渲染）。入口按钮仅专业模式出现。
// 已知边界：thinkingWorkbenchOpen 两段共享（评估工作台经全局导航进处理段会带工作台）。
// helper：launchWorkbenchScenario 走 /test 定向场景（见 page-helpers），B2-3/B2-4 据此直达。

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
  await page.goto("./", { waitUntil: "domcontentloaded" });
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

test("B2-3 安全页优先负断言：加重暂停页无工作台入口 @scenario", async ({ page }) => {
  // d558c08 复核修复：treatmentWorsened / bilateralNeedsReferral 时早期返回安全面板，
  // 工作台不渲染。dev 提供确定性靶子 treatment-worse（postScore 7 + 加重，页面定向直达）。
  test.setTimeout(120_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "treatment-worse");
  // 加重暂停页：确认停止/重新评估出口完整。
  await expect(runtime).toContainText(/暂停|加重|停止/, { timeout: 10_000 });
  // 防御护栏：加重暂停页不出现「阶段工作台」入口（工作台本就不渲染）。
  await expect(runtime.getByRole("button", { name: "阶段工作台", exact: true })).toHaveCount(0);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("B2-4 处理段空态页：全正常无固定主诉动作 → 空态出口 @scenario", async ({ page }) => {
  // dev 4d1ca0e 提供的 assessment-all-normal 定向场景：需同时无固定主诉动作 + 无评分 intake
  //（否则主诉动作未解决会落「还有问题需要补充检查」继续排查分支）。口径注记见 scenario-catalog。
  test.setTimeout(120_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "assessment-all-normal");
  // 处理段空态：无明确异常 + 低刺激基础活动出口；不出现处理卡。
  await expect(runtime).toContainText("本次没有发现明确异常", { timeout: 10_000 });
  await expect(runtime).toContainText("查看低刺激基础活动", { timeout: 10_000 });
  await expect(runtime.locator(".rm-treatment-action-card")).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

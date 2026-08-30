import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, expectUniqueVisible } from "../support/page-helpers";
import { prepareProfessionalOther } from "../drivers/pilot-flow";

// B1 组：专业模式批次 1 工作台（effeb36）——案例栏、集中记录、可追加检查、台账待复查列。
//
// 开发交接要点：批次 1 实装案例栏（data-testid="case-summary-bar"）、四区布局、专项并入
// 评估区尾部「可追加检查」、集中记录面板（.rm-batch-record，只录主动范围）、六阶段网格
// 弱化为细条、完成态折叠。旧 h1「按阶段查看这次康复」保留（INT-07 不受影响）。
// 已知边界：集中记录第一版只覆盖活动度主动范围；自查模式膝伸直特殊项不进批量面板。

test("B1-1 案例栏内容与修改主诉入口 @scenario", async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalOther(page, { description: "右膝内侧疼，有三个月了" });

  const bar = page.locator('[data-testid="case-summary-bar"]');
  await expect(bar).toBeVisible();
  // 主诉原话。
  await expect(bar.getByText("右膝内侧疼，有三个月了")).toBeVisible();
  // facts：部位/性质/时间/安全/目标。
  const facts = bar.locator("dd");
  await expect(facts.filter({ hasText: /膝内侧关节线.*右侧/ })).toHaveCount(1);
  await expect(facts.filter({ hasText: /恢复正常生活/ })).toHaveCount(1);
  const safe = facts.filter({ hasText: /无明显风险|需线下确认/ });
  await expect(safe).toHaveCount(1);
  // 修改主诉入口 → 回症状信息收集（专业模式为集中填写页，标题含「症状信息」）。
  await bar.getByRole("button", { name: "修改主诉", exact: true }).click();
  await expect(page.locator("h1:visible")).toContainText(/症状信息|记录主诉与评估条件/, { timeout: 10_000 });
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("B1-2 集中记录写入后逐项卡状态同步（需逐项补充） @scenario", async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalOther(page, { capabilities: ["专项检查"], description: "右膝内侧疼，有三个月了" });

  const main = page.locator("main:visible");
  const assessModule = main.locator(".rm-workbench-module.is-assessment");
  await assessModule.getByRole("button", { name: "集中记录", exact: true }).click();
  const panel = main.locator(".rm-batch-record");
  await expect(panel).toBeVisible();
  const row = panel.locator(".rm-batch-record-rows article").first();
  // 未记录 → 选主动「患侧偏小」 → 「需逐项补充」。
  await expect(row.locator("span")).toHaveText("未记录");
  await row.getByRole("button", { name: /患侧偏小/ }).first().click();
  await expect(row.locator("span")).toHaveText("需逐项补充");
  // 返回工作台，再进面板状态保持（逐项卡同步）。
  await panel.getByRole("button", { name: "返回工作台", exact: true }).click();
  await expect(panel).not.toBeVisible();
  await assessModule.getByRole("button", { name: "集中记录", exact: true }).click();
  await expect(panel).toBeVisible();
  await expect(panel.locator(".rm-batch-record-rows article").first().locator("span")).toHaveText("需逐项补充");
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("B1-3 可追加检查权限显示 @scenario", async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalOther(page, { capabilities: ["专项检查"], description: "右膝内侧疼，有三个月了" });

  const appendable = page.locator(".rm-workbench-appendable");
  await expect(appendable).toBeVisible();
  await expect(appendable.locator(".rm-workbench-capability")).toHaveText(/已开放|按权限|未开放/);
  // 该案例（慢性无外伤）无可追加专项 → 空态。
  await expect(appendable).toContainText(/没有需要追加的专项|当前主诉没有/);
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("B1-4 台账待复查列 @scenario", async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalOther(page, { capabilities: ["专项检查"], description: "右膝内侧疼，有三个月了" });

  const retestModule = page.locator(".rm-workbench-module").filter({ hasText: "待复查项目" });
  await expect(retestModule.first()).toBeVisible();
  await expect(retestModule.first()).toContainText(/处理后，这里会列出需要复查的项目|0 项|0项/);
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

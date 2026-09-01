import { expect, test } from "@playwright/test";
import { assertNoRuntimeErrors, collectRuntimeErrors, launchWorkbenchScenario } from "../support/page-helpers";

// T-09 快照按实际经过时间提醒（Phase 4.1 fixme 转化）。
// 四个「陈旧恢复边界」页面定向种子用不同 restoreAgeMs 真实加载保存草稿，
// 断言口径来自 scenario-catalog.fixtureNote 与实机落点：
//   未满24h → 无任何提醒；24h急性 → 恢复记录提醒+回看当前情况（不阻断）；
//   7天急性 → 继续前先更新情况+重新确认后继续（阻断，需重确认症状/安全/时间）；
//   7天慢性 → 恢复记录提醒+回看当前情况（只提醒，不要求急性三项确认）。
// 作用域一律收到 .rm-test-product：工作台工具栏会渲染 fixtureNote 原文，
// 其中含「恢复记录提醒」「回看当前情况」等字样，产品区外断言会假阳性。

test("T-09 快照按实际经过时间提醒，急性七天重新确认，慢性只提醒 @scenario", async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);

  // 边界一：未满 24 小时 —— 不出现任何陈旧提醒，原进度直接继续。
  const fresh = (await launchWorkbenchScenario(page, "snapshot-fresh-under-24h")).locator(".rm-test-product");
  await expect(fresh.getByText("恢复记录提醒")).toHaveCount(0);
  await expect(fresh.getByText("继续前先更新情况")).toHaveCount(0);

  // 边界二：急性超 24 小时 —— 提醒可回看，但不要求三项确认。
  const stale24 = (await launchWorkbenchScenario(page, "snapshot-stale-24h-acute")).locator(".rm-test-product");
  await expect(stale24.getByText("恢复记录提醒")).toBeVisible();
  await expect(stale24.getByText("距上次记录已过去1天")).toBeVisible();
  await expect(stale24.getByRole("button", { name: "回看当前情况", exact: true })).toBeVisible();
  await expect(stale24.getByRole("button", { name: "重新确认后继续" })).toHaveCount(0);

  // 边界三：急性超 7 天 —— 阻断，必须重新确认三类信息后才继续。
  const stale7acute = (await launchWorkbenchScenario(page, "snapshot-stale-7d-acute")).locator(".rm-test-product");
  await expect(stale7acute.getByText("继续前先更新情况")).toBeVisible();
  await expect(stale7acute.getByText("距上次记录已过去7天")).toBeVisible();
  await expect(stale7acute.getByText(/重新确认当前症状、安全信号和发生时间/)).toBeVisible();
  await expect(stale7acute.getByRole("button", { name: "重新确认后继续", exact: true })).toBeVisible();

  // 边界四：慢性超 7 天 —— 只提醒回看，不要求急性三项确认。
  const stale7chronic = (await launchWorkbenchScenario(page, "snapshot-stale-7d-chronic")).locator(".rm-test-product");
  await expect(stale7chronic.getByText("恢复记录提醒")).toBeVisible();
  await expect(stale7chronic.getByText("距上次记录已过去7天")).toBeVisible();
  await expect(stale7chronic.getByRole("button", { name: "回看当前情况", exact: true })).toBeVisible();
  await expect(stale7chronic.getByRole("button", { name: "重新确认后继续" })).toHaveCount(0);

  await assertNoRuntimeErrors(runtimeErrors);
});

import { expect, test } from "@playwright/test";
import { assertNoRuntimeErrors, collectRuntimeErrors, openFreshProduct, skipOnboarding } from "../support/page-helpers";

// F-3 / 对照表 #11：保存失败文案区分。
// 复用 dev 内置测试工作台（/test）的故障注入场景：
// - network-save-failure → 同步状态条显示「网络断开，正在本机保存」
// - storage-unavailable  → 同步状态条显示「本机保存失败」，不得显示「已保存到本机」

async function runFaultScenario(page: import("@playwright/test").Page, scenarioId: string) {
  await page.goto("./test", { waitUntil: "domcontentloaded" });
  // /test 有 dev 长连接，不能等 networkidle；直接等启动器按钮出现。
  await expect(page.getByRole("button", { name: /页面定向/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /页面定向/ }).click();
  const scenarioButton = page.getByTestId(`test-scenario-${scenarioId}`);
  await expect(scenarioButton).toBeVisible();
  await scenarioButton.click();
  await page.getByRole("button", { name: "开始测试", exact: true }).click();
  await expect(page.getByTestId("test-workbench-runtime")).toBeVisible({ timeout: 20_000 });
}

test("F-3a 本机存储不可用显示本机保存失败 @scenario", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await runFaultScenario(page, "storage-unavailable");
  // 对照表 #11：本机存储失败必须显示「本机保存失败」，不得假报已保存。
  await expect(page.locator(".rm-sync-error")).toContainText("本机保存失败", { timeout: 20_000 });
  await expect(page.locator(".rm-sync-saved")).toHaveCount(0);
  await assertNoRuntimeErrors(runtimeErrors.filter((error) => !/Failed to load resource|TEST_FAULT/.test(error.message)));
});

test("F-3b 网络断开显示网络断开且本机保存 @scenario", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await openFreshProduct(page);
  await skipOnboarding(page);
  // 覆盖 skipOnboarding 的成功桩：progress 请求全部 abort → 离线状态（后注册的路由优先生效）。
  await page.route("**/api/pilot/cases/*/progress**", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.abort("connectionfailed");
  });
  // 远程同步只在保存记录时发起：点顶栏「保存草稿」→ progress 请求被中断 → 离线状态。
  await page.getByRole("button", { name: "保存草稿", exact: true }).click();
  // 对照表 #11：网络断开必须显示「网络断开」，不得显示「本机保存失败」。
  await expect(page.locator(".rm-sync-error")).toContainText(/网络断开/, { timeout: 20_000 });
  await assertNoRuntimeErrors(runtimeErrors.filter((error) => !/Failed to load resource|net::|ERR_/.test(error.message)));
});

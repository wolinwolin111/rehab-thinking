import { expect, type Page } from "@playwright/test";

export type RuntimeError = { kind: "pageerror" | "console"; message: string };

export function collectRuntimeErrors(page: Page) {
  const errors: RuntimeError[] = [];
  page.on("pageerror", (error) => errors.push({ kind: "pageerror", message: error.message }));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push({ kind: "console", message: message.text() });
  });
  return errors;
}

export async function openFreshProduct(page: Page) {
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  // 批 UX（6258424）品牌统一：落地页可见品牌为「悦舒运动康复」（顶部栏 +
  // 教程按钮 + 移动端菜单）；「RehabMind」仅保留在 <title>/资源路径/内部标识。
  await expect(page.locator("body")).toContainText("悦舒运动康复");
  await expect(page.locator('[data-rehabmind-tutorial="symptom-input"]:visible')).toHaveCount(1);
}

export async function stubPilotCaseApi(page: Page) {
  await page.route("**/api/pilot/cases", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        case: {
          caseId: "browser-case-helper",
          publicCode: "RM-HELPER",
          accessToken: "browser-helper-token",
          revision: 1,
          versions: { appVersion: "test", knowledgeVersion: "test", decisionVersion: "test" },
        },
      }),
    });
  });
  await page.route("**/api/pilot/cases/*/progress", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const request = JSON.parse(route.request().postData() ?? "{}") as { caseId?: string; snapshot?: unknown; eventId?: string };
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        progress: {
          caseRecord: {},
          snapshot: { caseId: request.caseId, revision: 1, payload: request.snapshot, createdAt: now, updatedAt: now },
          event: { id: request.eventId ?? "browser-helper-event" },
        },
      }),
    });
  });
}

export async function skipOnboarding(page: Page) {
  const welcome = page.locator('.rm-product-welcome[role="dialog"]:visible');
  if (await welcome.count()) {
    await welcome.getByRole("button", { name: "开始康复", exact: true }).click();
  }
  const source = page.locator('.rm-source-gate:visible');
  if (await source.count()) {
    await source.getByRole("radio", { name: "小红书", exact: true }).check();
    await source.getByRole("button", { name: "继续", exact: true }).click();
  }
  const consent = page.locator('.rm-consent-gate:visible');
  if (await consent.count()) {
    await stubPilotCaseApi(page);
    await consent.getByRole("checkbox", { name: "我已了解并同意以上内容", exact: true }).check();
    await consent.getByRole("button", { name: "同意并创建案例", exact: true }).click();
    await expect(consent).toHaveCount(0);
  }
  const tutorial = page.locator('.rm-focus-onboarding[role="dialog"]');
  const skip = tutorial.getByRole("button", { name: "跳过教程", exact: true });
  // v3 教程在创建后延迟挂载（实测约2.5s）：轮询等待出现即跳过；确认不出现再继续，
  // 否则教程浮层会拦截后续点击（app-shell/visual 全量回归曾因此连片失败）。
  try {
    await skip.click({ timeout: 8_000 });
  } catch {
    // 教程未出现（非首次使用路径），无需跳过
  }
  await expect(tutorial).toHaveCount(0);
}

export function symptomOrganizeButton(page: Page) {
  return page.locator('button[data-rehabmind-tutorial="organize"]:visible');
}

export async function assertNoRuntimeErrors(errors: RuntimeError[]) {
  expect(errors, `浏览器运行时错误：${errors.map((item) => `${item.kind}:${item.message}`).join(" | ")}`).toEqual([]);
}

export async function expectUniqueVisible(page: Page, locatorDescription: string, locator: ReturnType<Page["locator"]>) {
  await expect(locator, `${locatorDescription} 必须唯一`).toHaveCount(1);
  await expect(locator, `${locatorDescription} 必须可见`).toBeVisible();
  return locator;
}

export async function expectNoVisibleText(page: Page, text: string | RegExp) {
  await expect(page.locator("main")).not.toContainText(text);
}

export async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "关键页面不应产生横向溢出").toBeLessThanOrEqual(1);
}

/**
 * 通过测试工作台启动定向场景（page_boundary 快速直达，无需走完整流程）。
 * 返回运行时容器（data-scenario-id 已确认匹配、康复流程导航已就绪）。
 * 研发提供基准实现：测试工作台会持续轮询权限与刷新记录，不能用 networkidle 当就绪条件。
 */
export async function launchWorkbenchScenario(page: Page, scenarioId: string, mode: "页面定向" | "完整流程" = "页面定向") {
  await page.goto("/test/", { waitUntil: "domcontentloaded" });
  const launcher = page.getByTestId("test-workbench-launcher");
  await expect(launcher).toBeVisible({ timeout: 15_000 });
  await launcher.locator(".rm-test-mode > button").filter({ hasText: mode }).click();
  const scenario = page.getByTestId(`test-scenario-${scenarioId}`);
  await expect(scenario, `测试工作台必须提供 ${scenarioId} 真实场景卡`).toBeVisible();
  await scenario.click();
  await launcher.getByRole("button", { name: "开始测试", exact: true }).click();
  const runtime = page.getByTestId("test-workbench-runtime");
  await expect(runtime).toHaveAttribute("data-scenario-id", scenarioId, { timeout: 20_000 });
  await expect(runtime.locator('nav[aria-label="康复流程"]')).toBeVisible({ timeout: 15_000 });
  return runtime;
}

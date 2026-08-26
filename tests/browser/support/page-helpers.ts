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
  await expect(page.locator("body")).toContainText("RehabMind");
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
  const dialog = page.locator('.rm-focus-onboarding[role="dialog"]:visible');
  const skip = dialog.getByRole("button", { name: "跳过教程", exact: true });
  if (await skip.count()) {
    await expect(skip).toBeVisible();
    await skip.click();
  }
  await expect(dialog).toHaveCount(0);
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

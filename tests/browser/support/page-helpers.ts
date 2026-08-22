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
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toContainText("RehabMind");
  await expect(page.locator('[data-rehabmind-tutorial="symptom-input"]:visible')).toHaveCount(1);
}

export async function skipOnboarding(page: Page) {
  const dialog = page.locator('.rm-focus-onboarding[role="dialog"]:visible');
  const skip = dialog.getByRole("button", { name: "跳过教程", exact: true });
  if (await skip.count()) {
    await expect(skip).toBeVisible();
    await skip.click();
  }
  await expect(dialog).toHaveCount(0);
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

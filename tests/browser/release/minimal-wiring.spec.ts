import { expect, test, type Page } from "@playwright/test";
import { assertNoRuntimeErrors, collectRuntimeErrors } from "../support/page-helpers";

async function clearFirstUse(page: Page) {
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
}

async function createAnonymousCase(page: Page) {
  await clearFirstUse(page);
  await page.getByRole("button", { name: "开始康复", exact: true }).click();
  await page.getByLabel("抖音粉丝群", { exact: true }).check();
  await page.getByRole("dialog", { name: "你从哪里了解到我们？" }).getByRole("button", { name: "继续", exact: true }).click();
  await page.getByLabel("我已了解并同意以上内容", { exact: true }).check();
  await page.getByRole("button", { name: "同意并创建案例", exact: true }).click();
  await expect(page.locator('[data-rehabmind-tutorial="symptom-input"]')).toBeEditable();
}

test("L6 current first-use order blocks use after consent refusal @release", async ({ page }) => {
  await clearFirstUse(page);
  await expect(page.getByRole("heading", { name: "你的线上康复助手" })).toBeVisible();
  await page.getByRole("button", { name: "开始康复", exact: true }).click();
  await page.getByLabel("小红书", { exact: true }).check();
  await page.getByRole("dialog", { name: "你从哪里了解到我们？" }).getByRole("button", { name: "继续", exact: true }).click();
  await page.getByRole("button", { name: "暂不使用", exact: true }).click();
  await expect(page.getByRole("heading", { name: "暂未开始使用" })).toBeVisible();
  await expect(page.getByRole("button", { name: "重新查看说明", exact: true })).toBeVisible();
});

test("L6 anonymous case autosaves, restores and submits case-bound feedback @release", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await createAnonymousCase(page);
  const description = "右脚踝昨天扭伤，走路和下楼时疼，恢复目标是正常走路。";
  const input = page.locator('[data-rehabmind-tutorial="symptom-input"]');
  await input.fill(description);
  await expect.poll(() => page.evaluate(async (expected) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open("rehabmind-local-cases", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const draft = await new Promise<unknown>((resolve, reject) => {
      const request = database.transaction("active-draft", "readonly").objectStore("active-draft").get("current");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return JSON.stringify(draft ?? null).includes(expected);
  }, description)).toBe(true);
  await page.reload({ waitUntil: "networkidle" });
  await expect(input).toHaveValue(description);

  await page.getByRole("button", { name: "问题反馈", exact: true }).click();
  const feedback = page.getByRole("dialog", { name: "问题反馈" });
  await expect(feedback.getByLabel("反馈哪个环节？")).toHaveValue("1:症状信息");
  await feedback.getByRole("button", { name: "页面或按钮问题", exact: true }).click();
  await feedback.getByLabel("补充说明（可选）").fill("发布门禁反馈绑定检查");
  await feedback.getByRole("button", { name: "提交反馈", exact: true }).click();
  await expect(feedback).toHaveCount(0);
  await expect(page.locator(".rm-toast")).toContainText("问题反馈已提交");
  await assertNoRuntimeErrors(runtimeErrors);

  await page.getByRole("button", { name: /康复记录/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "删除案例", exact: true }).click();
});

test("L6 invalid administrator credentials cannot open protected records @release", async ({ page, baseURL }) => {
  await page.goto(new URL("admin/", baseURL).toString(), { waitUntil: "networkidle" });
  await page.getByLabel("管理员密钥").fill("definitely-wrong-admin-key");
  await page.getByRole("button", { name: "进入管理台", exact: true }).click();
  await expect(page.getByLabel("管理员密钥")).toBeVisible();
  await expect(page.locator("main")).toContainText(/管理员会话已失效|Admin access is not configured/);
  await expect(page.locator('[aria-label="试用概览"]')).toHaveCount(0);
});

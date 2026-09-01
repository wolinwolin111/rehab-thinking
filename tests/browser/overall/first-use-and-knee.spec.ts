import { expect, test } from "@playwright/test";
import { assertNoRuntimeErrors, collectRuntimeErrors, expectUniqueVisible, openFreshProduct, skipOnboarding, symptomOrganizeButton } from "../support/page-helpers";

async function completeFirstUse(page: import("@playwright/test").Page) {
  const welcome = page.locator('.rm-product-welcome[role="dialog"]:visible');
  if (await welcome.count()) await welcome.getByRole("button", { name: "开始康复", exact: true }).click();
  const tutorial = page.locator('.rm-focus-onboarding[role="dialog"]:visible');
  if (await tutorial.count()) {
    await expect(tutorial).toBeVisible();
    for (let step = 0; step < 3; step += 1) {
      await tutorial.getByRole("button", { name: "下一步", exact: true }).click();
    }
    await tutorial.getByRole("button", { name: "开始使用", exact: true }).click();
  }

  const source = page.locator('.rm-source-gate:visible');
  await expect(source).toBeVisible();
  await source.getByRole("radio", { name: "小红书", exact: true }).check();
  await source.getByRole("button", { name: "继续", exact: true }).click();

  const consent = page.locator('[role="dialog"]:visible').filter({ hasText: "开始前，请确认数据使用方式" });
  await expect(consent).toBeVisible();
  await consent.getByRole("checkbox", { name: "我已了解并同意以上内容", exact: true }).check();
  await consent.getByRole("button", { name: "同意并创建案例", exact: true }).click();
}

test("首次进入、来源、同意和匿名建案形成完整入口闭环", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const createPayload: { current: Record<string, unknown> | null } = { current: null };
  await page.route("**/api/pilot/cases", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    createPayload.current = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        case: {
          caseId: "browser-case-first-use",
          publicCode: "RM-TEST-01",
          accessToken: "browser-test-token",
          revision: 1,
          versions: { appVersion: "test", knowledgeVersion: "test", decisionVersion: "test" },
        },
      }),
    });
  });

  await page.goto("./", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toContainText("悦舒运动康复");
  await completeFirstUse(page);

  await expect(page.locator("#rm-consent-title")).toHaveCount(0);
  await expectUniqueVisible(page, "建案后的症状输入框", page.locator("textarea:visible"));
  expect(createPayload.current?.source).toEqual({ channel: "xiaohongshu", detail: null });
  expect(createPayload.current?.consent).toBeTruthy();
  expect(JSON.stringify(createPayload.current)).not.toMatch(/姓名|手机号/);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("单侧膝从症状到评估、处理复测、训练反馈和总结", async ({ page }) => {
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  await input.fill("右膝下楼时内侧不适，有三个月了");
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await page.getByRole("button", { name: /自助康复/ }).click();
  await page.getByRole("button", { name: /下一步/ }).click();
  await expect(page.locator("main")).toContainText(/症状信息|选择左右/);
  await expect(page.locator(".rm-lower-limb-picker:visible")).toHaveCount(1);
});

import { expect, test } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  assertNoRuntimeErrors,
  collectRuntimeErrors,
  expectUniqueVisible,
  openFreshProduct,
  skipOnboarding,
  stubPilotCaseApi,
  symptomOrganizeButton,
} from "../support/page-helpers";

test.describe("历史缺陷回放·首页和教程", () => {
  test("UX-01 聚焦教程逐步完成、可跳过并能重新打开 @target", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.goto("./", { waitUntil: "domcontentloaded" });

    const welcome = page.locator('.rm-product-welcome[role="dialog"]:visible');
    await expect(welcome).toBeVisible();
    await welcome.getByRole("button", { name: "开始康复", exact: true }).click();
    const source = page.locator('.rm-source-gate:visible');
    await expect(source).toBeVisible();
    await source.getByRole("radio", { name: "小红书", exact: true }).check();
    await source.getByRole("button", { name: "继续", exact: true }).click();
    const consent = page.locator('.rm-consent-gate:visible');
    await expect(consent).toBeVisible();
    await stubPilotCaseApi(page);
    await consent.getByRole("checkbox", { name: "我已了解并同意以上内容", exact: true }).check();
    await consent.getByRole("button", { name: "同意并创建案例", exact: true }).click();
    await expect(consent).toHaveCount(0);

    const dialog = page.locator('.rm-focus-onboarding[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("1 / 4");
    await expect(dialog).toContainText("症状输入框");
    await expect(page.locator(".rm-focus-spotlight")).toBeVisible();

    for (const [step, target] of [[2, "帮我整理"], [3, "康复流程"], [4, "问题反馈"]] as const) {
      await dialog.getByRole("button", { name: "下一步", exact: true }).click();
      await expect(dialog).toContainText(`${step} / 4`);
      await expect(dialog).toContainText(target);
    }

    await expect(dialog).toContainText("有问题随时反馈");
    await dialog.getByRole("button", { name: "开始使用", exact: true }).click();
    await expect(dialog).toHaveCount(0);

    const tutorialButton = await expectUniqueVisible(page, "首页教程入口", page.getByRole("button", { name: "关于 RehabMind", exact: true }));
    await tutorialButton.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "跳过教程", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await assertNoRuntimeErrors(runtimeErrors);
  });

  test("UX-01 页面关键入口具有可操作尺寸且没有横向溢出 @target", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await openFreshProduct(page);
    await skipOnboarding(page);

    const textarea = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
    await textarea.fill("右膝下楼时内侧刺痛，有三个月了");
    await expect(symptomOrganizeButton(page)).toBeEnabled();

    const organize = await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page));
    const organizeBox = await organize.boundingBox();
    expect(organizeBox?.height ?? 0, "帮我整理按钮高度不足").toBeGreaterThanOrEqual(44);
    expect(organizeBox?.width ?? 0, "帮我整理按钮宽度不足").toBeGreaterThanOrEqual(96);

    await organize.click();
    await expect(page.locator("main")).toContainText("症状");
    await assertNoHorizontalOverflow(page);
    await assertNoRuntimeErrors(runtimeErrors);
  });
});

test.describe("历史缺陷回放·状态与内容", () => {
  test("页面的关键评分滑条从未选择状态开始，并保留 0 到 10 的端点说明 @target", async ({ page }) => {
    await openFreshProduct(page);
    await skipOnboarding(page);
    await page.locator("textarea:visible").fill("右膝下蹲时内侧不适，有三个月了");
    await symptomOrganizeButton(page).click();

    await page.getByRole("button", { name: /康复思路模式/ }).click();
    await page.getByRole("button", { name: /下一步/ }).click();
    await page.getByRole("button", { name: /自我检查|给自己检查/ }).click();
    await page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "右侧" }).first().click();
    await page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "膝盖" }).first().click();
    await page.locator('[aria-label="右侧 · 膝内侧关节线"]').click();

    const selects = page.locator("select:visible");
    for (let index = 0; index < await selects.count(); index += 1) {
      const select = selects.nth(index);
      if (!(await select.inputValue())) await select.selectOption({ index: 1 });
    }
    const symptomType = page.getByRole("button", { name: "疼痛，性质说不清", exact: true });
    if (await symptomType.count()) await symptomType.click();
    const noOtherSymptom = page.getByRole("button", { name: "没有以上情况", exact: true });
    if (await noOtherSymptom.count()) await noOtherSymptom.click();
    const weightBearing = page.getByRole("button", { name: "走路、站立或负重", exact: true });
    if (await weightBearing.count()) await weightBearing.click();
    const action = page.locator(".rm-action-picker-grid button").filter({ hasText: "下蹲或起身" });
    if (await action.count()) await action.click();
    await page.getByRole("button", { name: /恢复正常生活/ }).click();

    const slider = page.locator('input[type="range"]:visible').first();
    await expect(slider, "完成真实前置路径后必须出现基线评分滑条").toBeVisible();
    await expect(slider).toHaveAttribute("min", "0");
    await expect(slider).toHaveAttribute("max", "10");
    await expect(slider).toHaveAttribute("value", "0");
    await expect(page.locator("main")).toContainText(/0\s*[·・]/);
    await expect(page.locator("main")).toContainText(/10\s*[·・]/);
  });
});

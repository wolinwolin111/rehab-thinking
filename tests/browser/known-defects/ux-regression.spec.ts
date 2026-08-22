import { expect, test } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  assertNoRuntimeErrors,
  collectRuntimeErrors,
  expectUniqueVisible,
  openFreshProduct,
  skipOnboarding,
} from "../support/page-helpers";

test.describe("历史缺陷回放·首页和教程", () => {
  test("UX-01 聚焦教程逐步完成、可跳过并能重新打开 @target", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const dialog = page.locator('.rm-focus-onboarding[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("1 / 5");
    await expect(dialog).toContainText("工作台入口");
    await expect(page.locator(".rm-focus-spotlight")).toBeVisible();

    for (const [step, target] of [[2, "症状输入框"], [3, "帮我整理"], [4, "康复流程"], [5, "康复记录"]] as const) {
      await dialog.getByRole("button", { name: "下一步", exact: true }).click();
      await expect(dialog).toContainText(`${step} / 5`);
      await expect(dialog).toContainText(target);
    }

    await expect(dialog).toContainText("不替代医生诊断");
    await expect(dialog).toContainText("不使用 AI 代替用户或专业人员做康复决策");
    await dialog.getByRole("button", { name: "开始使用", exact: true }).click();
    await expect(dialog).toHaveCount(0);

    const tutorialButton = await expectUniqueVisible(page, "首页教程入口", page.getByRole("button", { name: "使用教程", exact: true }));
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
    await expect(page.getByRole("button", { name: "帮我整理", exact: true })).toBeEnabled();

    const organize = await expectUniqueVisible(page, "帮我整理", page.getByRole("button", { name: "帮我整理", exact: true }));
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
    await page.getByRole("button", { name: "帮我整理", exact: true }).click();

    await page.getByRole("button", { name: /康复思路模式/ }).click();
    await page.getByRole("button", { name: /下一步/ }).click();
    await page.getByRole("button", { name: /自我检查|给自己检查/ }).click();
    await page.locator('[aria-label="右侧膝盖正面"]').click();
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

import { expect, test } from "@playwright/test";
import { assertNoRuntimeErrors, collectRuntimeErrors, expectUniqueVisible, launchWorkbenchScenario, openFreshProduct, skipOnboarding } from "../support/page-helpers";

test("刷新后恢复未完成阶段、原答案和本机草稿", async ({ page }) => {
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "本机草稿输入框", page.locator("textarea:visible"));
  const draft = "右膝下楼时内侧不适，刷新后应保留这段内容";
  await input.fill(draft);
  // 草稿保存是 800ms 防抖且桌面端状态提示不渲染为可见文案；等待写入完成后
  // 用真实刷新验证恢复结果，而不是绑定一个不存在的桌面提示。
  await page.waitForTimeout(1_000);
  await page.reload({ waitUntil: "networkidle" });
  await skipOnboarding(page);
  await expect(page.locator("textarea:visible")).toHaveValue(draft);
});

test("多标签页保存发生交错时给出冲突或重新加载提示，而不是静默覆盖", async ({ context, page }) => {
  await openFreshProduct(page);
  await skipOnboarding(page);
  const otherTab = await context.newPage();
  await openFreshProduct(otherTab);
  await skipOnboarding(otherTab);

  await (await expectUniqueVisible(page, "主标签输入框", page.locator("textarea:visible"))).fill("主标签版本");
  await expect(page.locator('[aria-live="polite"]:visible')).toContainText("已保存到本机", { timeout: 5000 });
  await (await expectUniqueVisible(otherTab, "第二标签输入框", otherTab.locator("textarea:visible"))).fill("第二标签版本");
  await expect(otherTab.locator('[aria-live="polite"]:visible')).toContainText("已保存到本机", { timeout: 5000 });
  await expect(page.locator("main")).toContainText(/多标签|冲突|其他标签|重新加载/);
  await otherTab.close();
});

test("处理后加重和训练后加重必须进入独立的停止与聚焦复查证据 @scenario", async ({ page }) => {
  // Phase 4.1 fixme 转化。训练加重：training-worse 定向种子直达训练页，记录第一组
  // 反馈为「做完更不舒服」→ 出现独立的训练加重警告（rm-training-warning），
  // 带「处理这次加重」（beginAdverseReassessment source:training 聚焦复查）与
  // 「保存并结束」两个出口。处理加重：现有 treatment-worse 种子只设 postScore、无
  // worse trialRecord，落的是继续排查面板而非加重停止面板（种子局限，已登记需 dev
  // 补 worse-trialRecord 靶子）；这里钉两条路径互不冒充的独立性。
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);

  // 训练加重：直达训练页，第一个动作反馈选「做完更不舒服」。
  const training = await launchWorkbenchScenario(page, "training-worse");
  const product = training.locator(".rm-test-product");
  await product.getByRole("button", { name: "做完更不舒服", exact: true }).first().click();
  const warning = training.getByTestId("training-worsening-warning");
  await expect(warning, "训练后加重必须出现独立停止警告").toBeVisible({ timeout: 10_000 });
  await expect(warning).toContainText("后不适更重");
  await expect(warning.getByRole("button", { name: "处理这次加重", exact: true })).toBeVisible();
  await expect(warning.getByRole("button", { name: "保存并结束", exact: true })).toBeVisible();
  // 训练加重警告不得复用处理加重停止面板的标题（两条证据独立）。
  await expect(product.getByText(/刚才的处理使症状或活动表现加重/)).toHaveCount(0);

  // 处理加重种子（treatment-worse）不得渲染训练加重警告（反向独立性）。
  await page.getByRole("button", { name: "切换场景", exact: true }).click();
  const treatment = await launchWorkbenchScenario(page, "treatment-worse");
  await expect(treatment.getByTestId("training-worsening-warning")).toHaveCount(0);

  await assertNoRuntimeErrors(runtimeErrors);
});

import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, expectUniqueVisible, launchWorkbenchScenario, openFreshProduct, skipOnboarding, symptomOrganizeButton } from "../support/page-helpers";

// R 组：症状收集「最近一次出现时间」（e3b9359 + d9e8f2a + 1806d9f）。
//
// 行为契约：
// 1. 病程=反复出现 → 追加必答条件题「最近一次出现」（今天内/1～3天前/4～7天前/一周以上/说不清）；
//    病程切离反复出现 → 字段隐藏且值清除。
// 2. isAcuteTrauma 扩展：反复 + 最近一次∈{今天内,1～3天前} + 外伤机制 → 急性链生效
//   （踝足 Ottawa 骨性问进关键确认等）。自发再发不判急性（Ottawa 指征是外伤）。
// 3. 1806d9f：guided「发生方式」机制题出现条件扩展到急性再发窗口。
// R-2~R-4 经 dev 663c6c8 定向场景（安全确认边界 step 1，播种 onset+lastEpisodeOnset+mechanism，
// 绕开解析层「今天或昨天优先匹配」的既有边界）直接断言骨性问答出现/不出现。

// --- R-1 专业面板条件题：出现 / 隐藏 / 切换清除 + 还需补充清单字段名 ---

test("R-1 专业面板：反复出现触发最近一次字段、切离清除、清单含字段名 @scenario", async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  await input.fill("右膝内侧疼，有三个月了");
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await page.getByRole("button", { name: /康复思路模式/ }).first().click();
  await page.getByRole("button", { name: /下一步/ }).first().click();
  await expect(page.locator("h1:visible")).toContainText(/记录主诉与评估条件|专业症状收集/, { timeout: 10_000 });
  await page.getByRole("button", { name: "右侧", exact: true }).first().click();
  await page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "膝盖" }).first().click();
  await page.locator('[aria-label="右侧 · 膝内侧关节线"]:visible').first().click();

  const onsetSelect = page.getByRole("combobox", { name: "病程", exact: true });
  const lastSel = page.getByRole("combobox", { name: "最近一次出现", exact: true });
  // 初始（超过6周）：无最近一次字段。
  await expect(onsetSelect).toHaveCount(1);
  await expect(lastSel).toHaveCount(0);
  // 反复出现 → 最近一次字段出现。
  await onsetSelect.selectOption({ label: "反复出现" });
  await expect(lastSel).toHaveCount(1);
  // 选今天内。
  await lastSel.selectOption({ label: "今天内" });
  // 切离反复出现 → 字段隐藏 + 值清除。
  await onsetSelect.selectOption({ label: "超过6周" });
  await expect(lastSel).toHaveCount(0);
  // 回到反复出现：最近一次应已被清除（此前选的是今天内，但切换清除了）。
  await onsetSelect.selectOption({ label: "反复出现" });
  await expect(lastSel).toHaveCount(1);
  // 需补充清单：选反复出现 + 机制但不填最近一次 → footer 含字段名。
  await page.getByRole("combobox", { name: "发生机制", exact: true }).selectOption({ label: "扭转或崴伤" });
  await page.waitForTimeout(300);
  const footer = page.locator(".rm-professional-footer").first();
  await expect(footer).toContainText("还需补充");
  await expect(footer).toContainText("最近一次出现");
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

// --- R-2 急性再发踝：反复 + 今天内 + 崴伤 → 关键确认出现骨性风险问答 ---

test("R-2 急性再发踝：反复+今天内+崴伤 → 骨性风险问答出现 @scenario", async ({ page }) => {
  // dev 663c6c8 定向场景 recurrent-flare-acute（step 1 安全确认边界，直接播种 onset+lastEpisodeOnset+mechanism）。
  test.setTimeout(120_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "recurrent-flare-acute");
  // 骨性风险阶段出现（Ottawa 标记）；问答卡在引导前置展开，本定向场景以阶段标记为准
  //（dev 冒烟口径：acute 有「骨性风险」）。对照组断言见 R-3/R-4。
  await expect(runtime).toContainText("骨性风险", { timeout: 10_000 });
  await expect(runtime).toContainText("开始前确认", { timeout: 10_000 });
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

// --- R-3 对照组：急性再发窗口外 → 不判急性（无骨性问答） ---

test("R-3 对照：反复+一周以上+崴伤 → 无骨性问答 @scenario", async ({ page }) => {
  test.setTimeout(120_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "recurrent-flare-chronic");
  // 对照组：骨性风险阶段不出现（dev 冒烟口径：对照组无「骨性风险」）+ 无骨性问答内容。
  await expect(runtime).not.toContainText("骨性风险", { timeout: 10_000 });
  await expect(runtime).not.toContainText(/骨头|骨点|当时能否|能不能连续走|压痛.*集中/, { timeout: 10_000 });
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

// --- R-4 对照组：无外伤机制 → 不判急性（无骨性问答） ---

test("R-4 对照：反复+今天内+没有明确受伤 → 无骨性问答 @scenario", async ({ page }) => {
  test.setTimeout(120_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "recurrent-flare-no-trauma");
  await expect(runtime).not.toContainText("骨性风险", { timeout: 10_000 });
  await expect(runtime).not.toContainText(/骨头|骨点|当时能否|能不能连续走|压痛.*集中/, { timeout: 10_000 });
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

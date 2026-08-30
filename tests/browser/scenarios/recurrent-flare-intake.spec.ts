import { expect, test, type Page } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, expectUniqueVisible, openFreshProduct, skipOnboarding, symptomOrganizeButton } from "../support/page-helpers";

// R 组：症状收集「最近一次出现时间」（e3b9359 + d9e8f2a + 1806d9f）。
//
// 行为契约：
// 1. 病程=反复出现 → 追加必答条件题「最近一次出现」（今天内/1～3天前/4～7天前/一周以上/说不清）；
//    病程切离反复出现 → 字段隐藏且值清除。
// 2. isAcuteTrauma 扩展：反复 + 最近一次∈{今天内,1～3天前} + 外伤机制 → 急性链生效
//   （踝足 Ottawa 骨性问进关键确认等）。自发再发不判急性（Ottawa 指征是外伤）。
// 3. 1806d9f：guided「发生方式」机制题出现条件扩展到急性再发窗口。

/** 驱动 guided 到「确认你的问题信息」审阅屏（病程由描述文本解析）。R-2~R-4 fixme 恢复时可复用。 */
async function toRecurrentReview(page: Page, description: string) {
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  await input.fill(description);
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await page.getByRole("button", { name: /自助康复/ }).first().click();
  await page.getByRole("button", { name: /下一步/ }).first().click();
  await page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "右侧" }).first().click();
  await page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "脚踝" }).first().click();
  await page.locator('[aria-label^="右侧 · 外踝"]:visible').first().click();
  await page.getByRole("button", { name: /下一步/ }).first().click();
  await expect(page.locator("h1:visible")).toContainText("确认你的问题信息", { timeout: 10_000 });
}

/** 在审阅屏作答：最近一次出现 + 发生方式（机制题）。lastEpisode 之后机制为按钮 Pill 选项。 */
async function fillReview(page: Page, lastEpisode: string, mechanism: string | null) {
  const lastSel = page.locator("select:visible").filter({ has: page.locator("option", { hasText: lastEpisode }) }).first();
  await expect(lastSel, "最近一次出现 select 必须存在").toHaveCount(1, { timeout: 10_000 });
  await lastSel.selectOption({ label: lastEpisode });
  await page.waitForTimeout(300);
  const mechBtn = page.locator("main button:visible").filter({ hasText: "发生方式" }).first();
  if (mechanism) {
    await expect(mechBtn, "急性再发必须出现发生方式（机制题）").toBeVisible();
    await mechBtn.click();
    await page.waitForTimeout(400);
    const mechOption = page.locator("main button:visible").filter({ hasText: mechanism }).first();
    await expect(mechOption).toBeVisible();
    await mechOption.click();
  } else {
    if (await mechBtn.count()) {
      mechBtn.click();
      await page.waitForTimeout(400);
      const traumaOpt = page.locator("main button:visible").filter({ hasText: /扭转或崴伤|跑跳或拉伤/ }).first();
      await expect(traumaOpt).toHaveCount(0);
    }
  }
  const next = page.getByRole("button", { name: /下一步/ }).first();
  await expect(next).toBeEnabled({ timeout: 8_000 });
}

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

test.fixme("R-2 急性再发踝：反复+今天内+崴伤 → 骨性风险问答出现 @scenario", async ({ page }) => {
  // 依赖 guided 描述文本把 onset 解析为「反复出现」，该解析属 dev 已注明的既有行为边界
  //（「反反复复…今天早上又疼」会被判为今天或昨天）。稳定触发需 /test 定向场景（snapshot 设
  // onset=反复出现 + lastEpisodeOnset=今天内 + mechanism=扭转或崴伤），待 dev 提供。
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  expect(runtimeErrors).toEqual([]);
});

// --- R-3 对照组：急性再发窗口外 / 无外伤机制 → 不判急性（无骨性问答） ---

test.fixme("R-3 对照：反复+一周以上+崴伤 → 无骨性问答 @scenario", async ({ page }) => {
  // 同 R-2：依赖 guided onset 解析；待 /test 定向（lastEpisodeOnset=一周以上）。
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  expect(runtimeErrors).toEqual([]);
});

test.fixme("R-4 对照：反复+今天内+没有明确受伤 → 无骨性问答 @scenario", async ({ page }) => {
  // 同 R-2：依赖 guided onset 解析；待 /test 定向（lastEpisodeOnset=今天内 + mechanism=没有明确受伤）。
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  expect(runtimeErrors).toEqual([]);
});

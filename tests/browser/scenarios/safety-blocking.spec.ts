import { expect, test, type Page } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, openFreshProduct, skipOnboarding, symptomOrganizeButton, expectUniqueVisible } from "../support/page-helpers";
import { completeProfessionalAssessment, prepareProfessionalOther } from "../drivers/pilot-flow";

// D 组浏览器层（开发侧交接第三部分 D-2/D-3）。
// D-2：急性踝扭伤的安全确认出现骨性风险问题（Ottawa 口径）；任一条件满足 →
//      「建议优先结合影像确认」+ 后续安排影像，普通检查不得无条件继续。
// D-3：前交叉韧带稳定性检查阳性 → 转医学评估。
//      ⚠️ 当前专业膝部首轮评估的排序预算会把专项检查挤出队列（触发逻辑本身
//      已通过 tests/unit/domain/special-test-trigger.test.mjs），标记 fixme，
//      详见 docs/quality/defect-special-queue-2026-08-30.md。

async function runGuidedAcuteAnkleToSafety(page: Page) {
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  await input.fill("昨天崴了右脚，外踝疼得厉害，走路有点跛");
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await page.getByRole("button", { name: /自助康复/ }).first().click();
  await page.getByRole("button", { name: /下一步/ }).first().click();
  // 位置：右脚踝外踝。
  const side = page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "右侧" }).first();
  await side.click();
  const area = page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "脚踝" }).first();
  await area.click();
  const lateral = page.locator('[aria-label^="右侧 · 外踝"]:visible').first();
  await expect(lateral, "右外踝分区必须可见").toBeVisible();
  await lateral.click();
  await page.getByRole("button", { name: /下一步/ }).first().click();
  // 病程：出现多久 → 今天或昨天。
  const onsetSelect = page.locator("select:visible").first();
  if (await onsetSelect.count()) {
    const options = await onsetSelect.locator("option").allTextContents();
    if (options.includes("今天或昨天")) await onsetSelect.selectOption({ label: "今天或昨天" });
    else await onsetSelect.selectOption({ index: 1 });
  }
  // 逐屏分派：发生方式/目前情况/诱发动作/恢复目标/不适分数。
  let guard = 0;
  while (guard < 14) {
    guard += 1;
    const enterConfirmation = page.getByRole("button", { name: "进入关键确认", exact: true });
    if (await enterConfirmation.count()) break;
    const nextButton = page.getByRole("button", { name: /下一步/ }).first();
    const nextCount = await nextButton.count();
    const mechanismOption = page.locator("main button:visible").filter({ hasText: /扭转或崴脚|崴伤|扭伤/ });
    const noneOption = page.getByRole("button", { name: "没有以上情况", exact: true });
    const walkOption = page.locator("main button:visible").filter({ hasText: /走路|站立/ });
    const goalOption = page.locator("main button:visible").filter({ hasText: /恢复日常活动/ });
    const slider = page.locator('input[type="range"]:visible').first();
    const visibleSelect = page.locator("select:visible").first();
    if (await visibleSelect.count()) {
      // 发生方式等下拉屏：优先选急性外伤口径。
      const options = await visibleSelect.locator("option").allTextContents();
      const acute = options.find((option) => /崴|扭/.test(option));
      if (acute) await visibleSelect.selectOption({ label: acute });
      else await visibleSelect.selectOption({ index: 1 });
    } else if (await noneOption.count()) await noneOption.first().click();
    else if (await walkOption.count()) await walkOption.first().click();
    else if (await goalOption.count()) await goalOption.first().click();
    else if (await mechanismOption.count()) await mechanismOption.first().click();
    else if (await slider.count()) {
      // 键盘逐步加值，确保 React onChange 触发确认。
      await slider.focus();
      for (let step = 0; step < 5; step += 1) await slider.press("ArrowRight");
    }
    await page.waitForTimeout(150);
    if (!nextCount) {
      // 审阅屏缺未确认字段（如不适分数）：逐屏回退，找到滑条后键盘补答。
      if (await page.getByRole("button", { name: "进入关键确认", exact: true }).count()) break;
      let backGuard = 0;
      while (backGuard < 6) {
        backGuard += 1;
        if (await slider.count()) {
          await slider.focus();
          for (let step = 0; step < 5; step += 1) await slider.press("ArrowRight");
          await page.waitForTimeout(200);
          break;
        }
        const back = page.getByRole("button", { name: /上一步/ }).first();
        if (!(await back.count())) break;
        await back.click();
        await page.waitForTimeout(300);
        if (await page.getByRole("button", { name: "进入关键确认", exact: true }).count()) break;
      }
      continue;
    }
    if (!(await nextButton.isEnabled())) {
      throw new Error("guided 逐屏循环：下一步仍不可用（当前屏缺答案）");
    }
    await nextButton.click();
    await page.waitForTimeout(400);
    // 到达关键确认即结束。
    if (await page.getByRole("button", { name: "进入关键确认", exact: true }).count()) break;
    // 过渡期间下一步可能短暂消失，等待其回到页面。
    await expect(nextButton.or(page.getByRole("button", { name: "进入关键确认", exact: true }))).toBeVisible({ timeout: 8_000 }).catch(() => {});
  }
  // 进入关键确认。
  await page.getByRole("button", { name: "进入关键确认", exact: true }).click();
}

test("D-2 骨性风险阳性：建议优先结合影像确认并安排影像 @scenario", async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await runGuidedAcuteAnkleToSafety(page);

  const main = page.locator("main:visible");
  // 安全信号逐项「没有」。
  const safetyItems = page.locator(".rm-safety-list article:visible");
  const safetyCount = await safetyItems.count();
  expect(safetyCount, "安全确认项目必须逐项呈现").toBeGreaterThan(0);
  for (let index = 0; index < safetyCount; index += 1) {
    const item = safetyItems.nth(index);
    await item.getByRole("button", { name: "没有", exact: true }).first().click();
  }
  // 进入骨性风险阶段（急性崴脚会出现）。
  const advance = main.getByRole("button", { name: /继续|下一步/ }).first();
  await expect(advance).toBeEnabled();
  await advance.click();
  const boneCheck = page.locator(".rm-bone-check:visible");
  await expect(boneCheck).toBeVisible({ timeout: 10_000 });
  // Ottawa 口径：骨点压痛「是」+ 当时/现在不能连续走四步 → 影像优先。
  const boneSpot = boneCheck.locator("article").filter({ hasText: /压痛.*集中在|突出的骨头/ });
  await boneSpot.getByRole("button", { name: "是", exact: true }).click();
  const walkThen = boneCheck.locator("article").filter({ hasText: /当时能否/ });
  await walkThen.getByRole("button", { name: "不能", exact: true }).click();
  const walkNow = boneCheck.locator("article").filter({ hasText: /现在能否/ });
  await walkNow.getByRole("button", { name: "不能", exact: true }).click();
  // 三题齐答后出现影像优先结论。
  await expect(boneCheck.locator(".is-review").filter({ hasText: "建议优先结合影像确认" })).toBeVisible({ timeout: 10_000 });
  // 影像结论：没有做影像 → 明确安排影像确认。
  await main.getByRole("button", { name: /继续|下一步/ }).first().click();
  await main.getByRole("button", { name: "没有做影像", exact: true }).first().click();
  await expect(main).toContainText(/安排影像|影像确认|先做轻柔检查/, { timeout: 10_000 });
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("D-3 专项检查入队且阳性：转医学评估出口 @scenario", async ({ page }) => {
  // 8191fb0 缺陷2 修复：触发且未入清单的专项检查追加在基础评估之后（不受排序
  // 预算限制）。专业膝部协助检查 + 专项检查能力 → 队列尾出现前交叉韧带稳定性
  // 检查卡 → 阳性（出现不适）→ T-04 确认 → 评估结果出现医学评估出口。
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  page.on("dialog", (dialog) => dialog.accept());
  // 急性扭转口径：ACL 稳定性检查的触发前提（慢性无外伤不触发专项）。
  await prepareProfessionalOther(page, {
    capabilities: ["专项检查"],
    description: "昨天打篮球时扭转伤到右膝，现在肿痛，感觉不稳",
    onset: "今天或昨天",
    mechanism: "扭转或崴伤",
  });
  // 评估固定序列到单腿支撑卡（已答），专项卡从下一卡开始。
  await completeProfessionalAssessment(page, { stopBeforeSummary: true });

  const main = page.locator("main:visible");
  // 缺陷2 复测点：专项检查追加在清单尾部（基础项之后），不再被预算挤出。
  // 第一张专项卡 = 急性膝外伤骨折风险判断（safety 类），阳性 → 医学评估转介。
  await main.getByRole("button", { name: "下一个检查", exact: true }).click({ timeout: 10_000 });
  await expect(page.locator("h1:visible")).toContainText("骨折风险", { timeout: 10_000 });
  await main.getByRole("button", { name: /出现提示反应/ }).first().click();
  await expect(main.getByRole("button", { name: "下一个检查", exact: true })).toBeEnabled({ timeout: 5_000 });
  await main.getByRole("button", { name: "下一个检查", exact: true }).click();
  // 第二张专项卡 = 前交叉韧带稳定性检查（队尾最后一卡），阳性口径。
  // 答完后「下一个检查」被「查看评估结果」替换。
  await expect(page.locator("h1:visible")).toContainText("前交叉韧带稳定性", { timeout: 10_000 });
  await main.getByRole("button", { name: /出现提示反应/ }).first().click();
  await main.getByRole("button", { name: "查看评估结果", exact: true }).first().click({ timeout: 10_000 });
  // 评估结果：safety 类专项阳性 → 「先不要继续自助处理」转介出口（普通处理入口被
  // 「保存并结束本次」替代）；ACL 阳性进入后续跟踪。
  await expect(main).toContainText(/先不要继续自助处理/, { timeout: 10_000 });
  await expect(main).toContainText(/专业人员线下评估/, { timeout: 10_000 });
  await expect(main).toContainText(/前交叉韧带稳定性检查.*出现阳性线索|出现阳性线索/, { timeout: 10_000 });
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

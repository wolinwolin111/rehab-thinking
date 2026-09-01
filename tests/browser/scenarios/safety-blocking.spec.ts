import { expect, test, type Page } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors } from "../support/page-helpers";
import { completeProfessionalAssessment, driveGuidedAcuteAnkleToSafetyConfirmation, prepareProfessionalOther } from "../drivers/pilot-flow";

// D 组浏览器层（开发侧交接第三部分 D-2/D-3）。
// D-2：急性踝扭伤的安全确认出现骨性风险问题（Ottawa 口径）；任一条件满足 →
//      「建议优先结合影像确认」+ 后续安排影像，普通检查不得无条件继续。
// D-3：前交叉韧带稳定性检查阳性 → 转医学评估。
//      ⚠️ 当前专业膝部首轮评估的排序预算会把专项检查挤出队列（触发逻辑本身
//      已通过 tests/unit/domain/special-test-trigger.test.mjs），标记 fixme，
//      详见 docs/quality/defect-special-queue-2026-08-30.md。

async function runGuidedAcuteAnkleToSafety(page: Page) {
  await driveGuidedAcuteAnkleToSafetyConfirmation(page);
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

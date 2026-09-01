import { expect, test } from "@playwright/test";
import { assertNoRuntimeErrors, collectRuntimeErrors, launchWorkbenchScenario } from "../support/page-helpers";
import { driveGuidedAcuteAnkleToSafetyConfirmation, prepareProfessionalMultiAction } from "../drivers/pilot-flow";

// Phase 4.1 fixme 转化：安全边界四条中，踝安全停止与无主诉动作分数已接入；
// 双侧纵向与动作无法完成两条仍在接入中（保留 fixme，见各自注释）。

test("急性踝扭伤安全停止并保留保存出口 @scenario", async ({ page }) => {
  // 真实产品完整路径（自助康复）驱动到安全确认；安全信号答「有」→
  // 骨性风险 → 影像结论后落阻断出口：「先完成针对性医学评估」+「保存本次信息」，
  // 普通评估入口「开始评估检查」保持禁用。与 D-2（骨性风险阳性）互补：
  // D-2 走安全信号全「没有」→ 骨性风险；本条走安全信号「有」→ 医学评估停止。
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await driveGuidedAcuteAnkleToSafetyConfirmation(page);
  const main = page.locator("main:visible");

  // 安全信号逐项作答：第一项「有」，其余「没有」。
  const safetyItems = page.locator(".rm-safety-list article:visible");
  const safetyCount = await safetyItems.count();
  expect(safetyCount, "安全确认项目必须逐项呈现").toBeGreaterThan(0);
  await safetyItems.first().getByRole("button", { name: "有", exact: true }).click();
  for (let index = 1; index < safetyCount; index += 1) {
    await safetyItems.nth(index).getByRole("button", { name: "没有", exact: true }).click();
  }
  // 安全信号存在时，stage 0 主按钮标签为「继续填写医生结论」，但急性崴脚仍需
  // 经过骨性风险三题（onContinue 按 needsBoneQuestions 落到 stage 1）。
  await main.getByRole("button", { name: "继续填写医生结论", exact: true }).click();
  const boneCheck = main.locator(".rm-bone-check:visible");
  await expect(boneCheck, "急性崴脚安全信号后仍出现骨性风险三题").toBeVisible({ timeout: 10_000 });
  await boneCheck.locator("article").filter({ hasText: /压痛.*集中在|突出的骨头/ }).getByRole("button", { name: "不是", exact: true }).click();
  await boneCheck.locator("article").filter({ hasText: /当时能否/ }).getByRole("button", { name: "能", exact: true }).click();
  await boneCheck.locator("article").filter({ hasText: /现在能否/ }).getByRole("button", { name: "能", exact: true }).click();
  await main.getByRole("button", { name: "继续填写影像结论", exact: true }).click();

  // 影像结论：没有做影像 → 安全信号未解除 → 停止出口。
  await main.getByRole("button", { name: "没有做影像", exact: true }).first().click();
  const stop = main.locator(".rm-route-note.is-waiting");
  await expect(stop, "安全信号未解除必须给出针对性医学评估停止提示").toBeVisible({ timeout: 10_000 });
  await expect(stop).toContainText("先完成针对性医学评估");
  // 普通评估入口被阻断：主按钮「开始评估检查」保持禁用。
  await expect(main.getByRole("button", { name: "开始评估检查", exact: true })).toBeDisabled();
  // 保存出口保留：点击后确认落盘反馈。
  await stop.getByRole("button", { name: "保存本次信息", exact: true }).click();
  await expect(main.locator(".rm-toast")).toContainText("本次信息已保存，可在完成医学评估后继续", { timeout: 5_000 });
  await assertNoRuntimeErrors(runtimeErrors);
});

test("双侧选择优先侧、分别评估和分别复测 @scenario", async ({ page }) => {
  // Phase 4.1 fixme 转化。bilateral-longitudinal 定向种子落在双侧伸直逐侧记录卡。
  // 钉住双侧最核心的语义（也是逐侧复测的前置）：
  //   1) 优先侧标注：右侧标「主诉优先侧」，要求先记录右侧再记录另一侧；
  //   2) 分别评估：只完成一侧时本项保持未完成（「另一侧尚未完成」+ 下一个检查禁用）；
  //   3) 两侧均记录受限后解锁推进，并生成双侧活动受限发现（逐侧结果分别保留）。
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "bilateral-longitudinal");
  const main = runtime.locator("main:visible").first();
  await page.waitForTimeout(1_200);

  // 优先侧标注。
  await expect(main.getByText("先记录右侧，再记录另一侧")).toBeVisible({ timeout: 10_000 });
  await expect(main.getByText("主诉优先侧")).toBeVisible();

  // 只记录右侧受限 → 另一侧未完成门禁。
  const sideLimited = main.getByRole("button", { name: "受限或代偿", exact: true });
  await sideLimited.nth(0).click();
  await page.waitForTimeout(400);
  await expect(main.getByText(/另一侧尚未完成/)).toBeVisible({ timeout: 8_000 });
  await expect(main.getByRole("button", { name: "下一个检查", exact: true })).toBeDisabled();

  // 记录左侧受限 → 两侧齐备，补对比与不适后解锁推进。
  await sideLimited.nth(1).click();
  await page.waitForTimeout(400);
  await expect(main.getByText(/左右均已记录 · 优先侧仍为右侧/)).toBeVisible({ timeout: 8_000 });
  // 对比与不适按钮可访问名含副标签（如「两侧偏小 两侧都受限」），用正则匹配。
  await main.getByRole("button", { name: /两侧偏小/ }).first().click();
  await main.getByRole("button", { name: /^没有不适/ }).first().click();
  await expect(main.getByRole("button", { name: "下一个检查", exact: true })).toBeEnabled({ timeout: 8_000 });

  // 双侧活动受限发现分别保留（侧栏评估结果出现伸直活动受限项）。
  await expect(main.getByText("活动受限").first()).toBeVisible({ timeout: 8_000 });
  await expect(main.getByText("膝关节主动伸直（AROM）").first()).toBeVisible();
  await assertNoRuntimeErrors(runtimeErrors);
});

test("没有明确主诉动作时不生成伪造动作分数 @scenario", async ({ page }) => {
  // assessment-all-normal 定向种子：noFixedAction + 无评分 intake + 评估全正常。
  // 处理段落空态出口（B2-4 已钉文案），这里钉分数负证据：
  // 没有明确主诉动作时，页面不得凭空生成动作分数块、评分滑条或「主诉动作 N/10」。
  // 作用域收到产品区，避开工作台工具栏的 fixtureNote 文本。
  test.setTimeout(120_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "assessment-all-normal");
  const product = runtime.locator(".rm-test-product");
  await expect(product.getByText("本次没有发现明确异常")).toBeVisible({ timeout: 10_000 });
  await expect(product.locator(".rm-final-score")).toHaveCount(0);
  await expect(product.locator('input[type="range"]')).toHaveCount(0);
  await expect(product.locator("main")).not.toContainText(/主诉动作.*[0-9]+\s*\/\s*10|[0-9]+\s*\/\s*10.*主诉动作/);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("动作无法完成的不同原因分别保留并阻止误判正常 @scenario", async ({ page }) => {
  // Phase 4.1 fixme 转化：专业多动作真实控件驱动。两个功能动作给不同无法完成原因：
  //   下蹲 →「没力或撑不住」(weak) → 归入「动作不适」，结论「当前无法完成」；
  //   下台阶 →「担心继续会加重」(fear) → 归入「后续跟踪」，结论「暂时没判断清楚」。
  // 源码 functionSimpleAnswer：pain→unable、weak→weak、fear/instruction→skip，
  // skip 明确「这次不把它算成正常或偏弱」。两条不同原因分别保留、都不误判为正常。
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalMultiAction(page);
  const main = page.locator("main:visible");
  const click = async (name: RegExp | string, desc: string) => {
    const b = main.getByRole("button", { name: name as never }).first();
    await b.waitFor({ timeout: 8_000 });
    await b.click();
    await page.waitForTimeout(300);
  };
  await click("打开检查", "打开检查");
  await click("做不完或不敢继续", "下蹲做不完");
  await click("没力或撑不住", "下蹲没力");
  await click("下一个检查", "下蹲→台阶");
  await click("做不完或不敢继续", "台阶做不完");
  await click("担心继续会加重", "台阶担心");
  await click("下一个检查", "台阶→伸直");

  // 侧栏「评估结果」实时分别保留两条不同结论（weak→当前无法完成，fear→暂时没判断清楚）。
  await expect(main.getByText("当前无法完成")).toBeVisible({ timeout: 10_000 });
  await expect(main.getByText("下台阶暂时没判断清楚")).toBeVisible({ timeout: 10_000 });
  // 阻止误判正常：每个动作所在的结果条目都不得被记为正常口径。
  await expect(main.locator("article").filter({ hasText: "双腿闭链下蹲功能检查" })).not.toContainText("正常");
  await expect(main.locator("article").filter({ hasText: "下台阶" })).not.toContainText("正常");
  await assertNoRuntimeErrors(runtimeErrors);
});

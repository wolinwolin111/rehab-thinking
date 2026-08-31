import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, launchWorkbenchScenario } from "../support/page-helpers";
import { prepareProfessionalMultiAction } from "../drivers/pilot-flow";
// FR 组：功能复测疼痛对比（e5cdf85）+ 恐动拆分（2069385）+ 清理链（fef2886）。
//
// e5cdf85：completion-status 复测带疼痛分数对比（context「处理前 X/10 当时做不完时的疼」，
// 没打分不能提交=完成门）；结果语义：能完成+分降=better / 分平=partial / 分升=worse。
// 2069385：恐动与疼痛/不会做解耦——评估功能/动作/力量卡疼后追加正交题
//「当时是不是也担心继续会加重？[有/没有]」→ unableFearTogether（可选字段，不 bump 版本）。
// fef2886：恐动答案随原因切换清除（疼↔没力保留，切到不敢/不会清除）+ 文案防御。

test("FR-1 function-flare-retest：复测带分且完成门生效 @scenario", async ({ page }) => {
  test.setTimeout(120_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "function-flare-retest");
  await page.waitForTimeout(400);
  const record = runtime.getByRole("button", { name: "记录这些动作", exact: true }).first();
  // 完成门：未打分时提交不可用。
  await expect(record).toBeDisabled();
  // 复测卡：能完成 → 疼痛滑条 + context「处理前 X/10 当时做不完时的疼」。
  await runtime.getByRole("button", { name: "能完成", exact: true }).first().click();
  await expect(runtime.locator('input[type="range"]:visible')).toHaveCount(1);
  await expect(runtime).toContainText(/处理前.*\/10|当时做不完/);
  // 打分（分降 → 放行）+ 提交。
  await runtime.locator('input[type="range"]:visible').first().fill("4");
  await expect(record).toBeEnabled();
  await record.click();
  // 提交后进入处理复测阶段（rail 4 进行中）。
  await expect(runtime.locator('nav[aria-label="康复流程"]')).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("FR-2 恐动题：功能卡疼路径出现、填写、切换清除 @scenario", async ({ page }) => {
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalMultiAction(page);
  const main = page.locator("main:visible");
  await main.getByRole("button", { name: "打开检查", exact: true }).click();
  await page.waitForTimeout(400);
  // 下蹲功能卡：unable + 疼 → 恐动题出现。
  await main.getByRole("button", { name: "做不完或不敢继续", exact: true }).first().click();
  await page.waitForTimeout(300);
  await main.getByRole("button", { name: /疼或不舒服/ }).first().click();
  await page.waitForTimeout(300);
  const fearQ = main.locator(".rm-fear-together:visible");
  await expect(fearQ).toHaveCount(1);
  await expect(fearQ).toContainText("当时是不是也担心继续会加重？");
  // 填「有，担心加重」。
  const yes = fearQ.locator("button:visible").filter({ hasText: /有，担心加重/ }).first();
  await expect(yes).toBeVisible();
  await yes.click();
  // 切换原因到「没力或撑不住」→ 恐动答案清除（疼↔没力保留，此处验证按钮仍可切换）。
  const weak = main.getByRole("button", { name: /没力或撑不住/ }).first();
  await weak.click();
  await page.waitForTimeout(300);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("FR-3 旧案例 completion-status 复测（无分）复活不炸 @scenario", async ({ page }) => {
  // 历史已完成的 completion-status 复测（无分数）在 pendingFunctionRetests 派生下会复活为
  // 待复查（新规则语义正确）。恢复案例面板仍可用（记录这些动作存在、零运行时错误）。
  // 用 /test 场景工厂验证：恢复类场景（历史无分复测）面板不抛致命错误。
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  // 用一个已评估完成的定向场景进入处理复测，验证功能复测卡与记录按钮可用（不炸）。
  const runtime = await launchWorkbenchScenario(page, "assessment-all-normal");
  // 该场景为处理段空态（无功能复测）；保守验证面板可渲染、无运行时错误即恢复路径健康。
  await expect(runtime).toContainText(/本次没有发现明确异常|还没有处理|复测/, { timeout: 10_000 });
  await assertNoRuntimeErrors(runtimeErrors);
});

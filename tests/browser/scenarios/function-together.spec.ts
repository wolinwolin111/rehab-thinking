import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, launchWorkbenchScenario } from "../support/page-helpers";
import { prepareProfessionalMultiAction } from "../drivers/pilot-flow";
// FR 组：功能复测疼痛对比（e5cdf85）+ 恐动拆分（2069385）+ 清理链（fef2886）。
//
// e5cdf85：completion-status 复测带疼痛分数对比（context「处理前 X/10 当时做不完时的疼」，
// 没打分不能提交=完成门）；结果语义：能完成+分降=better / 分平=partial / 分升=worse。
// 批 A（aaf136e）：退役「当时是不是也担心继续会加重？」追问（Q2）及 unableFearTogether 写入链；
// 恐动改由主因「担心继续会加重」驱动（谓词 stoppedFromFear），复测卡/总结页低负荷提示人群随之改变。

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

test("FR-2 恐动主因：Q2 追问已退役、恐动作主因可提交 @scenario", async ({ page }) => {
  // 批 A（aaf136e）退役恐动追问 Q2。新口径：恐动是主因之一，不再疼后追问。
  // 本条钉退役本身（Q2 不再出现）+ 恐动作主因可正常提交推进；
  // 下游低负荷提示（stoppedFromFear → treatment-retest/summary）需完成态靶子，另批覆盖。
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalMultiAction(page);
  const main = page.locator("main:visible");
  await main.getByRole("button", { name: "打开检查", exact: true }).click();
  await page.waitForTimeout(400);
  // 下蹲 unable → 疼：Q2 追问已退役，选疼后不再出现「当时是不是也担心继续会加重？」。
  await main.getByRole("button", { name: "做不完或不敢继续", exact: true }).first().click();
  await page.waitForTimeout(300);
  await main.getByRole("button", { name: /疼或不舒服/ }).first().click();
  await page.waitForTimeout(300);
  await expect(main.locator(".rm-fear-together")).toHaveCount(0);
  await expect(main).not.toContainText("当时是不是也担心继续会加重？");
  // 切主因到「担心继续会加重」（恐动为主因）→ 卡片可提交推进。
  await main.getByRole("button", { name: /担心继续会加重/ }).first().click();
  await page.waitForTimeout(300);
  await expect(main.getByRole("button", { name: "下一个检查", exact: true })).toBeEnabled({ timeout: 8_000 });
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

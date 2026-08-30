import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, expectUniqueVisible } from "../support/page-helpers";
import { completeProfessionalAssessmentWithPassive, prepareProfessionalOther } from "../drivers/pilot-flow";

// B 组：膝伸直方向被动+主动证据闭环（开发侧交接第三部分 B-1/B-2）。
// B-1：主动/被动都受限 → 活动范围路径处理 → 复查仅膝伸直方向；处理卡带复查方向（合同单元文案）。
// B-2：被动恢复+主动不足 → 末端伸膝控制路径；该路径依赖被动能力，普通模式不出现。

test("B-1 主动被动都受限：伸直方向进入处理，复查仅伸直 @scenario", async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalOther(page, {
    description: "右膝内侧疼，有三个月了",
    capabilities: ["被动活动度", "抗阻力量"],
  });
  await completeProfessionalAssessmentWithPassive(page, { flexion: "normal" });

  const main = page.locator("main:visible");
  await expect(main).toContainText("针对性处理", { timeout: 10_000 });
  // 完成第一项处理后进入复测：范围复测清单只含伸直方向，不含屈曲。
  await main.getByRole("button", { name: /处理完成，复测/ }).first().click();
  const retestPanel = main.locator(".rm-followup-range-check, .rm-batch-range-retest, .rm-range-retest").first();
  await expect(retestPanel).toBeVisible({ timeout: 10_000 });
  const retestText = (await retestPanel.textContent()) ?? "";
  expect(retestText).toMatch(/伸直/);
  expect(retestText).not.toContain("屈曲");
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("B-2 被动恢复主动不足：复测后转入末端伸膝控制路径 @scenario", async ({ page }) => {
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await prepareProfessionalOther(page, {
    description: "右膝内侧疼，有三个月了",
    capabilities: ["被动活动度", "抗阻力量", "关节处理"],
  });
  await completeProfessionalAssessmentWithPassive(page, { flexion: "normal" });

  const main = page.locator("main:visible");
  // 第一项处理完成后进入批量/单项复测，主动仍偏小、被动已接近 → 控制路径。
  const finish = main.getByRole("button", { name: /处理完成，复测/ }).first();
  await expect(finish).toBeVisible();
  await finish.click();

  // 主动/被动复测选项（仅专业+被动能力提供）：选「控制仍不足｜被动接近…，主动仍偏小」。
  const controlAnswer = main.getByRole("button", { name: /控制仍不足.*被动接近.*主动仍偏小/ }).first();
  await expect(controlAnswer).toBeVisible({ timeout: 10_000 });
  await controlAnswer.click();
  const noDiscomfort = main.getByRole("button", { name: "没有不适", exact: true }).first();
  if (await noDiscomfort.count()) await noDiscomfort.click();
  const continueButton = main.getByRole("button", { name: "继续", exact: true }).first();
  if (await continueButton.count() && await continueButton.isEnabled()) await continueButton.click();

  // 计划刷新：伸直问题的复查义务保留在台账（控制复查），提供进入训练入口。
  await expect(main).toContainText(/重新确认剩余问题|进入训练/, { timeout: 15_000 });
  // 控制路径落地：过渡页/完成面板 → 训练页出现末端伸膝主动控制类练习。
  const trainEntry = main.getByRole("button", { name: /开始训练|进入训练/ }).first();
  await expect(trainEntry).toBeVisible({ timeout: 10_000 });
  await trainEntry.click();
  const trainEntry2 = main.getByRole("button", { name: /开始训练|进入训练/ }).first();
  if (await trainEntry2.count()) await trainEntry2.click();
  await expect(main).toContainText(/末端伸膝|终末伸膝|膝后下压/, { timeout: 15_000 });
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

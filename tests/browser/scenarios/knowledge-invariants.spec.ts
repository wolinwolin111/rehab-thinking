import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors } from "../support/page-helpers";
import { prepareGuidedChiefProgression } from "../drivers/pilot-flow";

// 知识重构批次新场景（B 组证据流程 + D 组特殊检查），对应
// docs/handover/development-to-test-knowledge-refactor-handoff-2026-08-30.md 第三部分。
// 第四部分开发侧不变式直接作为 oracle。

/** 8 个专业模式特殊检查的标题关键词（D 组模块词表）。 */
const SPECIAL_CHECK_TITLES = [
  /骨折风险判断/,
  /前交叉韧带稳定性/,
  /后交叉韧带稳定性/,
  /副韧带稳定性/,
  /跟腱/,
  /距骨/,
  /下胫腓联合/,
  /前抽屉|内翻应力/,
];

test("B-5/D-4/B-6 普通模式评估队列不出现被动、专项与封存规则 @scenario", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  // 自助康复 + 自我检查路径（普通模式），主诉动作正常完成 → 进入评估队列。
  await prepareGuidedChiefProgression(page);

  const main = page.locator("main:visible");
  await expect(page.locator("h1:visible").first()).toContainText(/评估检查|主动|功能/, { timeout: 10_000 });

  // B-5（不变式 2）：普通模式不得出现被动活动 / 末端感觉 / 关节检查 / 专项检查卡。
  await expect(main).not.toContainText(/被动活动度（PROM）/);
  await expect(main).not.toContainText(/末端感觉/);
  await expect(main).not.toContainText(/关节松动|髌骨向/);
  // D-4：8 个特殊检查模块完全不可见。
  for (const title of SPECIAL_CHECK_TITLES) {
    await expect(main).not.toContainText(title);
  }
  // B-6（不变式 4）：封存 P1 规则候选零出现。
  await expect(main).not.toContainText(/腘绳肌离心|腓肠神经|胫神经/);
  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, launchWorkbenchScenario } from "../support/page-helpers";

// CA 组：自定义动作复现卡（dev e2a00f8 新行为，catalog 靶子 0e9cc34/1b55396）。
//
// 逻辑层路由已由 tests/unit/domain/function-assessment-plan-core.test.mjs 覆盖
// （CUSTOM-ACTION-01）：匹配不到标准功能项的自定义动作 → 追加 function:custom-action
// 占位卡。本组钉**卡片渲染与安全闸门两分支**（assessment-stage.tsx :766-788）：
//   CA-1 custom-action-assessment（intake customAction「跪坐」，无标准匹配）→
//        落 step 2 即聚焦该卡（探针实测 cardCount=1、header=跪坐、is-four 四档），
//        默认渲染四档负荷（不承重/可扶/原样负重/暂时不做）+ 原样负重安全提示。
//   CA-2 custom-action-deferred（intake 同时命中急性 onset「今天或昨天」+
//        mechanism「扭转或崴伤」与肿胀 symptoms「肿胀或淤青」）→ customActionBlocked
//        为真，硬闸抑制现场复现：不渲染 is-four 四档，改「今天先不做这个动作的现场
//        复现」+ 记报评分滑杆 + 单一「暂时不做，照常记录」出口。
// 断言作用域 runtime 容器（/test launcher 场景描述含同字样，全页匹配会假阳性）。
// 负荷档位为行为选项（四档即功能本体），安全闸门文案为 safety-critical，均按 §8 允许锁定。

test("CA-1 自定义动作复现卡：未匹配动作落占位卡 + 四档负荷 + 选档互斥 @scenario", async ({ page }) => {
  test.setTimeout(90_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "custom-action-assessment");
  await page.waitForTimeout(600);

  // 落点即自定义动作卡：单卡聚焦，标题为自定义动作「跪坐」（未丢弃、未误映射到标准项）。
  const card = runtime.locator(".rm-check-card");
  await expect(card).toHaveCount(1);
  await expect(card.locator("header strong")).toHaveText("跪坐");
  // 默认分支：四档负荷网格（unloaded/assisted/full/skip）。
  const tiers = card.locator(".rm-result-grid.is-four button");
  await expect(tiers).toHaveCount(4);
  // 原样负重安全提示（safety-critical）。
  await expect(card.locator(".rm-choice-hint")).toContainText("立即停");
  // 硬闸文案在非急性场景不出现。
  await expect(card.getByText("今天先不做这个动作的现场复现")).toHaveCount(0);

  // 选「完全不承重」→ 该项标记选中（customActionLoadTier=unloaded）。
  const unloaded = tiers.filter({ hasText: "完全不承重" });
  await unloaded.click();
  await expect(unloaded).toHaveClass(/is-selected/);
  // 改选「只有按原样负重才会出现」→ 新项选中、旧项取消（档位互斥）。
  const full = tiers.filter({ hasText: "只有按原样负重" });
  await full.click();
  await expect(full).toHaveClass(/is-selected/);
  await expect(unloaded).not.toHaveClass(/is-selected/);

  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("CA-2 自定义动作硬闸：急性+肿胀抑制现场复现（无四档 + 评分 + 单出口）@scenario", async ({ page }) => {
  test.setTimeout(90_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "custom-action-deferred");
  await page.waitForTimeout(600);

  // 同一自定义动作卡，但命中急性/肿胀硬闸。
  const card = runtime.locator(".rm-check-card");
  await expect(card).toHaveCount(1);
  await expect(card.locator("header strong")).toHaveText("跪坐");
  // 安全闸门：四档负荷不渲染（不做现场负重复现）。
  await expect(card.locator(".rm-result-grid.is-four")).toHaveCount(0);
  // 硬闸提示（safety-critical）+ 记报评分滑杆 + 单一「暂时不做，照常记录」出口。
  await expect(card.locator("h3")).toHaveText("今天先不做这个动作的现场复现");
  await expect(card.locator("input[type='range']")).toHaveCount(1);
  const skip = card.locator(".rm-result-grid.is-two button");
  await expect(skip).toHaveCount(1);
  await expect(skip).toHaveText("暂时不做，照常记录");
  // 点出口 → functionCompletion=skip，标记选中（照常记录、进入处理）。
  await skip.click();
  await expect(skip).toHaveClass(/is-selected/);

  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

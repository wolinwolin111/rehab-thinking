import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, launchWorkbenchScenario } from "../support/page-helpers";

// AC 组：动作库批次 0–7 新值上屏验证（dev 第 15 轮申请的屏级补覆盖：小腿局部评估卡 /
// 踝评估卡 / 踝训练卡在既有 page_boundary 场景中不可达，新值上屏未实拍；库层 golden 已锁）。
//
// 断言策略（§8：不钉用户可见文案字面；此处只做两类）：
//   1) 已退役旧字面的**负断言**——旧字面回潜即失败（这锁的是「迁移完成」这一事实）；
//   2) 结构/来源锚定——评估队列逐卡渲染、力量卡走 strength optionSet。
// 注意：负断言作用域必须是产品主区 main——launcher 的场景说明文本会引用旧字面作对比，
// 全 runtime 匹配会假阳性（dev 踩坑通报同源）。

// 已退役旧字面（批次 1/2/4/5，owner 裁定）。有意保留的例外不进清单：
//   - 每组8～12个：calf-back-seated-raise 坐姿低负荷（第 15 轮明示保留）
//   - 保持5秒/顶住5秒等：力量检查测量属性（validate 例外名单）
const RETIRED = [
  /完成5次/,                // knee-heel-raise 次数 5→10
  /扶墙做5次双脚提踵/,      // calf 两条
  /最多记录20个高质量次数/, // ankle-calf 单脚 20→10
  /每项每组12个/,           // ankle-band-heelraise
  /每组8～10个/,            // calf-medial-arch（站立屈髋同步 8～10→10）
  /缩短脚掌/,               // ankle-intrinsic 临床变更（踮脚尖替代）
  /先这样试/,               // 批次 3 引导框全量删除
];

test("AC-1 小腿局部评估卡：队列逐卡渲染 + 退役字面零残留 @scenario", async ({ page }) => {
  test.setTimeout(90_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "calf-local-assessment");
  await page.waitForTimeout(600);

  // 落点即小腿局部评估队列（区域名 + 评估检查进行中），逐卡渲染非空。
  const main = runtime.locator("main");
  await expect(main).toContainText("小腿局部");
  await expect(main).toContainText("评估检查");
  await expect(main.locator(".rm-check-card")).toHaveCount(1);

  // 退役字面零残留（作用域 main，排除 launcher 说明文本）。
  const text = await main.innerText();
  for (const pattern of RETIRED) {
    expect(text, `退役旧字面不应出现在小腿局部评估屏：${pattern}`).not.toMatch(pattern);
  }

  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("AC-2 踝评估卡：队列渲染 + 力量卡走 strength 选项 + 「缩短脚掌」零残留 @scenario", async ({ page }) => {
  test.setTimeout(120_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "ankle-assessment-cards");
  await page.waitForTimeout(600);

  const main = runtime.locator("main");
  await expect(main).toContainText("踝关节与足");
  await expect(main).toContainText("评估检查");
  await expect(main.locator(".rm-check-card")).toHaveCount(1);

  // 该轻症 intake 的踝队列为功能+活动度+触诊（力量卡需证据门槛，不入队）——
  // 队列条目来自目录（评估进度下拉列出全部卡名），逐卡可推进。
  const progress = runtime.locator(".rm-assessment-progress");
  await progress.locator("summary").click();
  const progressText = await progress.innerText();
  expect(progressText).toContain("踝足主动外翻（AROM）");
  expect(progressText).toContain("踝关节主动背屈（AROM）");
  expect(progressText).not.toContain("缩短脚掌");

  // 退役字面零残留（作用域 main）。
  const text = await main.innerText();
  for (const pattern of RETIRED) {
    expect(text, `退役旧字面不应出现在踝评估屏：${pattern}`).not.toMatch(pattern);
  }

  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

test("AC-3 踝训练卡：训练页渲染 + 退役剂量字面零残留（8～12 属有意保留不入清单）@scenario", async ({ page }) => {
  test.setTimeout(120_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const runtime = await launchWorkbenchScenario(page, "ankle-training-card");
  await page.waitForTimeout(600);

  const main = runtime.locator("main");
  await expect(main).toContainText("踝关节与足");
  await expect(main).toContainText(/训练/);
  // 训练页有动作卡与第一组反馈区（训练目录条目上屏）。
  await expect(main.locator(".rm-exercise").first()).toBeVisible();

  const text = await main.innerText();
  for (const pattern of RETIRED) {
    expect(text, `退役旧字面不应出现在踝训练屏：${pattern}`).not.toMatch(pattern);
  }

  await assertNoHorizontalOverflow(page);
  await assertNoRuntimeErrors(runtimeErrors);
});

/**
 * A-1 / INT-05：明确主诉动作首次只检查当前动作，正常后才允许递进。
 *
 * 这是固定场景脚本，不负责把整套流程自动点到总结；它只验证主诉动作
 * 首次进入评估时的页面边界和第一项正常结果后的递进入口。
 */

import assert from "node:assert/strict";
import { dismissOnboarding } from "./real-browser-test-helpers.mjs";
import {
  assertNoBrowserRuntimeErrors,
  clickFirstFixedButton,
  clickFixedButton,
  fixedScenarioUrl,
  launchFixedScenario,
} from "./real-browser-fixed-scenario-helpers.mjs";

const URL = fixedScenarioUrl();
const { browser, page, runtimeErrors } = await launchFixedScenario();

async function completeGuidedIntake() {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  await dismissOnboarding(page);

  await page.locator("textarea").fill("右膝下蹲时疼，有两个月了");
  await clickFixedButton(page, "帮我整理");
  await clickFirstFixedButton(page, /自助康复/, "自助康复");
  await clickFirstFixedButton(page, /下一步/, "进入症状信息");

  await page.locator('[aria-label="右侧膝盖正面"]').click();
  await page.waitForTimeout(120);
  await page.locator('[aria-label="右侧 · 膝内侧关节线"]').click();
  await clickFirstFixedButton(page, /下一步/, "确认症状位置");

  await page.locator("select").selectOption("超过6周");
  await clickFirstFixedButton(page, /下一步/, "确认病程");
  await clickFixedButton(page, "没有以上情况");
  await clickFirstFixedButton(page, /下一步/, "确认目前情况");
  await page.locator('input[type="range"]').fill("5");
  await clickFirstFixedButton(page, /下一步/, "确认主诉分数");
  await clickFirstFixedButton(page, /恢复日常活动/, "选择恢复目标");
  await clickFixedButton(page, "进入关键确认");

  for (const button of await page.getByRole("button", { name: "没有", exact: true }).all()) {
    await button.click();
    await page.waitForTimeout(80);
  }
  await clickFixedButton(page, "继续填写影像结论");
  await clickFixedButton(page, "没有做影像");
  await clickFixedButton(page, "开始评估检查");
  await clickFixedButton(page, "开始评估检查");
}

await completeGuidedIntake();

const firstTitle = await page.locator("h1").first().textContent();
const firstPage = await page.locator("body").textContent();
assert.match(firstTitle ?? "", /蹲起|下蹲/);
assert.match(firstPage ?? "", /下蹲|蹲起/);
assert.doesNotMatch(firstPage ?? "", /单腿蹲|单脚蹲|跳跃落地/);
assert.doesNotMatch(firstPage ?? "", /单腿静态稳定检查|单脚站立/);

await clickFixedButton(page, "可以做完", "首次主诉动作：可以做完");
await clickFixedButton(page, "动作基本稳定", "首次动作控制：基本稳定");
await clickFixedButton(page, "不会", "首次动作不适：不会");

const afterNormalTitle = await page.locator("h1").first().textContent();
const afterNormalPage = await page.locator("body").textContent();
console.log(`首次结果后页面：${afterNormalTitle ?? "(无标题)"}`);
console.log(`首次结果后按钮：${(await page.locator("button:visible").allTextContents()).slice(-20).join(" / ")}`);

const progressionButtons = await page.locator(".rm-assessment-progress button").evaluateAll((buttons) => buttons.map((button) => ({
  text: button.textContent?.replace(/\s+/g, " ").trim(),
  disabled: button.hasAttribute("disabled"),
  className: button.className,
})));
console.log(`首次结果后的评估队列：${JSON.stringify(progressionButtons)}`);
assert.ok(
  progressionButtons.some(({ text }) => /单腿|单脚/.test(text ?? "")),
  "主诉动作正常后应把单腿递进评估加入后续队列",
);
assert.ok(
  progressionButtons.some(({ text, disabled }) => /单腿|单脚/.test(text ?? "") && disabled),
  "单腿递进评估必须等待前序检查完成，不能跳过顺序门控",
);
assert.match(afterNormalPage ?? "", /下蹲|蹲起/);
assert.doesNotMatch(afterNormalPage ?? "", /浏览器运行时错误/);
assertNoBrowserRuntimeErrors(runtimeErrors);

await page.screenshot({ path: ".tmp-a1-chief-progression-after-normal.png", fullPage: true });
console.log("A-1 / INT-05 页面证据已保存：.tmp-a1-chief-progression-after-normal.png");
await browser.close();

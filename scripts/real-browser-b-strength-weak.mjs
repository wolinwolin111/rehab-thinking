/**
 * B-3 / ASS-04：活动度接近健侧但力量或控制偏弱时，进入训练方向。
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

const { browser, page, runtimeErrors } = await launchFixedScenario();

await page.goto(fixedScenarioUrl(), { waitUntil: "networkidle", timeout: 30000 });
await dismissOnboarding(page);
await page.locator("textarea").fill("右膝下蹲时疼，有三个月了");
await clickFixedButton(page, "帮我整理");
await clickFirstFixedButton(page, /自助康复/, "自助康复");
await clickFirstFixedButton(page, /下一步/, "进入症状信息");
await page.locator('[aria-label="右侧膝盖正面"]').click();
await page.waitForTimeout(120);
await page.locator('[aria-label="右侧 · 膝内侧关节线"]').click();
await clickFirstFixedButton(page, /下一步/, "确认症状位置");
await page.locator("select").first().selectOption("超过6周");
await clickFirstFixedButton(page, /下一步/, "确认病程");
await clickFixedButton(page, "没有以上情况");
await clickFirstFixedButton(page, /下一步/, "确认目前情况");
const baseline = page.locator('input[type="range"]').first();
if (await baseline.count()) await baseline.fill("4");
await clickFirstFixedButton(page, /下一步/, "确认主诉分数");
await clickFirstFixedButton(page, /恢复日常活动/, "选择恢复目标");
await clickFixedButton(page, "进入关键确认");
for (const button of await page.getByRole("button", { name: "没有", exact: true }).all()) {
  if (!((await button.getAttribute("class")) || "").includes("is-selected")) await button.click();
}
await clickFixedButton(page, "继续填写影像结论");
await clickFixedButton(page, "没有做影像");
await clickFixedButton(page, "开始评估检查");
await clickFixedButton(page, "开始评估检查");

let firstFunctionDone = false;
let weakRecorded = false;
let evaluationResultBody = "";
for (let index = 0; index < 100; index += 1) {
  const title = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  if (title.includes("评估结果") || title.includes("先看清问题")) {
    evaluationResultBody = ((await page.locator("main").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
    break;
  }

  const functionComplete = page.getByRole("button", { name: "可以做完", exact: true }).first();
  const functionChoice = firstFunctionDone
    ? page.getByRole("button", { name: "暂时不做", exact: true }).first()
    : functionComplete;
  if (await functionChoice.count() && !((await functionChoice.getAttribute("class")) || "").includes("is-selected")) {
    await functionChoice.click();
    await page.waitForTimeout(120);
    if (!firstFunctionDone) firstFunctionDone = true;
    continue;
  }
  const stable = page.getByRole("button", { name: "动作基本稳定", exact: true }).first();
  if (await stable.count() && !((await stable.getAttribute("class")) || "").includes("is-selected")) {
    await stable.click();
    await page.waitForTimeout(120);
    continue;
  }
  const noDiscomfort = page.getByRole("button", { name: "不会", exact: true }).first();
  if (await noDiscomfort.count() && !((await noDiscomfort.getAttribute("class")) || "").includes("is-selected")) {
    await noDiscomfort.click();
    await page.waitForTimeout(120);
    continue;
  }

  const activeSame = page.getByRole("button", { name: /接近健侧/ }).first();
  if (await activeSame.count() && !((await activeSame.getAttribute("class")) || "").includes("is-selected")) {
    await activeSame.click();
    await page.waitForTimeout(120);
    continue;
  }
  const weak = page.getByRole("button", { name: /控制偏弱|患侧偏弱/ }).first();
  if (await weak.count() && !((await weak.getAttribute("class")) || "").includes("is-selected")) {
    await weak.click();
    await page.waitForTimeout(120);
    weakRecorded = true;
    continue;
  }
  const noPain = page.getByRole("button", { name: "没有不适", exact: true }).first();
  if (await noPain.count() && !((await noPain.getAttribute("class")) || "").includes("is-selected")) {
    await noPain.click();
    await page.waitForTimeout(120);
    continue;
  }
  const specialNormal = page.locator("button:visible").filter({ hasText: "未见异常反应" }).first();
  if (await specialNormal.count() && !((await specialNormal.getAttribute("class")) || "").includes("is-selected")) {
    await specialNormal.click();
    await page.waitForTimeout(120);
    continue;
  }
  const noDifference = page.locator("button:visible").filter({ hasText: "没有明显差别" }).first();
  if (await noDifference.count() && !((await noDifference.getAttribute("class")) || "").includes("is-selected")) {
    await noDifference.click();
    await page.waitForTimeout(120);
    continue;
  }
  const next = page.getByRole("button", { name: /下一个检查|查看评估结果|评估完成，继续|检查相关肌肉/ }).first();
  if (await next.count() && !await next.isDisabled().catch(() => true)) {
    await next.click();
    await page.waitForTimeout(220);
    continue;
  }
  const visible = (await page.locator("button:visible").allTextContents()).map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean).slice(-24);
  throw new Error(`力量偏弱场景无法继续：${title}；按钮=${visible.join(" / ")}`);
}

const finalTitle = await page.locator("h1").first().textContent();
const resultText = evaluationResultBody || ((await page.locator("main").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
console.log(`评估终点：${finalTitle ?? "(无)"}`);
assert.equal(firstFunctionDone, true, "应实际完成主诉功能动作，避免只验证未知分支");
assert.equal(weakRecorded, true, "应实际记录一项控制或力量偏弱");
assert.match(resultText, /力量偏弱|控制偏弱|保持能力不足/);
assert.doesNotMatch(resultText, /关节处理|肌肉处理/);
assertNoBrowserRuntimeErrors(runtimeErrors);
await page.screenshot({ path: ".tmp-b-strength-weak.png", fullPage: true });
await browser.close();

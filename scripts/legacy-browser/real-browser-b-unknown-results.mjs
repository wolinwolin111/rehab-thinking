/**
 * B-2 / ASS-05：全部关键检查未知时，不得当成正常或直接生成处理。
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
await page.locator("textarea").fill("右膝内侧不舒服，有三个月了");
await clickFixedButton(page, "帮我整理");
await clickFirstFixedButton(page, /康复思路模式/, "康复思路模式");
await clickFirstFixedButton(page, /下一步/, "进入专业工作台");
await clickFirstFixedButton(page, /自我检查|给自己检查/, "给自己检查");
await page.locator('[aria-label="右侧膝盖正面"]').click();
await page.waitForTimeout(120);
await page.locator('[aria-label="右侧 · 膝内侧关节线"]').click();
await page.waitForTimeout(160);

const selects = page.locator("select");
for (let index = 0; index < await selects.count(); index += 1) {
  const select = selects.nth(index);
  if (!(await select.inputValue())) await select.selectOption(index === 0 ? "超过6周" : { index: 1 });
}
await page.getByRole("button", { name: "疼痛，性质说不清", exact: true }).click();
await page.getByRole("button", { name: "没有以上情况", exact: true }).click();
await page.getByRole("button", { name: "活动到某个角度", exact: true }).click();
await page.getByRole("button", { name: "说不清或没有固定动作", exact: true }).click();
await page.getByRole("button", { name: /恢复正常生活/ }).click();
const visibleMainText = ((await page.locator("main").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
const visibleButtons = (await page.locator("button:visible").allTextContents()).map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean);
console.log(`关键确认前：${visibleMainText.slice(-1800)}`);
console.log(`可见按钮：${visibleButtons.slice(-30).join(" / ")}`);
await clickFixedButton(page, "进入关键确认", "进入关键确认");
for (const button of await page.getByRole("button", { name: "没有", exact: true }).all()) {
  if (!((await button.getAttribute("class")) || "").includes("is-selected")) await button.click();
}
await clickFixedButton(page, "继续填写影像结论");
await clickFixedButton(page, "没有做影像");
await clickFixedButton(page, "开始评估检查");
await clickFixedButton(page, "开始评估检查");
await clickFirstFixedButton(page, /打开检查/, "打开第一个检查");

let previousTitle = "";
for (let index = 0; index < 120; index += 1) {
  const title = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  if (title !== previousTitle) {
    previousTitle = title;
    console.log(`[${index}] 页面：${title}`);
  }
  if (title.includes("先看清问题") || title.includes("本阶段成果") || title.includes("评估检查完成")) break;

  const unknown = page.locator(".rm-result-grid:visible button").filter({ hasText: "暂不判断" }).first();
  if (await unknown.count() && !((await unknown.getAttribute("class")) || "").includes("is-selected")) {
    await unknown.click();
    await page.waitForTimeout(140);
    continue;
  }
  const skip = page.locator(".rm-result-grid:visible button").filter({ hasText: "暂不检查" }).first();
  if (await skip.count() && !((await skip.getAttribute("class")) || "").includes("is-selected")) {
    await skip.click();
    await page.waitForTimeout(140);
    continue;
  }
  const noDiscomfort = page.getByRole("button", { name: "没有不适", exact: true }).first();
  if (await noDiscomfort.count() && !((await noDiscomfort.getAttribute("class")) || "").includes("is-selected")) {
    await noDiscomfort.click();
    await page.waitForTimeout(140);
    continue;
  }
  const noDifference = page.locator("button:visible").filter({ hasText: "没有明显差别" }).first();
  if (title.includes("肌肉紧张度对比") && await noDifference.count() && !((await noDifference.getAttribute("class")) || "").includes("is-selected")) {
    await noDifference.click();
    await page.waitForTimeout(140);
    continue;
  }
  const next = page.locator("button:visible").filter({ hasText: /下一个检查|检查相关肌肉|查看评估结果|评估完成，继续/ }).first();
  if (await next.count() && !await next.isDisabled().catch(() => true)) {
    await next.click();
    await page.waitForTimeout(240);
    continue;
  }
  throw new Error(`未知结果场景无法继续：${title}`);
}

const finalTitle = await page.locator("h1").first().textContent();
const finalBody = ((await page.locator("main").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
console.log(`终点：${finalTitle ?? "(无)"}`);
assert.match(finalTitle ?? "", /先看清问题，再开始处理/);
assert.match(finalBody, /暂时没判断清楚/);
assert.match(finalBody, /当前没有明确异常需要即时处理/);
assert.doesNotMatch(finalBody, /针对性处理本次|处理部位.*肌群/);
assertNoBrowserRuntimeErrors(runtimeErrors);
await page.screenshot({ path: ".tmp-b-unknown-results.png", fullPage: true });
await browser.close();

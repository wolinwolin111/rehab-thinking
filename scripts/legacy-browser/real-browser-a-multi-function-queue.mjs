/**
 * A-4 / INT-07：多个功能主诉动作分别进入评估队列，不合并成一个动作。
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
await page.locator("textarea").fill("右膝内侧疼，有三个月了");
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
await page.getByRole("button", { name: "走路、站立或负重", exact: true }).click();
await page.locator(".rm-action-picker-grid button").filter({ hasText: "下蹲或起身" }).click();
await page.locator(".rm-action-picker-grid button").filter({ hasText: "上下楼或下台阶" }).click();
await page.getByRole("button", { name: /恢复正常生活/ }).click();

await clickFixedButton(page, "进入关键确认", "进入关键确认");
for (const button of await page.getByRole("button", { name: "没有", exact: true }).all()) {
  if (!((await button.getAttribute("class")) || "").includes("is-selected")) await button.click();
}
await clickFixedButton(page, "继续填写影像结论");
await clickFixedButton(page, "没有做影像");
await clickFixedButton(page, "开始评估检查");
await clickFixedButton(page, "开始评估检查");

const title = await page.locator("h1").first().textContent();
const body = (await page.locator("body").textContent()).replace(/\s+/g, " ");
const queue = (await page.locator("button").allTextContents()).map((text) => text.replace(/\s+/g, " ").trim());
console.log(`评估页：${title ?? "(无)"}`);
console.log(`功能评估队列：${queue.filter((text) => /台阶下降|闭链下蹲/.test(text)).join(" / ")}`);
console.log(`诱发动作摘要：${body.match(/当前诱发动作[^返回]{0,80}/)?.[0] ?? "(未找到)"}`);

assert.match(title ?? "", /按阶段查看这次康复/);
assert.ok(queue.some((text) => /台阶下降控制检查/.test(text)), "应保留上下楼/下台阶功能检查");
assert.ok(queue.some((text) => /双腿闭链下蹲功能检查/.test(text)), "应保留下蹲功能检查");
assert.match(body, /下蹲或起身、上下楼或下台阶/);
assert.doesNotMatch(body, /多个动作合并成一个主诉分数/);
assertNoBrowserRuntimeErrors(runtimeErrors);

await page.screenshot({ path: ".tmp-a-multi-function-queue.png", fullPage: true });
await browser.close();

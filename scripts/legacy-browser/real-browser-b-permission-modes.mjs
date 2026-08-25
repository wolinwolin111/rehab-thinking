/**
 * B-1 / INT-06：模式、操作对象和检查能力共同决定可见检查。
 */

import assert from "node:assert/strict";
import { dismissOnboarding } from "./real-browser-test-helpers.mjs";
import {
  assertNoBrowserRuntimeErrors,
  clickFirstFixedButton,
  fixedScenarioUrl,
  launchFixedScenario,
} from "./real-browser-fixed-scenario-helpers.mjs";

const { browser, page, runtimeErrors } = await launchFixedScenario();
const description = "右膝下楼时疼，有三个月了";

async function openMode(mode, target) {
  await page.goto(fixedScenarioUrl(), { waitUntil: "networkidle", timeout: 30000 });
  await dismissOnboarding(page);
  await page.locator("textarea").fill(description);
  await page.getByRole("button", { name: "帮我整理", exact: true }).click();
  await page.waitForTimeout(180);
  await page.getByRole("button", { name: new RegExp(mode), exact: false }).first().click();
  await page.waitForTimeout(180);
  await clickFirstFixedButton(page, /下一步/, `${mode}进入下一题`);
  if (target) {
    await page.getByRole("button", { name: new RegExp(target), exact: false }).first().click();
    await page.waitForTimeout(180);
  }
}

await openMode("自助康复");
let body = ((await page.locator("main").textContent()) ?? "").replace(/\s+/g, " ");
assert.doesNotMatch(body, /给自己检查|给别人检查|被动活动度|抗阻力量|基础触诊|关节处理/);
console.log("自助康复：未出现专业操作对象和能力字段");

await openMode("康复思路模式", "自我检查");
body = ((await page.locator("main").textContent()) ?? "").replace(/\s+/g, " ");
assert.match(body, /自我检查/);
assert.doesNotMatch(body, /可执行的检查能力|被动活动度|抗阻力量|基础触诊|关节处理/);
console.log("康复思路模式·给自己：只保留主动检查，不显示专业能力选择");

await openMode("康复思路模式", "协助他人检查");
body = ((await page.locator("main").textContent()) ?? "").replace(/\s+/g, " ");
assert.match(body, /被动活动度|抗阻力量|基础触诊/);
const joint = page.getByRole("button", { name: "关节处理", exact: true });
assert.equal(await joint.count(), 1);
assert.equal(await joint.isDisabled(), true, "未声明被动活动度时，关节处理应保持关闭");
const passive = page.getByRole("button", { name: "被动活动度", exact: true });
await passive.click();
await page.waitForTimeout(120);
assert.equal(await joint.isDisabled(), false, "声明被动活动度后，关节处理能力才可选择");
console.log("康复思路模式·给别人：专业能力可见，关节处理受被动活动度门控");

assertNoBrowserRuntimeErrors(runtimeErrors);
console.log("浏览器运行时错误数: 0");
await browser.close();

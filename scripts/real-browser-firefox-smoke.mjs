/**
 * UX-04：Firefox 真实浏览器冒烟，不复制完整临床长路径。
 */

import assert from "node:assert/strict";
import { firefox } from "playwright-core";
import { dismissOnboarding, pilotScenarioUrl } from "./real-browser-test-helpers.mjs";

const URL = pilotScenarioUrl();
const browser = await firefox.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error" && !/status of (401|403)\b/.test(message.text())) runtimeErrors.push(`console:${message.text()}`);
});

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await dismissOnboarding(page);
assert.ok(await page.locator('[data-rehabmind-tutorial="symptom-input"]').count(), "Firefox 应显示首页主诉入口");
await page.locator("textarea").fill("右膝下楼时内侧不舒服");
await page.getByRole("button", { name: "帮我整理" }).click();
await page.waitForTimeout(350);
await page.getByRole("button", { name: /自助康复/ }).click();
await page.waitForTimeout(250);
assert.match(await page.locator("h1").first().textContent(), /确认你的症状信息/);
assert.equal(runtimeErrors.length, 0, `Firefox 冒烟出现运行时错误：${runtimeErrors.join(" | ")}`);
console.log("UX-04：Firefox 首页加载、主诉输入、自助入口和第一步页面通过");
console.log("浏览器运行时错误数:", runtimeErrors.length);
await browser.close();

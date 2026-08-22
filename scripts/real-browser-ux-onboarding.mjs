/**
 * UX-01：聚焦式教程的首次打开、逐步完成、跳过和重新打开。
 */

import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const URL = process.env.WALKTHROUGH_URL ?? "http://localhost:3000/";
const browser = await chromium.launch({
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : { channel: process.env.BROWSER_CHANNEL ?? "msedge" }),
  headless: true,
});
const runtimeErrors = [];

function watch(page) {
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error}`));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`console:${message.text()}`);
  });
}

async function openFreshPage() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  watch(page);
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(300);
  return { context, page };
}

const { context, page } = await openFreshPage();
const dialog = page.locator('.rm-focus-onboarding[role="dialog"]');
await assert.doesNotReject(() => dialog.waitFor({ state: "visible", timeout: 5000 }));
assert.match(await dialog.textContent(), /1 \/ 5/);
assert.match(await dialog.textContent(), /工作台入口/);
assert.ok(await page.locator(".rm-focus-spotlight").count(), "首次教程应有聚焦高亮区域");

const expectedSteps = ["工作台入口", "症状输入框", "帮我整理", "康复流程", "康复记录"];
for (let index = 0; index < expectedSteps.length - 1; index += 1) {
  await dialog.getByRole("button", { name: "下一步", exact: true }).click();
  await page.waitForTimeout(120);
  assert.match(await dialog.textContent(), new RegExp(`${index + 2} \/ 5`));
  assert.match(await dialog.textContent(), new RegExp(expectedSteps[index + 1]));
}
assert.match(await dialog.textContent(), /不替代医生诊断/);
assert.match(await dialog.textContent(), /不使用 AI 代替用户或专业人员做康复决策/);
await dialog.getByRole("button", { name: "开始使用", exact: true }).click();
await page.waitForTimeout(180);
assert.equal(await dialog.count(), 0, "完成教程后对话框应关闭");
assert.ok(await page.locator('[data-rehabmind-tutorial="symptom-input"]').count(), "教程关闭后应回到真实首页");

await page.getByRole("button", { name: "使用教程", exact: true }).click();
await page.waitForTimeout(120);
assert.equal(await dialog.count(), 1, "首页入口应能重新打开教程");
assert.match(await dialog.textContent(), /1 \/ 5/);
assert.match(await dialog.textContent(), /工作台入口/);
await dialog.getByRole("button", { name: "跳过教程", exact: true }).click();
await page.waitForTimeout(120);
assert.equal(await dialog.count(), 0, "重新打开后跳过也应关闭教程");
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(300);
assert.equal(await dialog.count(), 0, "完成过教程后刷新不应再次自动弹出");
await context.close();

const skipped = await openFreshPage();
const skippedDialog = skipped.page.locator('.rm-focus-onboarding[role="dialog"]');
assert.equal(await skippedDialog.count(), 1, "新的浏览器上下文首次打开应自动弹出教程");
await skippedDialog.getByRole("button", { name: "跳过教程", exact: true }).click();
await skipped.page.waitForTimeout(120);
await skipped.page.reload({ waitUntil: "networkidle" });
await skipped.page.waitForTimeout(300);
assert.equal(await skippedDialog.count(), 0, "跳过教程后刷新不应再次自动弹出");
await skipped.page.getByRole("button", { name: "使用教程", exact: true }).click();
await skipped.page.waitForTimeout(120);
assert.equal(await skippedDialog.count(), 1, "跳过后仍可从首页入口手动打开教程");
await skippedDialog.getByRole("button", { name: "跳过教程", exact: true }).click();
await skipped.context.close();

assert.equal(runtimeErrors.length, 0, `教程浏览器场景出现运行时错误：${runtimeErrors.join(" | ")}`);
console.log(`UX-01：首次教程、逐步完成、重新打开和跳过均通过（${process.env.BROWSER_LABEL ?? process.env.BROWSER_CHANNEL ?? "msedge"}）`);
console.log("浏览器运行时错误数:", runtimeErrors.length);
await browser.close();

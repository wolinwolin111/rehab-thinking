// 阶段2 · §11 唯一页面最小冒烟（发布验收专用）。
// 用法：WALKTHROUGH_URL=https://host/RehabMind/ PILOT_INVITE_TOKEN=xxx node scripts/release-smoke.mjs
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { agreePilotConsent, dismissOnboarding, pilotScenarioUrl } from "./real-browser-test-helpers.mjs";

const URL = pilotScenarioUrl();
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error}`));
page.on("console", (msg) => { if (msg.type() === "error") runtimeErrors.push(`console:${msg.text()}`); });

let created;
page.on("response", async (response) => {
  if (response.url().endsWith("/api/pilot/cases") && response.status() === 201 && !created) {
    try { created = (await response.json()).case; } catch { /* ignore */ }
  }
});

console.log("1. 打开", URL);
await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await agreePilotConsent(page);
await dismissOnboarding(page);

console.log("2. 无邀请边界已在 API 层验证（403 invite_required）；此处持有效邀请进入");
await page.locator("textarea").fill("发布冒烟：右膝下楼内侧刺痛三天，想恢复正常走路。");
await page.getByRole("button", { name: "帮我整理" }).click();
await page.waitForTimeout(900);
await page.getByRole("button", { name: /自助康复/ }).click();
await page.waitForTimeout(400);
const next = page.getByRole("button", { name: /^下一步/ });
if (await next.count()) { await next.first().click(); await page.waitForTimeout(600); }

console.log("3. 点保存，等待服务器同步（案例编号出现）");
await page.getByRole("button", { name: "保存", exact: true }).click();
await page.locator(".rm-current-case-code").waitFor({ timeout: 20000 });
const caseCode = await page.locator(".rm-current-case-code").textContent();
assert.ok(created?.caseId, "应已创建服务端案例");
console.log("   案例编号:", caseCode.trim(), "| caseId:", created.caseId);

console.log("4. 刷新页面，经「康复记录 → 继续」恢复（产品设计路径）");
await page.reload({ waitUntil: "networkidle" });
await agreePilotConsent(page);
await dismissOnboarding(page);
await page.getByRole("button", { name: /康复记录/ }).first().click();
const continueButton = page.locator(".rm-record-continue").first();
await continueButton.waitFor({ timeout: 10000 });
await continueButton.click();
await page.waitForTimeout(1500);
// 关键不变量：不回到空白新案例；案例编号仍可见；无运行时错误。
const h1 = (await page.locator("h1").first().textContent())?.trim() ?? "";
console.log("   恢复落点 h1:", JSON.stringify(h1));
if (/^先说说哪里不舒服/.test(h1)) {
  throw new Error("刷新后回到了空白新案例（恢复失败）");
}
assert.ok(await page.locator(".rm-current-case-code").count(), "案例编号应仍可见");

console.log("5. 控制台运行时错误:", runtimeErrors.length ? runtimeErrors : "无");
assert.equal(runtimeErrors.length, 0, "不应有运行时错误");

if (created?.caseId && process.env.PILOT_PRESERVE_TEST_DATA !== "1") {
  console.log("6. 清理测试案例");
  const del = await page.evaluate(async ({ caseId, accessToken }) => {
    const r = await fetch(`/RehabMind/api/pilot/cases/${encodeURIComponent(caseId)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    return r.status;
  }, { caseId: created.caseId, accessToken: created.accessToken });
  console.log("   删除状态:", del);
}

await browser.close();
console.log("\n=== §11 最小冒烟：通过 ===");

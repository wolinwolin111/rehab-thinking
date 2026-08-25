/**
 * INV-01..07：新案例必须经过邀请门禁；同一粉丝群链接可复用，但不能升级案例或管理员权限。
 */

import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const URL = process.env.WALKTHROUGH_URL ?? "http://localhost:3000/";
const inviteToken = process.env.PILOT_INVITE_TOKEN?.trim();
const adminKey = process.env.PILOT_ADMIN_KEY?.trim();
if (!inviteToken) throw new Error("PILOT_INVITE_TOKEN is required");

const browser = await chromium.launch({ channel: "msedge", headless: true });
const runtimeErrors = [];
function attachRuntimeChecks(page) {
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !/status of (401|403)\b/.test(message.text())) {
      runtimeErrors.push(`console:${message.text()}`);
    }
  });
}

async function createCase(page, token) {
  return page.evaluate(async ({ token }) => {
    const accessToken = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const response = await fetch("/api/pilot/cases", {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { "x-pilot-invite-token": token } : {}) },
      body: JSON.stringify({ clientCreationId: globalThis.crypto.randomUUID(), accessToken, initialSnapshot: { step: 1 }, currentStage: "症状信息", isBilateral: false, hasSafetyStop: false }),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { token });
}

const blockedContext = await browser.newContext();
const blockedPage = await blockedContext.newPage();
attachRuntimeChecks(blockedPage);
await blockedPage.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
const blocked = await createCase(blockedPage, null);
assert.equal(blocked.status, 403, "没有邀请时不能创建案例");
assert.equal(blocked.body?.code, "invite_required");
const wrong = await createCase(blockedPage, "wrong-invite-for-browser-test");
assert.equal(wrong.status, 403, "错误邀请不能创建案例");

const invitedUrl = `${URL}${URL.includes("?") ? "&" : "?"}invite=${encodeURIComponent(inviteToken)}`;
const invitedContext = await browser.newContext();
const invitedPage = await invitedContext.newPage();
attachRuntimeChecks(invitedPage);
await invitedPage.goto(invitedUrl, { waitUntil: "networkidle", timeout: 30000 });
assert.equal(new globalThis.URL(invitedPage.url()).searchParams.has("invite"), false, "读取邀请后应清理地址栏中的邀请参数");
assert.equal(await invitedPage.evaluate(() => sessionStorage.getItem("rehabmind-pilot-invite")), inviteToken, "邀请链接应进入当前浏览器会话而不是保留在地址栏");
const first = await createCase(invitedPage, inviteToken);
assert.equal(first.status, 201, "有效邀请应允许创建案例");
assert.ok(first.body?.case?.publicCode, "创建结果应包含匿名案例编号");

const secondContext = await browser.newContext();
const secondPage = await secondContext.newPage();
attachRuntimeChecks(secondPage);
await secondPage.goto(invitedUrl, { waitUntil: "networkidle", timeout: 30000 });
const second = await createCase(secondPage, inviteToken);
assert.equal(second.status, 201, "同一粉丝群邀请链接应允许第二个用户创建案例");
assert.notEqual(first.body.case.caseId, second.body.case.caseId, "不同用户的案例不能共用案例 ID");
assert.notEqual(first.body.case.publicCode, second.body.case.publicCode, "不同用户的案例编号必须隔离");

const createdCase = first.body.case;
const accessOnly = await invitedPage.evaluate(async ({ caseId, accessToken }) => {
  const response = await fetch(`/api/pilot/cases/${encodeURIComponent(caseId)}`, { headers: { authorization: `Bearer ${accessToken}` } });
  return { status: response.status, body: await response.json() };
}, { caseId: createdCase.caseId, accessToken: createdCase.accessToken });
assert.equal(accessOnly.status, 200, "创建后的案例应可只凭案例访问凭据继续读取");
assert.equal(JSON.stringify(first.body).includes(inviteToken), false, "创建响应不能回显邀请令牌");

const adminWithoutKey = await invitedPage.evaluate(async (token) => {
  const response = await fetch("/api/pilot/admin/cases", { headers: { "x-pilot-invite-token": token } });
  return { status: response.status, body: await response.json().catch(() => null) };
}, inviteToken);
assert.equal(adminWithoutKey.status, adminKey ? 401 : 503, "邀请凭证不能替代管理员凭证");

assert.equal(runtimeErrors.length, 0, `邀请边界浏览器场景出现运行时错误：${runtimeErrors.join(" | ")}`);
console.log("INV-01..07：无邀请/错误邀请被拒绝，有效链接可复用，案例访问与管理员权限保持隔离");
console.log("浏览器运行时错误数:", runtimeErrors.length);
await blockedContext.close();
await invitedContext.close();
await secondContext.close();
await browser.close();

/**
 * DATA-09：错误响应和服务错误日志不能泄露邀请令牌、访问凭据或完整主诉。
 *
 * 浏览器层验证客户端可见响应；服务端错误记录只由类型、名称和消息组成，
 * 其日志形状由 tests/unit/infrastructure/pilot-api-redaction.test.mjs 固定。
 */

import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseURL = process.env.WALKTHROUGH_URL ?? "http://localhost:3000/";
const inviteToken = process.env.PILOT_INVITE_TOKEN?.trim();
if (!inviteToken) throw new Error("PILOT_INVITE_TOKEN is required");
const runId = Date.now().toString(36);

const pageURL = new globalThis.URL(baseURL);
pageURL.searchParams.set("invite", inviteToken);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error" && !/status of (401|403|409)\b/.test(message.text())) runtimeErrors.push(`console:${message.text()}`);
});
await page.goto(pageURL.toString(), { waitUntil: "networkidle", timeout: 30000 });

async function request(path, init = {}) {
  return page.evaluate(async ({ path, init }) => {
    const response = await fetch(path, init);
    return { status: response.status, body: await response.text() };
  }, { path, init });
}

const sensitiveInvite = "local-rehabmind-invite-sensitive";
const blocked = await request("/api/pilot/cases", {
  method: "POST",
  headers: { "content-type": "application/json", "x-pilot-invite-token": "wrong-secret-invite" },
  body: JSON.stringify({ initialSnapshot: { symptom: "完整主诉：右膝内侧疼" }, invite: sensitiveInvite }),
});
assert.equal(blocked.status, 403);
assert.doesNotMatch(blocked.body, /wrong-secret-invite|完整主诉|local-rehabmind-invite-sensitive/);

const created = await request("/api/pilot/cases", {
  method: "POST",
  headers: { "content-type": "application/json", "x-pilot-invite-token": inviteToken },
  body: JSON.stringify({ clientCreationId: globalThis.crypto.randomUUID(), accessToken: Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join(""), initialSnapshot: { step: 0, symptom: "完整主诉：右膝内侧疼" }, currentStage: "症状信息" }),
});
assert.equal(created.status, 201);
const access = JSON.parse(created.body).case;
assert.doesNotMatch(created.body, /完整主诉|local-rehabmind-invite-sensitive/);

const firstSave = await request(`/api/pilot/cases/${encodeURIComponent(access.caseId)}/progress`, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${access.accessToken}` },
  body: JSON.stringify({
    expectedRevision: access.revision,
    snapshot: { step: 1, intake: { description: "完整主诉：右膝内侧疼" }, updatedAt: new Date().toISOString() },
    eventType: "intake_saved",
    eventPayload: { description: "完整主诉：右膝内侧疼", privateToken: "payload-secret-should-not-echo" },
    eventId: `redaction-browser-save-${runId}-1`,
    currentStage: "症状信息",
  }),
});
assert.equal(firstSave.status, 200);

const conflict = await request(`/api/pilot/cases/${encodeURIComponent(access.caseId)}/progress`, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${access.accessToken}` },
  body: JSON.stringify({
    expectedRevision: access.revision,
    snapshot: { step: 2, intake: { description: "旧版本完整主诉" }, updatedAt: new Date().toISOString() },
    eventType: "intake_saved",
    eventPayload: { description: "旧版本完整主诉", privateToken: "conflict-secret-should-not-echo" },
    eventId: `redaction-browser-save-${runId}-2`,
    currentStage: "症状信息",
  }),
});
assert.equal(conflict.status, 409);
assert.doesNotMatch(conflict.body, /旧版本完整主诉|conflict-secret-should-not-echo|Bearer/);

const unauthorized = await request(`/api/pilot/cases/${encodeURIComponent(access.caseId)}`, {
  headers: { authorization: "Bearer wrong-access-secret" },
});
assert.equal(unauthorized.status, 401);
assert.doesNotMatch(unauthorized.body, /wrong-access-secret|完整主诉/);
assert.equal(runtimeErrors.length, 0, runtimeErrors.join(" | "));
console.log("DATA-09：邀请失败、保存冲突和访问拒绝响应均未泄露令牌、完整主诉或内部凭据；浏览器运行时错误数: 0");
await browser.close();

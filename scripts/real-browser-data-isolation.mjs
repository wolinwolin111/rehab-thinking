/**
 * DATA-02 / DATA-03：浏览器上下文中的案例隔离和 revision 冲突。
 *
 * 这条场景直接通过当前页面发起真实 API 请求，验证用户浏览器拿到的
 * 案例凭据、快照和事件边界；不把服务层单元测试当成页面数据证据。
 */

import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { deletePilotCase, dismissOnboarding } from "./real-browser-test-helpers.mjs";

const inviteToken = process.env.PILOT_INVITE_TOKEN?.trim();
if (!inviteToken) throw new Error("PILOT_INVITE_TOKEN is required for the data isolation scenario");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error}`));
page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(`console:${message.text()}`); });

const URL = process.env.WALKTHROUGH_URL ?? "http://localhost:3000/";
await page.goto(`${URL}${URL.includes("?") ? "&" : "?"}invite=${encodeURIComponent(inviteToken)}`, { waitUntil: "networkidle", timeout: 30000 });
await dismissOnboarding(page);

async function requestJson(path, init = {}) {
  return page.evaluate(async ({ path, init }) => {
    const response = await fetch(path, init);
    let body = null;
    try { body = await response.json(); } catch { /* keep non-JSON error bodies visible as null */ }
    return { status: response.status, body };
  }, { path, init });
}

const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const initialSnapshot = (label) => ({
  caseLabel: label,
  runId,
  step: 0,
  intake: { region: "knee", side: label === "A" ? "右侧" : "左侧", complaint: `${label} 的独立案例` },
});

async function createCase(label) {
  const creation = await page.evaluate(() => ({
    clientCreationId: globalThis.crypto.randomUUID(),
    accessToken: Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join(""),
  }));
  const result = await requestJson("/api/pilot/cases", {
    method: "POST",
    headers: { "content-type": "application/json", "x-pilot-invite-token": inviteToken },
    body: JSON.stringify({ ...creation, initialSnapshot: initialSnapshot(label), currentStage: "intake" }),
  });
  assert.equal(result.status, 201, `案例 ${label} 创建失败`);
  assert.ok(result.body?.case?.caseId);
  assert.ok(result.body?.case?.accessToken);
  return result.body.case;
}

async function saveProgress(access, { revision, eventId, label, stage }) {
  return requestJson(`/api/pilot/cases/${encodeURIComponent(access.caseId)}/progress`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${access.accessToken}` },
    body: JSON.stringify({
      expectedRevision: revision,
      snapshot: { ...initialSnapshot(label), step: revision + 1, currentStage: stage },
      eventId,
      eventType: "intake_saved",
      eventPayload: { runId, label, stage },
      currentStage: stage,
      isBilateral: false,
      hasSafetyStop: false,
      sessionCount: 1,
    }),
  });
}

async function readCase(access) {
  return requestJson(`/api/pilot/cases/${encodeURIComponent(access.caseId)}`, {
    headers: { authorization: `Bearer ${access.accessToken}` },
  });
}

const createdCases = [];
const caseA = await createCase("A");
const caseB = await createCase("B");
createdCases.push(caseA, caseB);
const eventA = `browser-data:${runId}:a`;
const eventB = `browser-data:${runId}:b`;

const savedA = await saveProgress(caseA, { revision: 0, eventId: eventA, label: "A", stage: "assessment" });
assert.equal(savedA.status, 200, `案例 A 首次保存失败：${JSON.stringify(savedA.body)}`);
assert.equal(savedA.body?.progress?.snapshot?.revision, 1);

const savedB = await saveProgress(caseB, { revision: 0, eventId: eventB, label: "B", stage: "treatment" });
assert.equal(savedB.status, 200, "案例 B 首次保存失败");
assert.equal(savedB.body?.progress?.snapshot?.revision, 1);

const readA = await readCase(caseA);
const readB = await readCase(caseB);
assert.equal(readA.status, 200);
assert.equal(readB.status, 200);
assert.equal(readA.body.case.snapshot.payload.caseLabel, "A");
assert.equal(readB.body.case.snapshot.payload.caseLabel, "B");
assert.equal(readA.body.case.caseRecord.id, caseA.caseId);
assert.equal(readB.body.case.caseRecord.id, caseB.caseId);
assert.ok(readA.body.case.events.every((event) => event.caseId === caseA.caseId));
assert.ok(readB.body.case.events.every((event) => event.caseId === caseB.caseId));

const savedANext = await saveProgress(caseA, { revision: 1, eventId: `${eventA}:next`, label: "A", stage: "review" });
assert.equal(savedANext.status, 200, "案例 A 交替保存失败");
assert.equal(savedANext.body?.progress?.snapshot?.revision, 2);

const staleA = await saveProgress(caseA, { revision: 1, eventId: `${eventA}:stale`, label: "A-stale", stage: "stale" });
assert.equal(staleA.status, 409, "旧 revision 保存没有返回冲突");

const afterConflictA = await readCase(caseA);
const afterConflictB = await readCase(caseB);
assert.equal(afterConflictA.body.case.snapshot.revision, 2);
assert.equal(afterConflictA.body.case.snapshot.payload.caseLabel, "A");
assert.equal(afterConflictB.body.case.snapshot.revision, 1);
assert.equal(afterConflictB.body.case.snapshot.payload.caseLabel, "B");

const wrongToken = await requestJson(`/api/pilot/cases/${encodeURIComponent(caseA.caseId)}`, {
  headers: { authorization: `Bearer ${caseB.accessToken}` },
});
assert.equal(wrongToken.status, 401, "案例凭据不能跨案例读取");

console.log(`案例 A：${caseA.caseId}，revision ${afterConflictA.body.case.snapshot.revision}`);
console.log(`案例 B：${caseB.caseId}，revision ${afterConflictB.body.case.snapshot.revision}`);
console.log("案例隔离：A/B 快照和事件均未串线");
console.log("revision 冲突：旧保存返回 409，最新快照未被覆盖");
console.log(`跨案例凭据：${wrongToken.status === 401 ? "拒绝" : "异常"}`);
const unexpectedRuntimeErrors = runtimeErrors.filter((error) => !/responded with a status of (409|401)\b/.test(error));
console.log("浏览器运行时错误数:", unexpectedRuntimeErrors.length, unexpectedRuntimeErrors.slice(0, 3));
assert.equal(unexpectedRuntimeErrors.length, 0, `浏览器运行时出现未预期错误：${unexpectedRuntimeErrors.join(" | ")}`);

if (process.env.PILOT_PRESERVE_TEST_DATA !== "1") {
  const cleanup = await Promise.all(createdCases.map((access) => deletePilotCase(page, access)));
  assert.ok(cleanup.every((result) => result?.status === 200), `测试案例清理失败：${JSON.stringify(cleanup)}`);
  console.log(`测试数据清理：已删除 ${createdCases.length} 个隔离案例`);
}

await browser.close();

/**
 * DATA-06：从康复记录删除案例，并确认旧访问凭据失效、管理员时间线保留删除事件。
 */

import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const URL = process.env.WALKTHROUGH_URL ?? "http://localhost:3000/";
const adminKey = process.env.PILOT_ADMIN_KEY?.trim();
const inviteToken = process.env.PILOT_INVITE_TOKEN?.trim();
if (!adminKey) throw new Error("PILOT_ADMIN_KEY is required for the delete-case scenario");
if (!inviteToken) throw new Error("PILOT_INVITE_TOKEN is required for the delete-case scenario");

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error}`));
page.on("console", (message) => {
  if (message.type() === "error" && !/status of 401\b/.test(message.text())) {
    runtimeErrors.push(`console:${message.text()}`);
  }
});

await page.goto(`${URL}${URL.includes("?") ? "&" : "?"}invite=${encodeURIComponent(inviteToken)}`, { waitUntil: "networkidle", timeout: 30000 });
const created = await page.evaluate(async (inviteToken) => {
  const accessToken = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const response = await fetch("/api/pilot/cases", {
    method: "POST",
    headers: { "content-type": "application/json", "x-pilot-invite-token": inviteToken },
    body: JSON.stringify({ clientCreationId: globalThis.crypto.randomUUID(), accessToken, initialSnapshot: { step: 0, intake: {} }, currentStage: "症状信息", isBilateral: false, hasSafetyStop: false }),
  });
  return { status: response.status, body: await response.json() };
}, inviteToken);
assert.equal(created.status, 201);
const access = created.body.case;

await page.evaluate((record) => {
  localStorage.setItem("rehabmind-complete-demo-records", JSON.stringify([record]));
}, {
  id: "delete-browser-case-1",
  savedAt: "第1次康复",
  region: "膝关节",
  complaint: "删除验收合成案例",
  goal: "恢复日常活动",
  initialScore: 4,
  latestScore: 4,
  scoreComparable: true,
  sessionCount: 1,
  caseKey: "delete-browser-case-key",
  status: "待复查",
  snapshot: { step: 0, intake: {} },
  pilotCaseId: access.caseId,
  pilotPublicCode: access.publicCode,
  pilotAccessToken: access.accessToken,
  pilotRevision: access.revision,
  pilotVersions: access.versions,
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(350);

const onboardingSkip = page.getByRole("button", { name: "跳过教程", exact: true });
if (await onboardingSkip.count() && await onboardingSkip.first().isVisible().catch(() => false)) await onboardingSkip.first().click();
await page.getByRole("button", { name: /康复记录/ }).click();
await page.waitForTimeout(120);
const record = page.locator(".rm-record-case").filter({ hasText: "删除验收合成案例" }).first();
assert.equal(await record.count(), 1, "康复记录中应出现待删除案例");

page.once("dialog", async (dialog) => {
  assert.match(dialog.message(), /删除后将无法通过当前案例链接继续读取/);
  await dialog.accept();
});
await record.getByRole("button", { name: "删除", exact: true }).click();
await page.waitForFunction(() => !document.querySelector('[role="dialog"][aria-label="康复记录"] .rm-record-case'), null, { timeout: 15000 });
assert.match(await page.locator('[role="dialog"][aria-label="康复记录"]').textContent(), /还没有保存记录/);

const afterDelete = await page.evaluate(async ({ caseId, accessToken }) => {
  const response = await fetch(`/api/pilot/cases/${encodeURIComponent(caseId)}`, { headers: { authorization: `Bearer ${accessToken}` } });
  return { status: response.status, body: await response.json() };
}, { caseId: access.caseId, accessToken: access.accessToken });
assert.equal(afterDelete.status, 401, "删除后旧访问凭据不能读取案例");

const adminView = await page.evaluate(async ({ caseId, adminKey }) => {
  const response = await fetch(`/api/pilot/admin/cases/${encodeURIComponent(caseId)}`, { headers: { "x-pilot-admin-key": adminKey } });
  return { status: response.status, body: await response.json() };
}, { caseId: access.caseId, adminKey });
assert.equal(adminView.status, 200, "管理员应能复核已删除案例的审计时间线");
assert.equal(adminView.body.case.caseRecord.status, "deleted");
assert.ok(adminView.body.case.events.some((event) => event.type === "case_deleted"), "时间线应保留 case_deleted 事件");
assert.equal("accessTokenHash" in adminView.body.case.caseRecord, false, "管理员复核不能泄露访问令牌哈希");

assert.equal(runtimeErrors.length, 0, `删除浏览器场景出现运行时错误：${runtimeErrors.join(" | ")}`);
console.log("DATA-06：康复记录删除、旧凭据失效、管理员删除事件回读通过");
console.log("浏览器运行时错误数:", runtimeErrors.length);
await browser.close();

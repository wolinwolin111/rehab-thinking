/**
 * DATA-06 / DATA-09：管理员入口保护、案例回读和敏感字段脱敏。
 *
 * 删除流程由 real-browser-b-delete-case.mjs 单独验证，本脚本只验证管理员入口。
 */

import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const URL = process.env.WALKTHROUGH_URL ?? "http://localhost:3000/";
const adminKey = process.env.PILOT_ADMIN_KEY?.trim();
if (!adminKey) throw new Error("PILOT_ADMIN_KEY is required for the positive admin guard scenario");

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error}`));
page.on("console", (message) => {
  if (message.type() === "error" && !/status of 401\b/.test(message.text())) {
    runtimeErrors.push(`console:${message.text()}`);
  }
});
await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });

async function request(path, headers = {}) {
  return page.evaluate(async ({ path, headers }) => {
    const response = await fetch(path, { headers });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { path, headers });
}

const noKey = await request("/api/pilot/admin/cases");
assert.equal(noKey.status, 401, "管理员接口无凭据时应拒绝");
assert.equal(noKey.body?.code, "unauthorized");

const wrongKey = await request("/api/pilot/admin/cases", { "x-pilot-admin-key": "wrong-key-for-browser-test" });
assert.equal(wrongKey.status, 401, "管理员接口错误凭据时应拒绝");
assert.equal(wrongKey.body?.code, "unauthorized");

const list = await request("/api/pilot/admin/cases", { "x-pilot-admin-key": adminKey });
assert.equal(list.status, 200, "正确管理员凭据应能读取案例列表");
assert.ok(Array.isArray(list.body?.cases), "管理员列表应返回案例数组");

const firstCase = list.body.cases[0];
if (firstCase) {
  assert.equal("accessTokenHash" in firstCase, false, "管理员列表不能泄露访问令牌哈希");
  const detail = await request(`/api/pilot/admin/cases/${encodeURIComponent(firstCase.id)}`, { "x-pilot-admin-key": adminKey });
  assert.equal(detail.status, 200, "正确管理员凭据应能读取案例详情");
  assert.equal("accessTokenHash" in (detail.body?.case?.caseRecord ?? {}), false, "管理员详情不能泄露访问令牌哈希");
  assert.equal(detail.body?.case?.caseRecord?.id, firstCase.id);
  assert.ok(Array.isArray(detail.body?.case?.events), "管理员详情应包含事件时间线");
}

const publicDetail = firstCase
  ? await request(`/api/pilot/admin/cases/${encodeURIComponent(firstCase.id)}`)
  : null;
if (publicDetail) assert.equal(publicDetail.status, 401, "案例详情不能绕过管理员入口保护");

assert.equal(runtimeErrors.length, 0, `管理员浏览器场景出现运行时错误：${runtimeErrors.join(" | ")}`);
console.log(`DATA-06/09：无凭据、错误凭据均拒绝；正确凭据可读取${firstCase ? "案例详情和事件时间线" : "案例列表"}，敏感字段未泄露`);
console.log("删除流程：由 real-browser-b-delete-case.mjs 单独验证");
console.log("浏览器运行时错误数:", runtimeErrors.length);
await browser.close();

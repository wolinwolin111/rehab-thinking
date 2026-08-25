/**
 * DATA-04 / OPS-06：保存请求卡住或在保存中刷新时，不能丢掉本机副本。
 *
 * 先让创建案例请求保持挂起，在请求仍未完成时刷新页面；随后验证超时
 * 会回退到“仅本机保存”，解除网络限制后再次保存可以完成同步。
 */

import assert from "node:assert/strict";
import { deletePilotCase, dismissOnboarding } from "./real-browser-test-helpers.mjs";
import {
  clickFirstFixedButton,
  clickFixedButton,
  fixedScenarioUrl,
  launchFixedScenario,
  readLocalCaseRecords,
  waitForLocalCaseRecords,
  waitForSyncedLocalCase,
  waitForFixedUi,
} from "./real-browser-fixed-scenario-helpers.mjs";

const { browser, page, runtimeErrors } = await launchFixedScenario();
const URL = fixedScenarioUrl();
const delayedRequests = [];

async function localRecords() {
  return readLocalCaseRecords(page);
}

async function clickSave(label) {
  const save = page.getByRole("button", { name: "保存", exact: true }).last();
  assert.ok(await save.count(), `${label}缺少保存入口`);
  await save.click();
  await waitForFixedUi(page, 180);
}

await page.route("**/api/pilot/cases", async (route) => {
  delayedRequests.push(route.request().method());
  await new Promise((resolve) => setTimeout(resolve, 14000));
  await route.abort("timedout").catch(() => undefined);
});

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await dismissOnboarding(page);
await page.locator("textarea").fill("右膝下楼时疼，最近三个月反复出现");
await clickFixedButton(page, "帮我整理");
await clickFirstFixedButton(page, /自助康复/, "自助康复");
await clickFirstFixedButton(page, /下一步/, "进入症状信息");

const complaintPicker = page.locator(".rm-lower-limb-picker.is-complaint:visible").first();
assert.ok(await complaintPicker.count(), "症状页应出现不适位置选择器");
await complaintPicker.locator('[aria-label="右侧膝盖正面"]').click();
await waitForFixedUi(page);
await complaintPicker.locator('[role="button"][aria-label="右侧 · 膝内侧关节线"]').click();
await waitForFixedUi(page);

await clickSave("首次保存");
await waitForLocalCaseRecords(page);
assert.equal(delayedRequests.length, 1, "首次保存应已经发起创建案例请求");
const beforeRefresh = await localRecords();
const beforeRefreshStep = beforeRefresh[0]?.snapshot?.step;

// 刷新发生在请求完成之前，检查页面是否仍能从本机副本恢复。
await page.reload({ waitUntil: "networkidle", timeout: 30000 });
await dismissOnboarding(page);
await page.getByRole("button", { name: /康复记录/ }).click();
const continueRecord = page.locator(".rm-record-continue:visible").first();
assert.ok(await continueRecord.count(), "保存中刷新后应存在本机案例继续入口");
await continueRecord.click();
await waitForFixedUi(page);
const afterRefresh = await localRecords();
assert.equal(afterRefresh.length, 1, "保存中刷新不能清掉本机案例");
assert.equal(afterRefresh[0].snapshot.step, beforeRefreshStep, "保存中刷新不能回退步骤");

// 保持请求挂起到客户端超时，确认 UI 不会一直停留在同步中。
await clickSave("超时保存");
await page.getByText("仅本机保存", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
const afterTimeout = await localRecords();
assert.equal(afterTimeout.length, 1, "超时后仍应保留本机案例");
assert.equal(afterTimeout[0].pilotCaseId, undefined, "创建请求超时后不能伪装成已同步");

await page.unroute("**/api/pilot/cases");
await clickSave("恢复连接后重试");
const synced = (await waitForSyncedLocalCase(page))[0];
assert.ok(synced.pilotCaseId, "恢复连接后重试应创建服务器案例");
assert.equal(synced.snapshot.step, beforeRefreshStep, "重试同步不能改变恢复后的案例步骤");
const unexpectedRuntimeErrors = runtimeErrors.filter((error) => !error.includes("net::ERR_FAILED"));
assert.equal(unexpectedRuntimeErrors.length, 0, unexpectedRuntimeErrors.join(" | "));
console.log(`DATA-04/OPS-06：保存中刷新保留步骤 ${beforeRefreshStep}，客户端超时回退本机，恢复连接后同步成功`);
await page.screenshot({ path: ".tmp-ops-timeout-refresh.png", fullPage: true });
if (process.env.PILOT_PRESERVE_TEST_DATA !== "1") {
  const cleanup = await deletePilotCase(page, {
    caseId: synced.pilotCaseId,
    accessToken: synced.pilotAccessToken,
  });
  assert.equal(cleanup?.status, 200, `保存超时场景测试案例清理失败：${JSON.stringify(cleanup)}`);
  console.log("测试数据清理：已删除保存超时场景案例");
}
await browser.close();

/**
 * OPS-05 / DATA-04：断网后继续填写，刷新后恢复本机副本，恢复连接后重新同步。
 *
 * 这个场景只验证保存、恢复和同步边界，不把完整临床流程重复跑一遍。
 */

import assert from "node:assert/strict";
import { dismissOnboarding } from "./real-browser-test-helpers.mjs";
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
let blockPilotRequests = true;

async function localRecords() {
  return readLocalCaseRecords(page);
}

async function saveLocalSnapshot(label) {
  const save = page.getByRole("button", { name: "保存", exact: true }).last();
  assert.ok(await save.count(), `${label}缺少顶部保存按钮`);
  await save.click();
  await waitForFixedUi(page);
  const records = await waitForLocalCaseRecords(page);
  assert.equal(records.length, 1, `${label}应保留一条本机案例`);
  return records[0];
}

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await dismissOnboarding(page);
await page.locator("textarea").fill("右膝下楼时疼，有三个月了");
await clickFixedButton(page, "帮我整理");
await clickFirstFixedButton(page, /自助康复/, "自助康复");
await clickFirstFixedButton(page, /下一步/, "进入症状信息");

const complaintPicker = page.locator(".rm-lower-limb-picker.is-complaint:visible").first();
assert.ok(await complaintPicker.count(), "症状页应出现不适位置选择器");
await complaintPicker.locator('[aria-label="右侧膝盖正面"]').click();
await waitForFixedUi(page);
await complaintPicker.locator('[role="button"][aria-label="右侧 · 膝内侧关节线"]').click();
await waitForFixedUi(page);

await page.route("**/api/pilot/**", (route) => {
  const request = route.request();
  console.log(`  拦截器：${blockPilotRequests ? "断网" : "放行"} ${request.method()} ${request.postData()?.length ?? 0} bytes`);
  return blockPilotRequests ? route.abort() : route.continue();
});
const firstLocal = await saveLocalSnapshot("第一次离线保存");
assert.equal(firstLocal.pilotCaseId, undefined, "断网时不应伪装成已有服务器案例");

const firstStep = firstLocal.snapshot?.step;
const allInfo = page.getByRole("button", { name: /全部信息/ }).last();
if (await allInfo.count()) {
  await allInfo.click();
  await waitForFixedUi(page);
}
const select = page.locator("select:visible").first();
if (await select.count() && !(await select.inputValue())) {
  await select.selectOption({ index: 1 });
  await waitForFixedUi(page);
}
const next = page.getByRole("button", { name: /下一步/ }).first();
if (await next.count() && !await next.isDisabled().catch(() => true)) {
  await next.click();
  await waitForFixedUi(page);
}
const continuedLocal = await saveLocalSnapshot("断网后继续填写");
assert.ok(continuedLocal.snapshot, "继续填写后仍应有本机快照");
assert.ok(continuedLocal.snapshot.step !== firstStep || continuedLocal.snapshot.intake.onset, "断网后继续填写没有改变任何可恢复状态");
console.log(`断网继续填写：步骤 ${firstStep} -> ${continuedLocal.snapshot.step}`);

await page.reload({ waitUntil: "networkidle", timeout: 30000 });
await dismissOnboarding(page);
await page.getByRole("button", { name: /康复记录/ }).click();
const continueRecord = page.locator(".rm-record-continue:visible").first();
assert.ok(await continueRecord.count(), "刷新后康复记录中应存在继续入口");
await continueRecord.click();
await waitForFixedUi(page);
const restoredLocal = await localRecords();
assert.equal(restoredLocal.length, 1, "刷新恢复后本机案例数量应保持不变");
assert.equal(restoredLocal[0].snapshot.step, continuedLocal.snapshot.step, "刷新恢复后步骤不应回退");
console.log(`刷新恢复：仍在步骤 ${restoredLocal[0].snapshot.step}`);

blockPilotRequests = false;
await saveLocalSnapshot("恢复连接后的同步触发");
const syncedRecords = await waitForSyncedLocalCase(page);
const syncedRecord = syncedRecords[0];
assert.ok(syncedRecord?.pilotCaseId, "恢复连接后应创建服务器案例并回写案例 ID");
assert.ok(Number.isInteger(syncedRecord.pilotRevision), "恢复连接后应回写服务器 revision");
assert.match((await page.locator("main").textContent()).replace(/\s+/g, " "), /已同步|同步中/);
console.log(`恢复连接同步：案例 ${syncedRecord.pilotCaseId}，revision ${syncedRecord.pilotRevision}`);

const remoteView = await page.evaluate(async ({ caseId, accessToken }) => {
  const response = await fetch(`/api/pilot/cases/${encodeURIComponent(caseId)}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  return { status: response.status, body: await response.json() };
}, { caseId: syncedRecord.pilotCaseId, accessToken: syncedRecord.pilotAccessToken });
assert.equal(remoteView.status, 200, "恢复同步后应能通过案例凭据读取服务端案例");
assert.equal(remoteView.body.case.snapshot.revision, syncedRecord.pilotRevision, "服务端 revision 应与本机回写值一致");
assert.ok(remoteView.body.case.snapshot.payload?.intake, "服务端应保留完整症状快照");
assert.ok(remoteView.body.case.events.length >= 1, "服务端应保留至少一条保存事件");
assert.ok(remoteView.body.case.caseRecord.appVersion, "服务端案例应保留应用版本");
assert.ok(remoteView.body.case.caseRecord.knowledgeVersion, "服务端案例应保留知识版本");
assert.ok(remoteView.body.case.caseRecord.decisionVersion, "服务端案例应保留决策版本");
console.log(`服务端回读：revision ${remoteView.body.case.snapshot.revision}，事件 ${remoteView.body.case.events.length} 条，版本 ${remoteView.body.case.caseRecord.appVersion}`);

const feedbackResponse = await page.evaluate(async ({ caseId, accessToken, eventId }) => {
  const response = await fetch(`/api/pilot/cases/${encodeURIComponent(caseId)}/feedback`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ eventId, stage: "症状信息", kind: "有帮助", message: "步骤清楚" }),
  });
  return { status: response.status, body: await response.json() };
}, {
  caseId: syncedRecord.pilotCaseId,
  accessToken: syncedRecord.pilotAccessToken,
  eventId: remoteView.body.case.events.at(-1)?.id,
});
assert.equal(feedbackResponse.status, 201, "当前案例提交反馈应成功");
assert.equal(feedbackResponse.body.feedback.caseId, syncedRecord.pilotCaseId, "反馈必须绑定当前案例");
assert.equal(feedbackResponse.body.feedback.eventId, remoteView.body.case.events.at(-1)?.id, "反馈应绑定当前案例事件");
const remoteAfterFeedback = await page.evaluate(async ({ caseId, accessToken }) => {
  const response = await fetch(`/api/pilot/cases/${encodeURIComponent(caseId)}`, { headers: { authorization: `Bearer ${accessToken}` } });
  return { status: response.status, body: await response.json() };
}, { caseId: syncedRecord.pilotCaseId, accessToken: syncedRecord.pilotAccessToken });
assert.equal(remoteAfterFeedback.status, 200);
assert.equal(remoteAfterFeedback.body.case.feedback.length, 1, "案例回读应包含刚提交的反馈");
console.log("反馈绑定：当前案例事件关联成功，并可从案例时间线回读");

const unexpectedRuntimeErrors = runtimeErrors.filter((error) => !error.includes("net::ERR_FAILED"));
assert.equal(unexpectedRuntimeErrors.length, 0, unexpectedRuntimeErrors.join(" | "));
await page.screenshot({ path: ".tmp-ops-offline-continue.png", fullPage: true });
await browser.close();

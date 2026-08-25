/**
 * FEEDBACK-01：验证“问题反馈”默认当前模块，并允许回溯到上一康复记录的历史模块。
 */

import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const URL = process.env.WALKTHROUGH_URL ?? "http://localhost:3000/";
const adminKey = process.env.PILOT_ADMIN_KEY?.trim();
const inviteToken = process.env.PILOT_INVITE_TOKEN?.trim();
if (!inviteToken) throw new Error("PILOT_INVITE_TOKEN is required for the feedback scenario");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error}`));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(`console:${message.text()}`);
});

await page.goto(`${URL}${URL.includes("?") ? "&" : "?"}invite=${encodeURIComponent(inviteToken)}`, { waitUntil: "networkidle", timeout: 30000 });
const onboardingSkip = page.getByRole("button", { name: "跳过教程", exact: true });
if (await onboardingSkip.count() && await onboardingSkip.first().isVisible().catch(() => false)) await onboardingSkip.first().click();

const created = await page.evaluate(async (inviteToken) => {
  const response = await fetch("/api/pilot/cases", {
    method: "POST",
    headers: { "content-type": "application/json", "x-pilot-invite-token": inviteToken },
    body: JSON.stringify({ initialSnapshot: { step: 4 }, currentStage: "训练居家", isBilateral: false, hasSafetyStop: false }),
  });
  return { status: response.status, body: await response.json() };
}, inviteToken);
assert.equal(created.status, 201);
const access = created.body.case;
const intake = {
  description: "右膝下蹲时疼痛",
  parsed: true,
  userRole: "general",
  examSetup: "self",
  productMode: "self-help",
  operationTarget: "self",
  capabilities: {},
  capabilitiesConfirmed: true,
  regionId: "knee",
  side: "右侧",
  location: "膝关节",
  locationConfirmed: true,
  symptomType: "疼痛",
  painQualityConfirmed: true,
  goal: 3,
  baselineScore: 5,
  baselineScoreConfirmed: true,
  symptoms: [],
  provocationTypes: [],
  reportedActions: [],
  bodyLocations: [],
  swellingLocations: [],
  tendernessLocations: [],
  sensoryLocations: [],
};
const snapshot = {
  step: 4,
  intake,
  safety: {},
  boneRisk: {},
  imaging: [],
  assessmentIndex: 0,
  assessmentResults: {},
  trialTargetIndex: 0,
  candidateIndex: 0,
  trialRecords: [],
  postScore: 0,
  postDiscomfort: "",
  movementResponse: "",
  movementResponses: {},
  movementDiscomforts: {},
  movementScores: {},
  movementScoreConfirmed: {},
  exerciseFeedback: {},
  trainingComplete: false,
  trainingPlanSaved: false,
  followupMode: false,
  sessionNumber: 2,
  followupScore: 0,
  followupScoreHistory: [],
  followupStage: "training",
  followupPostScore: 0,
  followupCandidateId: "",
  followupTrialRecords: [],
  followupMovementResponses: {},
  followupMovementDiscomforts: {},
  followupMovementScores: {},
  followupMovementScoreConfirmed: {},
  followupTensionLocations: [],
  followupExerciseChoices: {},
  hasNewSymptom: "no",
  followupTrends: {},
  sessionHistory: [
    { sessionNumber: 1, completedAt: "2026-08-20T00:00:00.000Z", startedScore: 5, endingScore: 4, reviewResults: [], treatments: [], continuedEffectiveTreatments: [], stoppedTreatments: [], resolvedProblems: [], training: [], nextFocus: [] },
    { sessionNumber: 2, completedAt: "2026-08-21T00:00:00.000Z", startedScore: 4, endingScore: 3, reviewResults: [], treatments: [], continuedEffectiveTreatments: [], stoppedTreatments: [], resolvedProblems: [], training: [], nextFocus: [] },
  ],
};
const caseKey = "knee:右侧:膝关节:右侧 · 膝关节 · 疼痛";
await page.evaluate(({ access, snapshot, caseKey }) => {
  localStorage.setItem("rehabmind-complete-demo-records", JSON.stringify([{
    id: "feedback-context-case-1",
    savedAt: "第2次康复",
    region: "膝关节",
    complaint: "右侧 · 膝关节 · 疼痛",
    goal: "恢复日常活动",
    initialScore: 5,
    latestScore: 3,
    scoreComparable: true,
    sessionCount: 2,
    caseKey,
    sessionHistory: snapshot.sessionHistory,
    status: "康复中",
    snapshot,
    pilotCaseId: access.caseId,
    pilotPublicCode: access.publicCode,
    pilotAccessToken: access.accessToken,
    pilotRevision: access.revision,
    pilotVersions: access.versions,
  }]));
}, { access, snapshot, caseKey });

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(350);
await page.getByRole("button", { name: /康复记录/ }).click();
assert.match(await page.locator(".rm-records-modal").textContent(), new RegExp(access.publicCode), "康复记录中应直接显示匿名案例编号");
await page.getByRole("button", { name: "继续", exact: true }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "问题反馈", exact: true }).click();

const dialog = page.getByRole("dialog", { name: "问题反馈" });
assert.equal(await dialog.count(), 1, "问题反馈窗口应打开");
const locationSelect = dialog.locator("select");
assert.equal(await locationSelect.count(), 1, "反馈窗口应提供反馈位置选择");
assert.equal(await locationSelect.inputValue(), "2:训练居家", "默认应绑定当前模块和当前康复记录");
await locationSelect.selectOption({ label: "第1次 · 处理复测" });
await dialog.getByRole("button", { name: "结果不符合实际", exact: true }).click();
await dialog.locator("textarea").fill("第1次处理复测的结果和实际感受不一致");
await dialog.getByRole("button", { name: "提交反馈", exact: true }).click();
await page.waitForTimeout(450);

const feedback = await page.evaluate(async ({ caseId, accessToken }) => {
  const response = await fetch(`/api/pilot/cases/${encodeURIComponent(caseId)}`, { headers: { authorization: `Bearer ${accessToken}` } });
  return { status: response.status, body: await response.json() };
}, { caseId: access.caseId, accessToken: access.accessToken });
assert.equal(feedback.status, 200);
const savedFeedback = feedback.body.case.feedback.at(-1);
assert.equal(savedFeedback.sessionNumber, 1, "反馈应关联第1次康复记录");
assert.equal(savedFeedback.stage, "处理复测", "反馈应关联历史模块");
assert.equal(savedFeedback.sourceSessionNumber, 2, "后台应保留提交时所在康复记录");
assert.equal(savedFeedback.sourceStage, "训练居家", "后台应保留提交时所在模块");
assert.equal(savedFeedback.kind, "结果不符合实际");
assert.match(savedFeedback.message, /第1次处理复测/);
await page.getByRole("button", { name: "问题反馈", exact: true }).click();
const unlocatedDialog = page.getByRole("dialog", { name: "问题反馈" });
await unlocatedDialog.locator("select").selectOption({ label: "暂不确定具体环节" });
await unlocatedDialog.getByRole("button", { name: "其他", exact: true }).click();
await unlocatedDialog.locator("textarea").fill("暂时无法判断具体是哪个步骤的问题");
await unlocatedDialog.getByRole("button", { name: "提交反馈", exact: true }).click();
await page.waitForTimeout(350);
const unlocatedFeedback = await page.evaluate(async ({ caseId, accessToken }) => {
  const response = await fetch(`/api/pilot/cases/${encodeURIComponent(caseId)}`, { headers: { authorization: `Bearer ${accessToken}` } });
  const body = await response.json();
  return { status: response.status, feedback: body.case?.feedback?.at(-1) };
}, { caseId: access.caseId, accessToken: access.accessToken });
assert.equal(unlocatedFeedback.status, 200);
assert.equal(unlocatedFeedback.feedback.sessionNumber, null, "无法定位时不应伪造康复记录编号");
assert.equal(unlocatedFeedback.feedback.stage, "未定位");
assert.equal(unlocatedFeedback.feedback.sourceSessionNumber, 2);
assert.equal(unlocatedFeedback.feedback.sourceStage, "训练居家");
if (adminKey) {
  const adminLookup = await page.evaluate(async ({ publicCode, adminKey }) => {
    const response = await fetch(`/api/pilot/admin/cases?publicCode=${encodeURIComponent(publicCode)}`, { headers: { "x-pilot-admin-key": adminKey } });
    return { status: response.status, body: await response.json() };
  }, { publicCode: access.publicCode, adminKey });
  assert.equal(adminLookup.status, 200, "管理员应能按页面案例编号精确查询");
  assert.equal(adminLookup.body.case.caseRecord.publicCode, access.publicCode);
  assert.equal("accessTokenHash" in adminLookup.body.case.caseRecord, false);
  const historicalFeedback = adminLookup.body.case.feedback.find((item) => item.kind === "结果不符合实际");
  assert.equal(historicalFeedback.sessionNumber, 1);
  assert.equal(adminLookup.body.case.feedback.at(-1).stage, "未定位");
}
assert.equal(runtimeErrors.length, 0, `反馈浏览器场景出现运行时错误：${runtimeErrors.join(" | ")}`);
console.log(`FEEDBACK-01：当前模块默认绑定、历史康复记录回溯、提交位置与目标位置分离${adminKey ? "，管理员按案例编号查询" : ""}通过`);
console.log("浏览器运行时错误数:", runtimeErrors.length);
await browser.close();

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const tissueSource = await readFile(new URL("../app/tissue-pathway-core.ts", import.meta.url), "utf8");
const tissueOutput = ts.transpileModule(tissueSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const tissueUrl = `data:text/javascript;base64,${Buffer.from(tissueOutput).toString("base64")}`;
const decisionSource = (await readFile(new URL("../app/local-limb-decision-core.ts", import.meta.url), "utf8"))
  .replace("./tissue-pathway-core", tissueUrl);
const decisionOutput = ts.transpileModule(decisionSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const decisionCore = await import(`data:text/javascript;base64,${Buffer.from(decisionOutput).toString("base64")}`);
const historyCore = await loadModule("../app/rehab-session-history.ts");
const identityCore = await loadModule("../app/local-case-identity.ts");
const regionSource = await readFile(new URL("../app/local-limb-regions.ts", import.meta.url), "utf8");
const demoSource = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
const chiefHistorySource = await readFile(new URL("../app/chief-retest-history-core.ts", import.meta.url), "utf8");

const base = {
  onset: "1～6周", mechanism: "逐渐出现", symptomType: "牵扯或紧绷",
  symptoms: ["活动受限"], provocationTypes: ["活动到某个角度"], goal: 3,
};

const areaCases = [
  ["thigh-local", "大腿前侧", "thigh-front-length", "thigh-front-release", "thigh-front-isometric"],
  ["thigh-local", "大腿后侧", "thigh-back-length", "thigh-back-release", "thigh-back-isometric"],
  ["thigh-local", "大腿内侧", "thigh-medial-length", "thigh-medial-release", "thigh-medial-isometric"],
  ["thigh-local", "大腿外侧", "thigh-lateral-load", "thigh-lateral-release", "thigh-lateral-isometric"],
  ["calf-local", "小腿前外侧", "calf-dorsiflexion", "calf-front-release", "calf-front-active"],
  ["calf-local", "小腿后侧", "calf-plantarflexion", "calf-back-release", "calf-back-seated-raise"],
  ["calf-local", "小腿内侧", "calf-inversion", "calf-medial-release", "calf-medial-active"],
  ["calf-local", "小腿外侧", "calf-eversion", "calf-lateral-release", "calf-lateral-active"],
];

test("all eight local areas produce their own treatment and explicit early exercise", () => {
  for (const [regionId, location, motionId, releaseId, exerciseId] of areaCases) {
    const decision = decisionCore.buildLocalLimbDecision({
      ...base, regionId, location,
      findings: [{ id: motionId, kind: "length", result: "limited" }],
    });
    assert.deepEqual(decision.treatmentIds, [releaseId], location);
    assert.equal(decision.trainingIds[0], exerciseId, location);
    assert.match(regionSource, new RegExp(`exercise\\("${exerciseId}"`), location);
  }
});

test("explicit local training replaces the old choose-one generic exercise", () => {
  assert.doesNotMatch(regionSource, /对应肌群低负荷保持/);
  assert.doesNotMatch(regionSource, /对应方向低负荷控制/);
  assert.doesNotMatch(regionSource, /按检查结果选择伸膝、屈膝、夹枕或侧向抬腿/);
  assert.doesNotMatch(regionSource, /按检查结果选择勾脚、提踵、内翻或外翻/);
});

test("sit-to-stand regression keeps repetition language instead of gait distance language", () => {
  assert.match(demoSource, /\["gait", "weight-shift"\]\.includes\(tag\)/);
  assert.doesNotMatch(demoSource, /\["gait", "weight-shift", "daily"\]\.includes\(tag\)/);
});

test("summary does not describe a partial score improvement as no change", () => {
  assert.match(demoSource, /record\.result === "better" \|\| record\.result === "partial" \? "主诉变轻，活动仍受限，继续巩固"/);
});

test("a three-session calf journey continues effective work, then exits when resolved", () => {
  const input = { ...base, regionId: "calf-local", location: "小腿后侧", goal: 4 };
  const first = decisionCore.buildLocalLimbDecision({ ...input, sessionNumber: 1, findings: [{ id: "calf-plantarflexion", kind: "length", result: "limited" }] });
  assert.deepEqual(first.treatmentIds, ["calf-back-release"]);
  const second = decisionCore.buildLocalLimbDecision({ ...input, sessionNumber: 2, findings: [{ id: "calf-plantarflexion", kind: "length", result: "limited" }], treatmentHistory: [{ id: "calf-back-release", result: "better", sessionNumber: 1 }] });
  assert.equal(second.continueEffectiveTreatment, true);
  const third = decisionCore.buildLocalLimbDecision({ ...input, sessionNumber: 3, findings: [{ id: "calf-plantarflexion", kind: "length", result: "normal" }, { id: "calf-heel-raise-strength", kind: "strength", result: "normal" }, { id: "calf-heel-raise", kind: "function", result: "normal" }], treatmentHistory: [{ id: "calf-back-release", result: "better", sessionNumber: 1 }, { id: "calf-back-release", result: "better", sessionNumber: 2 }] });
  assert.equal(third.continueEffectiveTreatment, false);
  assert.deepEqual(third.treatmentIds, []);
  assert.ok(third.trainingIds.includes("calf-gait"));
});

test("unknown answers preserve a usable local route without inventing an abnormal result", () => {
  const decision = decisionCore.buildLocalLimbDecision({
    ...base, regionId: "thigh-local", location: "大腿外侧", symptomType: "说不清的不适", symptoms: [],
    findings: [{ id: "thigh-lateral-load", kind: "length", result: "unknown" }, { id: "thigh-lateral-strength", kind: "strength", result: "unknown" }],
  });
  assert.deepEqual(decision.treatmentIds, []);
  assert.ok(decision.assessmentIds.includes("thigh-single-leg"));
  assert.ok(decision.trainingIds.includes("thigh-lateral-isometric"));
});

test("session history appends sessions, updates duplicates, and exposes score trend", () => {
  const first = { sessionNumber: 1, startedScore: 7, endingScore: 5, reviewResults: [], treatments: [], continuedEffectiveTreatments: [], stoppedTreatments: [], resolvedProblems: [], training: [], nextFocus: ["复查活动"] };
  const second = { ...first, sessionNumber: 2, startedScore: 5, endingScore: 3 };
  let history = historyCore.upsertSessionSummary([], first);
  history = historyCore.upsertSessionSummary(history, second);
  history = historyCore.upsertSessionSummary(history, { ...second, endingScore: 2 });
  assert.equal(history.length, 2);
  assert.deepEqual(historyCore.sessionScoreTrend(history), [{ sessionNumber: 1, score: 5 }, { sessionNumber: 2, score: 2 }]);
});

test("formal demo stores one case with append-only session summaries and restores navigation state", () => {
  assert.match(demoSource, /sessionHistory\?: RehabSessionSummary\[\]/);
  assert.match(demoSource, /upsertSessionSummary\(sessionHistory, sessionSummary\)/);
  const firstCase = identityCore.createLocalCaseId();
  const secondCase = identityCore.createLocalCaseId();
  assert.notEqual(firstCase, secondCase);
  assert.equal(identityCore.savedRecordIdentity({ localCaseId: firstCase, caseKey: "same complaint" }), firstCase);
  assert.match(demoSource, /setSessionHistory\(snapshot\.sessionHistory \?\? record\.sessionHistory \?\? \[\]\)/);
  assert.match(demoSource, /setReadyToRetest\(snapshot\.readyToRetest \?\? false\)/);
  assert.match(demoSource, /setFollowupReadyToRetest\(snapshot\.followupReadyToRetest \?\? false\)/);
  assert.match(demoSource, /已记录 \{record\.sessionHistory\?\.length \|\| record\.sessionCount\} 次/);
  assert.match(demoSource, /const railStep: Step = followupMode/);
  assert.match(demoSource, /followupStage === "review" \? 2 : followupStage === "treatment" \? 3 : 4/);
  assert.match(demoSource, /source\?\.how \?\? paired\.how/);
});

test("follow-up summaries translate paired strength ids into user-facing titles", () => {
  assert.match(demoSource, /region\?\.strengths\.find\(\(item\) => item\.id === rawId\)\?\.title \?\? rawId/);
  assert.match(demoSource, /focus\.replace\(matched\.id, matched\.title\)/);
  assert.doesNotMatch(demoSource, /label: assessments\.find\(\(item\) => item\.id === id\)\?\.title \?\? id\.replace/);
});

test("local treatment asks for the chief score only once so a later source cannot block retest", () => {
  assert.match(chiefHistorySource, /export function hasRecordedChiefRetest/);
  assert.match(demoSource, /const localNewSourceNeedsChiefRetest = Boolean\(localLimbDecision[\s\S]*!hasRecordedChiefRetest\(trialRecords\)/);
  assert.match(demoSource, /const shouldRetestChiefThisRound = [\s\S]*localNewSourceNeedsChiefRetest/);
  assert.match(demoSource, /activeTarget\?\.id === "target:local-limb" && \(singleRangeRetestsChief \|\| localNewSourceNeedsChiefRetest\)/);
});

test("a local chief retest removes the already-treated muscle instead of reopening it", () => {
  assert.match(demoSource, /target\.id === "target:chief" && chiefHasCurrentRetest\) return true/);
});

test("followup knee decisions consume current review answers instead of only first-session assessments", () => {
  assert.match(demoSource, /const reviewedAssessments = kneeWorkflowAssessments\.map/);
  assert.match(demoSource, /followupTrends\[assessment\.id\]/);
  assert.match(demoSource, /assessments: reviewedAssessments/);
});

test("session summaries fold range retests into the next session review state", () => {
  assert.match(demoSource, /reviewResults: mergeSessionReviewResults\(/);
  assert.match(demoSource, /mergeSessionReviewResults\(previousSessionForReview\?\.reviewResults \?\? \[\]/);
});

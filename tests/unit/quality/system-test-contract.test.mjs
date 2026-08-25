import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

async function loadBundle(paths) {
  const parts = [];
  for (let i = 0; i < paths.length; i++) {
    const source = await readFile(new URL(paths[i], import.meta.url), "utf8");
    let output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    output = output.replace(/import\s*\{[^}]*\}\s*from\s*"[^"]*";?/g, "");
    if (i < paths.length - 1) output = output.replace(/export\s+/g, "");
    parts.push(output);
  }
  return import(`data:text/javascript;base64,${Buffer.from(parts.join("\n")).toString("base64")}`);
}

const [retest, training, profile, coverage, session, batch] = await Promise.all([
  loadBundle(["../../../src/domain/rehab/retest/retest-eligibility-core.ts"]),
  loadBundle(["../../../src/domain/rehab/training/training-feedback-core.ts"]),
  loadBundle(["../../../src/domain/rehab/intake/workflow-profile-core.ts"]),
  loadBundle(["../../../src/domain/rehab/treatment/treatment-coverage-core.ts"]),
  loadBundle(["../../../src/domain/rehab/treatment/treatment-session-core.ts"]),
  loadBundle(["../../../src/domain/rehab/treatment/treatment-response-core.ts", "../../../src/domain/rehab/treatment/trial-record-builder.ts", "../../../src/domain/rehab/retest/batch-retest-compute.ts"]),
]);

test("SYS-S02 mixed pain improvement and activity worsening is an explicit stop", () => {
  const result = batch.computeBatchResult({
    chiefBeforeScore: 4,
    recordedChiefScore: 2,
    chiefWasActuallyRetested: true,
    rangeBeforeScore: 4,
    outcomes: ["worse", "both-match"],
    priorImprovingTreatmentCount: 0,
  });
  assert.equal(result.result, "partial");
  assert.equal(result.responseRole, "worsened");
  assert.equal(result.activityWorsened, true);
  assert.equal(session.treatmentMustStop([{ result: result.result, activityWorsened: result.activityWorsened }]), true);
});

test("SYS-S03 activity worsening without pain improvement remains a hard stop", () => {
  const result = batch.computeBatchResult({
    chiefBeforeScore: 4,
    recordedChiefScore: 4,
    chiefWasActuallyRetested: true,
    rangeBeforeScore: 4,
    outcomes: ["worse"],
    priorImprovingTreatmentCount: 0,
  });
  assert.equal(result.result, "worse");
  assert.equal(result.activityWorsened, true);
  assert.equal(coverage.summarizeTreatmentCoverage([
    { treatmentKey: "thigh-front", result: result.result, responseRole: result.responseRole, activityWorsened: result.activityWorsened },
  ], [{ treatmentKey: "knee-joint" }]).decision, "stop-worsened");
});

test("SYS-S04 an incomplete function baseline cannot create an ordinary retest", () => {
  assert.equal(retest.retestEligibility({ hasReportedChiefAction: true, hasPerformedBaseline: false, baselineMode: "none" }), "not-comparable");
  assert.equal(retest.retestEligibility({ hasReportedChiefAction: true, hasPerformedBaseline: true, baselineMode: "completion-status", treatmentOrTrainingCompleted: true }), "completion-status");
  assert.equal(retest.retestBaselineModeFromEvidence([{ mode: "completion-status" }, { mode: "ordinary" }]), "ordinary");
});

test("SYS-S07 permissions block professional procedures in guided mode", () => {
  const guided = profile.normalizeWorkflowProfile({
    productMode: "guided",
    operationTarget: "other",
    capabilities: Object.fromEntries(profile.CAPABILITY_KEYS.map((key) => [key, true])),
  });
  assert.equal(guided.canAssessPassive, false);
  assert.equal(guided.canMobilizeJoint, false);
  const professional = profile.normalizeWorkflowProfile({
    productMode: "thinking",
    operationTarget: "other",
    capabilities: { passiveRange: true, jointMobilization: true },
  });
  assert.equal(professional.canAssessPassive, true);
  assert.equal(professional.canMobilizeJoint, true);
});

test("SYS-S10 training cannot finish until every action has feedback", () => {
  const exercises = [{ id: "a" }, { id: "b" }];
  assert.deepEqual(training.pendingTrainingFeedback(exercises, { a: { symptom: "same" } }).map((item) => item.id), ["b"]);
  assert.equal(training.trainingFeedbackComplete(exercises, { a: { symptom: "same" } }), false);
  assert.equal(training.trainingFeedbackComplete(exercises, { a: { symptom: "same" }, b: { symptom: "worse" } }), true);
});

test("SYS-EVIDENCE-001 no treatment coverage exists without an actual treatment attempt", () => {
  const state = coverage.summarizeTreatmentCoverage([], [{ treatmentKey: "thigh-front" }]);
  assert.equal(state.decision, "no-treatment");
  assert.deepEqual(state.coveredTreatmentKeys, []);
});

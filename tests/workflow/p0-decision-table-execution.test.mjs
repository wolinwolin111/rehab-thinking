import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadTypeScriptModule } from "../support/load-typescript-module.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = await loadTypeScriptModule(
  path.join(rootDir, "src/features/rehabmind/workflow/workflow-orchestrator.ts"),
  { rootDir },
);
const retestCore = await loadTypeScriptModule(path.join(rootDir, "src/domain/rehab/retest/retest-eligibility-core.ts"), { rootDir });
const queueCore = await loadTypeScriptModule(path.join(rootDir, "src/domain/rehab/treatment/treatment-queue-eligibility-core.ts"), { rootDir });
const tables = JSON.parse(await readFile(new URL("./decision-tables/p0-gates.json", import.meta.url), "utf8"));

const projectionBase = {
  intakeComplete: true,
  safetyComplete: true,
  adverseResponse: false,
  planIsCurrent: true,
  assessmentReadyForTreatment: true,
  assessmentNeedsReferral: false,
  queueRefreshing: false,
  pendingAssessmentCheck: false,
  queueLength: 0,
  queueIndex: 0,
  bilateral: false,
  assessmentComplete: true,
  safetySignal: false,
  treatmentWorsened: false,
  trainingComplete: false,
  trainingPlanSaved: false,
};

test("A4 SAFE-GATE rows execute the production orchestrator", () => {
  const table = tables.tables.find((item) => item.ruleId === "SAFE-GATE");
  assert.ok(table);
  for (const row of table.rows) {
    const [answersComplete, imagingSelected, safetySignal, structuralSignal, medicalClearance] = row.when;
    const actual = workflow.resolveWorkflowSafetyGate({
      answersComplete,
      imagingSelected,
      safetySignal,
      structuralSignal,
      medicalClearance,
    }).outcome;
    assert.equal(actual, row.then, row.id);
  }
});

test("A4 RETEST-GATE rows execute the production eligibility core", () => {
  const table = tables.tables.find((item) => item.ruleId === "RETEST-GATE");
  assert.ok(table);
  for (const row of table.rows) {
    const [reportedAction, performedBaseline, baselineMode, comparableNow, interventionCompleted] = row.when;
    const actual = retestCore.retestEligibility({
      hasReportedChiefAction: reportedAction,
      hasPerformedBaseline: performedBaseline,
      baselineMode,
      isComparableNow: comparableNow,
      treatmentOrTrainingCompleted: interventionCompleted,
    });
    assert.equal(actual, row.then, row.id);
  }
});

test("A4 QUEUE-GATE rows execute the production eligibility core", () => {
  const table = tables.tables.find((item) => item.ruleId === "QUEUE-GATE");
  assert.ok(table);
  for (const row of table.rows) {
    const [preferredTypeMatches, trackedNeeds, recordedNeeds, targetNeeds, chiefStillSymptomatic] = row.when;
    const tracked = trackedNeeds !== null;
    const recorded = !tracked && recordedNeeds;
    const target = !tracked && !recorded && targetNeeds;
    const direction = tracked ? "tracked" : recorded ? "recorded" : undefined;
    const candidate = {
      type: preferredTypeMatches ? "control" : "muscle",
      retestIds: direction ? [direction] : [],
    };
    const actual = queueCore.isTreatmentQueueCandidateEligible({
      candidate,
      target: { direction: target ? "target" : undefined },
      preferredTypes: ["control"],
      trackedDirectionIds: new Set(tracked ? ["tracked"] : []),
      mergedOutcomes: recorded ? { recorded: "limited" } : {},
      chiefStillSymptomatic,
      getCandidateType: (item) => item.type,
      getCandidateRetestIds: (item) => item.retestIds,
      getTargetDirectionId: (item) => item.direction,
      samePhysicalAction: (left, right) => left === right,
      directionNeedsCandidate: (_candidate, directionId) => directionId === "tracked"
        ? Boolean(trackedNeeds)
        : directionId === "recorded"
          ? Boolean(recordedNeeds)
          : Boolean(targetNeeds),
    });
    assert.equal(actual ? "eligible" : "ineligible", row.then, row.id);
  }
});

test("A4 WORKFLOW-HANDOFF decision rows execute the production orchestrator", () => {
  const table = tables.tables.find((item) => item.ruleId === "WORKFLOW-HANDOFF");
  assert.ok(table);
  for (const row of table.rows) {
    const [queueRefreshing, pendingAssessmentCheck, queueRemaining, safetySignal, treatmentWorsened] = row.when;
    const result = workflow.projectWorkflowState({
      ...projectionBase,
      queueRefreshing,
      pendingAssessmentCheck,
      queueLength: queueRemaining ? 1 : 0,
      queueIndex: 0,
      safetySignal,
      treatmentWorsened,
    });
    const actual = !result.treatmentComplete
      ? "remain-treatment"
      : result.trainingStageGate.blocked
        ? "blocked"
        : "enter-training";
    assert.equal(actual, row.then, row.id);
  }
});

test("A4 TRAINING-GATE rows execute the production orchestrator", () => {
  const table = tables.tables.find((item) => item.ruleId === "TRAINING-GATE");
  assert.ok(table);
  for (const row of table.rows) {
    const [bilateral, assessmentComplete, safetySignal, treatmentWorsened, trainingComplete, trainingPlanSaved] = row.when;
    const result = workflow.projectWorkflowState({
      ...projectionBase,
      bilateral,
      assessmentComplete,
      safetySignal,
      treatmentWorsened,
      trainingComplete,
      trainingPlanSaved,
    });
    const actual = result.trainingStageClosed
      ? "closed"
      : result.trainingStageGate.blocked
        ? "blocked"
        : result.trainingStageGate.lowLoadOnly
          ? "low-load-open"
          : "normal-open";
    assert.equal(actual, row.then, row.id);
  }
});

test("A4 RETURN-EDIT-GATE rows execute the production orchestrator", () => {
  const table = tables.tables.find((item) => item.ruleId === "RETURN-EDIT-GATE");
  assert.ok(table);
  for (const row of table.rows) {
    const [targetIsCompleted, editExplicitlyEnabled, answersChanged] = row.when;
    assert.equal(workflow.resolveReturnEditGate({
      targetIsCompleted,
      editExplicitlyEnabled,
      answersChanged,
    }), row.then, row.id);
  }
});

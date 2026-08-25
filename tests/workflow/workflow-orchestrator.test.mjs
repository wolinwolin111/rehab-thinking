import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadTypeScriptModule } from "../support/load-typescript-module.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = await loadTypeScriptModule(
  path.join(rootDir, "src/features/rehabmind/workflow/workflow-orchestrator.ts"),
  { rootDir },
);

const candidates = [
  { id: "muscle", type: "muscle" },
  { id: "control", type: "control" },
];

function retest(overrides = {}) {
  return workflow.orchestrateTreatmentRetest({
    candidates,
    startIndex: 0,
    result: "partial",
    activityWorsened: false,
    getType: (candidate) => candidate.type,
    ...overrides,
  });
}

test("A4 treatment retest chooses the next eligible candidate and emits audit evidence", () => {
  const result = retest({ preferredTypes: ["control"] });
  assert.equal(result.queueAdvance.nextCandidateIndex, 1);
  assert.deepEqual(result.transition, { from: "treatment-retest", to: "treatment-candidate" });
  assert.ok(result.ruleIds.includes("QUEUE-GATE"));
  assert.deepEqual(result.commands, [{ type: "select-treatment-candidate", candidateIndex: 1 }]);
  assert.equal(result.timelineEvents[0].type, "treatment_retest_recorded");
});

test("A4 worsening stops the treatment chain instead of entering training", () => {
  const result = retest({ result: "worse" });
  assert.equal(result.queueAdvance.stopped, true);
  assert.equal(result.transition.to, "treatment-stopped");
  assert.deepEqual(result.commands, [{ type: "stop-treatment", reason: "worsened" }]);
});

test("A4 queue recomputation uses stable target identity and clears the pending marker", () => {
  const targets = [
    { id: "target:a", candidates: [{ id: "joint" }] },
    { id: "target:b", candidates: [{ id: "next" }] },
  ];
  const result = workflow.orchestrateTreatmentQueueRecomputed({
    currentIndex: 1,
    targets,
    pending: {
      completedKey: "target:a:muscle",
      completedTargetId: "target:a",
      nextKey: "target:b:next",
      nextTargetId: "target:b",
    },
  });
  assert.equal(result.resolvedIndex, 0);
  assert.deepEqual(result.commands, [
    { type: "select-treatment-target", targetIndex: 0, candidateIndex: 0 },
    { type: "clear-pending-queue-advance" },
  ]);
  assert.equal(result.timelineEvents[0].type, "treatment_queue_recomputed");
});

test("A4 an empty stable queue hands off to training only when the training gate is open", () => {
  const open = workflow.projectWorkflowState({
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
  });
  assert.equal(open.treatmentComplete, true);
  assert.equal(open.canEnterTraining, true);
  assert.equal(open.maxUnlocked, 4);
  assert.ok(open.ruleIds.includes("TRAINING-GATE"));

  const blocked = workflow.projectWorkflowState({ ...open.input, treatmentWorsened: true });
  assert.equal(blocked.canEnterTraining, false);
  assert.equal(blocked.maxUnlocked, 4);
});

test("A4 saving or completing training closes training and unlocks summary", () => {
  for (const field of ["trainingComplete", "trainingPlanSaved"]) {
    const result = workflow.projectWorkflowState({
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
      [field]: true,
    });
    assert.equal(result.trainingStageClosed, true);
    assert.equal(result.maxUnlocked, 5);
  }
});

test("A4 assessment, treatment, and training transitions obey maxUnlocked", () => {
  for (const [currentStep, targetStep] of [[2, 3], [3, 4], [4, 5]]) {
    const allowed = workflow.orchestrateWorkflowNavigation({
      currentStep,
      maxUnlocked: targetStep,
      event: { type: "navigate-requested", targetStep },
    });
    assert.equal(allowed.allowed, true);
    assert.deepEqual(allowed.commands, [{ type: "navigate-to-step", step: targetStep }]);
    assert.equal(allowed.timelineEvents[0].details.allowed, true);

    const locked = workflow.orchestrateWorkflowNavigation({
      currentStep,
      maxUnlocked: currentStep,
      event: { type: "navigate-requested", targetStep },
    });
    assert.equal(locked.allowed, false);
    assert.deepEqual(locked.commands, []);
  }
});

test("A4 review is read-only until an explicit edit event is accepted", () => {
  const review = workflow.orchestrateWorkflowNavigation({
    currentStep: 4,
    maxUnlocked: 4,
    event: { type: "review-requested", targetStep: 2 },
  });
  assert.deepEqual(review.commands, [{ type: "open-readonly-review", step: 2 }]);

  const implicitEdit = workflow.orchestrateWorkflowNavigation({
    currentStep: 4,
    maxUnlocked: 4,
    event: { type: "edit-requested", targetStep: 2, explicitlyEnabled: false },
  });
  assert.equal(implicitEdit.allowed, false);
  assert.equal(implicitEdit.reason, "edit-not-explicit");

  const explicitEdit = workflow.orchestrateWorkflowNavigation({
    currentStep: 4,
    maxUnlocked: 4,
    event: { type: "edit-requested", targetStep: 2, explicitlyEnabled: true },
  });
  assert.deepEqual(explicitEdit.commands, [{ type: "open-explicit-edit", step: 2 }]);
});

test("A4 followup requires history and adverse response always enters focused capture", () => {
  const missingHistory = workflow.orchestrateWorkflowNavigation({
    currentStep: 5,
    maxUnlocked: 5,
    event: { type: "followup-started", sessionNumber: 2, priorSessionExists: false },
  });
  assert.equal(missingHistory.allowed, false);

  const followup = workflow.orchestrateWorkflowNavigation({
    currentStep: 5,
    maxUnlocked: 5,
    event: { type: "followup-started", sessionNumber: 2, priorSessionExists: true },
  });
  assert.deepEqual(followup.commands, [{ type: "start-followup", sessionNumber: 2 }]);

  const adverse = workflow.orchestrateWorkflowNavigation({
    currentStep: 3,
    maxUnlocked: 4,
    event: { type: "adverse-reported", source: "treatment" },
  });
  assert.equal(adverse.transition.to, "focused-reassessment");
  assert.deepEqual(adverse.commands, [{ type: "capture-adverse-response", source: "treatment" }]);
});

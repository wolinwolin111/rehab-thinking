import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../support/load-typescript-module.mjs";

const invariants = await loadTypeScriptModule("./src/features/rehabmind/workflow/workflow-invariants.ts");

function projection(overrides = {}) {
  return {
    input: {
      intakeComplete: true,
      safetyComplete: true,
      adverseResponse: false,
      planIsCurrent: true,
      assessmentReadyForTreatment: true,
      assessmentNeedsReferral: false,
      queueRefreshing: false,
      pendingAssessmentCheck: false,
      queueLength: 1,
      queueIndex: 1,
      bilateral: false,
      assessmentComplete: true,
      safetySignal: false,
      treatmentWorsened: false,
      trainingComplete: true,
      trainingPlanSaved: true,
      ...(overrides.input ?? {}),
    },
    ruleIds: ["WORKFLOW-HANDOFF", "TRAINING-GATE"],
    treatmentComplete: true,
    trainingStageGate: { blocked: false, closed: true },
    trainingStageClosed: true,
    canEnterTraining: true,
    maxUnlocked: 5,
    ...overrides,
  };
}

test("A6 OPS-03: valid workflow and timeline observations produce no alerts", () => {
  assert.deepEqual(invariants.inspectWorkflowProjectionInvariants({ snapshotStep: 5, projection: projection() }), []);
  assert.deepEqual(invariants.inspectPilotTimelineInvariants({
    caseStatus: "active",
    snapshotRevision: 2,
    events: [
      { id: "created", sequence: 1, type: "case_created", payload: {} },
      { id: "saved", sequence: 2, type: "session_saved", payload: { technical: { baseRevision: 1 } } },
    ],
    feedback: [{ eventId: "saved", sourceEventId: "created" }],
  }), []);
});

test("A6 OPS-03: stage, retest, queue, and training bypasses use stable technical codes", () => {
  assert.deepEqual(invariants.inspectWorkflowProjectionInvariants({
    snapshotStep: 4,
    projection: projection({
      input: { queueLength: 3, queueIndex: 1 },
      treatmentComplete: false,
      canEnterTraining: false,
      maxUnlocked: 3,
    }),
  }), ["INV-WORKFLOW-STAGE-BYPASS", "INV-RETEST-SKIPPED", "INV-QUEUE-EARLY-END"]);

  assert.deepEqual(invariants.inspectWorkflowProjectionInvariants({
    snapshotStep: 5,
    projection: projection({ trainingStageClosed: false, maxUnlocked: 4 }),
  }), ["INV-WORKFLOW-STAGE-BYPASS", "INV-TRAINING-GATE-BYPASS"]);
});

test("A6 OPS-03: timeline corruption, revision regression, deletion resurrection, and feedback mismatch are observable", () => {
  assert.deepEqual(invariants.inspectPilotTimelineInvariants({
    caseStatus: "deleted",
    snapshotRevision: 1,
    events: [
      { id: "created", sequence: 1, type: "case_created", payload: {} },
      { id: "saved", sequence: 3, type: "session_saved", payload: { technical: { baseRevision: 2 } } },
      { id: "deleted", sequence: 4, type: "case_deleted", payload: {} },
      { id: "late", sequence: 5, type: "session_saved", payload: { technical: { baseRevision: 1 } } },
    ],
    feedback: [{ eventId: "other-case-event", sourceEventId: null }],
  }), [
    "INV-TIMELINE-SEQUENCE",
    "INV-REVISION-REGRESSION",
    "INV-DELETED-CASE-RESUMED",
    "INV-FEEDBACK-EVENT-CROSSCASE",
  ]);
});

test("A6 OPS-03: feedback cannot point at a rehabilitation record that does not exist", () => {
  assert.deepEqual(invariants.inspectPilotTimelineInvariants({
    caseStatus: "active",
    caseSessionCount: 2,
    snapshotRevision: 1,
    events: [{ id: "created", sequence: 1, type: "case_created", payload: {} }],
    feedback: [{ sessionNumber: 3, sourceSessionNumber: 2 }],
  }), ["INV-FEEDBACK-SESSION-MISMATCH"]);
});

test("A6 OPS-03: alert records contain codes and technical IDs only", () => {
  const alert = invariants.buildPilotInvariantAlert({
    codes: ["INV-RETEST-SKIPPED"],
    requestId: "request-a",
    caseId: "case-a",
    sessionId: "session-1",
  });
  assert.deepEqual(alert, {
    codes: ["INV-RETEST-SKIPPED"], requestId: "request-a", caseId: "case-a", sessionId: "session-1",
  });
  assert.doesNotMatch(JSON.stringify(alert), /symptom|complaint|description|message/i);
});

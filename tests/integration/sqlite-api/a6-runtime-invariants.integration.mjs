import assert from "node:assert/strict";
import test from "node:test";
import { completePilotSnapshot, createSqliteApiHarness } from "./support.mjs";

test("A6 OPS-03: production save records invariant codes while logs remain free of health text", async () => {
  const harness = await createSqliteApiHarness("a6-runtime-invariants");
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...items) => warnings.push(items);
  try {
    const created = await harness.create({
      clientCreationId: "creation-invariant",
      accessToken: "access-invariant",
      initialSnapshot: completePilotSnapshot({ step: 0, trainingComplete: false }),
      currentStage: "症状信息",
    });
    assert.equal(created.status, 201);
    const { caseId, accessToken } = created.body.case;

    const saved = await harness.save(caseId, accessToken, {
      requestId: "request-invariant",
      caseId,
      sessionId: "session-1",
      baseRevision: 0,
      expectedRevision: 0,
      snapshot: completePilotSnapshot({ step: 4, trainingComplete: false }),
      eventId: "event-invariant",
      eventType: "session_saved",
      eventPayload: {
        raw: { complaint: "private symptom wording" },
        workflow: {
          projectionInput: {
            intakeComplete: true,
            safetyComplete: true,
            adverseResponse: false,
            planIsCurrent: true,
            assessmentReadyForTreatment: true,
            assessmentNeedsReferral: false,
            queueRefreshing: false,
            pendingAssessmentCheck: false,
            queueLength: 3,
            queueIndex: 1,
            bilateral: false,
            assessmentComplete: true,
            safetySignal: false,
            treatmentWorsened: false,
            trainingComplete: false,
            trainingPlanSaved: false,
          },
        },
      },
      currentStage: "训练居家",
      isBilateral: false,
      hasSafetyStop: false,
      sessionCount: 1,
    });
    assert.equal(saved.status, 200);
    const payload = JSON.parse(saved.body.progress.event.payload);
    assert.deepEqual(payload.technical.invariantCodes, [
      "INV-WORKFLOW-STAGE-BYPASS",
      "INV-RETEST-SKIPPED",
      "INV-QUEUE-EARLY-END",
    ]);
    assert.equal(warnings.length, 1);
    assert.match(JSON.stringify(warnings[0]), /INV-RETEST-SKIPPED|request-invariant|session-1/);
    assert.doesNotMatch(JSON.stringify(warnings[0]), /private symptom wording/);

    const invalidFeedback = await harness.feedback(caseId, accessToken, {
      sessionNumber: 9,
      sourceSessionNumber: 9,
      stage: "评估检查",
      kind: "private feedback wording",
    });
    assert.equal(invalidFeedback.status, 400);
    assert.equal(warnings.length, 2);
    assert.match(JSON.stringify(warnings[1]), /INV-FEEDBACK-SESSION-MISMATCH/);
    assert.doesNotMatch(JSON.stringify(warnings[1]), /private feedback wording/);

    const stale = await harness.save(caseId, accessToken, {
      requestId: "request-stale-invariant",
      caseId,
      sessionId: "session-stale",
      baseRevision: 0,
      expectedRevision: 0,
      snapshot: completePilotSnapshot({ step: 1 }),
      eventId: "event-stale-invariant",
      eventType: "intake_saved",
      eventPayload: { raw: { complaint: "private stale wording" } },
      currentStage: "关键确认",
      sessionCount: 1,
    });
    assert.equal(stale.status, 409);
    assert.match(JSON.stringify(warnings[2]), /INV-REVISION-REGRESSION/);
    assert.doesNotMatch(JSON.stringify(warnings[2]), /private stale wording/);

    assert.equal((await harness.delete(caseId, accessToken)).status, 200);
    assert.equal((await harness.read(caseId, accessToken)).status, 401);
    assert.match(JSON.stringify(warnings[3]), /INV-DELETED-CASE-RESUMED/);
  } finally {
    console.warn = originalWarn;
    await harness.close();
  }
});

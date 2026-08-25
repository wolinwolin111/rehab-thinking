import assert from "node:assert/strict";
import test from "node:test";
import { completePilotSnapshot, createSqliteApiHarness } from "./support.mjs";

test("A6 OPS-04/ADMIN-01: first-use events, case operations, filters, and invariant alerts form privacy-safe metrics", async () => {
  const harness = await createSqliteApiHarness("a6-operational-metrics");
  try {
    assert.equal((await harness.adminCases("", { admin: false })).status, 401);
    assert.equal((await harness.adminLogin("wrong-admin-key")).status, 401);
    const login = await harness.adminLogin("test-admin-key");
    assert.equal(login.status, 200);
    const setCookie = login.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/i);
    assert.doesNotMatch(setCookie, /test-admin-key/);
    assert.equal((await harness.adminCases("", { admin: false, sessionCookie: setCookie })).status, 200);

    assert.equal((await harness.trialEvent({ eventType: "tutorial_skipped", flowId: "flow-metrics-a" })).status, 202);
    assert.equal((await harness.trialEvent({ eventType: "consent_confirmed", flowId: "flow-metrics-a" })).status, 202);

    const created = await harness.create({
      clientCreationId: "creation-metrics-a",
      accessToken: "access-metrics-a",
      firstUseFlowId: "flow-metrics-a",
      initialSnapshot: completePilotSnapshot({ step: 4 }),
      currentStage: "训练居家",
      source: { channel: "xiaohongshu", detail: null },
    });
    assert.equal(created.status, 201);
    const { caseId } = created.body.case;

    const saved = await harness.save(caseId, "access-metrics-a", {
      caseId,
      baseRevision: 0,
      expectedRevision: 0,
      requestId: "request-metrics-a",
      sessionId: "session-metrics-a",
      snapshot: completePilotSnapshot({ step: 5 }),
      eventId: "event-metrics-a",
      eventType: "session_saved",
      eventPayload: {
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
            queueLength: 2,
            queueIndex: 0,
            bilateral: false,
            assessmentComplete: true,
            safetySignal: false,
            treatmentWorsened: false,
            trainingComplete: false,
            trainingPlanSaved: false,
          },
        },
      },
      currentStage: "康复总结",
      sessionCount: 1,
    });
    assert.equal(saved.status, 200);

    assert.equal((await harness.trialEvent({
      eventType: "case_recovered",
      flowId: "flow-metrics-a",
      caseId,
    }, { token: "access-metrics-a" })).status, 202);

    const feedback = await harness.feedback(caseId, "access-metrics-a", {
      sessionNumber: 1,
      stage: "训练居家",
      kind: "flow",
      message: "not included in metrics",
    });
    assert.equal(feedback.status, 201);

    const filtered = await harness.adminCases("status=active&feedbackStatus=open&sessionNumber=1&limit=1");
    assert.equal(filtered.status, 200);
    assert.equal(filtered.body.cases.length, 1);
    assert.equal(filtered.body.page.total, 1);
    assert.deepEqual(filtered.body.cases[0].invariantCodes, [
      "INV-WORKFLOW-STAGE-BYPASS",
      "INV-RETEST-SKIPPED",
      "INV-QUEUE-EARLY-END",
      "INV-TRAINING-GATE-BYPASS",
    ]);
    assert.equal(JSON.stringify(filtered.body).includes("not included in metrics"), false);

    const metrics = await harness.adminMetrics();
    assert.equal(metrics.status, 200);
    assert.equal(metrics.body.metrics.casesCreated, 1);
    assert.deepEqual(metrics.body.metrics.sourceChannels, { xiaohongshu: 1 });
    assert.equal(metrics.body.metrics.tutorial.skipped, 1);
    assert.equal(metrics.body.metrics.consent.confirmed, 1);
    assert.equal(metrics.body.metrics.firstSession.completed, 1);
    assert.equal(metrics.body.metrics.persistence.recovered, 1);
    assert.equal(metrics.body.metrics.feedback.submitted, 1);
    assert.equal(metrics.body.metrics.invariants.totalCases, 1);
    assert.equal(JSON.stringify(metrics.body), JSON.stringify(metrics.body).replace(/not included in metrics/g, ""));
  } finally {
    await harness.close();
  }
});

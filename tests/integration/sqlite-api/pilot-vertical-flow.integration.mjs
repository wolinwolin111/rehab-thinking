import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";
import { completePilotSnapshot, createSqliteApiHarness } from "./support.mjs";

test("TEST-18: source and consent, routes, SQLite, restart, and follow-up form one longitudinal trace", async () => {
  const api = await createSqliteApiHarness("vertical");
  const workflow = await loadTypeScriptModule("./src/features/rehabmind/workflow/workflow-orchestrator.ts");
  const snapshotSchema = await loadTypeScriptModule("./src/infrastructure/pilot/persistence/snapshot-schema.ts");
  try {
    const denied = await api.create({ clientCreationId: "denied-creation", accessToken: "denied-token", source: null, consent: null });
    assert.equal(denied.status, 400);
    assert.equal(denied.body.code, "validation");

    const initialSnapshot = completePilotSnapshot();
    const projection = workflow.projectWorkflowState({
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
      trainingComplete: true,
      trainingPlanSaved: true,
    });
    assert.equal(projection.maxUnlocked, 5);
    assert.ok(projection.ruleIds.includes("WORKFLOW-HANDOFF"));

    const created = await api.create({
      clientCreationId: "vertical-creation",
      accessToken: "vertical-access-token",
      initialSnapshot,
      currentStage: "康复总结",
      isBilateral: false,
      hasSafetyStop: false,
    });
    assert.equal(created.status, 201);
    const access = created.body.case;
    assert.equal(access.revision, 0);
    assert.notEqual(access.versions.appVersion, "unknown");

    const firstSaveBody = {
      requestId: "request-session-1",
      caseId: access.caseId,
      sessionId: "vertical-case:session-1",
      baseRevision: 0,
      expectedRevision: 0,
      snapshot: initialSnapshot,
      eventId: "event-session-1",
      eventType: "session_saved",
      eventPayload: { ruleIds: projection.ruleIds, transition: "training-to-summary" },
      currentStage: "康复总结",
      isBilateral: false,
      hasSafetyStop: false,
      sessionCount: 1,
    };
    const firstSave = await api.save(access.caseId, access.accessToken, firstSaveBody);
    assert.equal(firstSave.status, 200);
    assert.equal(firstSave.body.progress.snapshot.revision, 1);
    assert.equal(firstSave.headers.get("x-pilot-request-id"), "request-session-1");
    assert.deepEqual(firstSave.body.progress.operation, {
      requestId: "request-session-1",
      caseId: access.caseId,
      sessionId: "vertical-case:session-1",
      baseRevision: 0,
    });

    // Simulate a lost response: the exact same request is replayed after the write committed.
    const replay = await api.save(access.caseId, access.accessToken, firstSaveBody);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.progress.snapshot.revision, 1);

    api.restart();
    const restored = await api.read(access.caseId, access.accessToken);
    assert.equal(restored.status, 200);
    assert.equal(restored.body.case.snapshot.revision, 1);
    const migrated = snapshotSchema.migratePilotSnapshot(restored.body.case.snapshot.payload);
    assert.equal(migrated.ok, true);
    assert.equal(migrated.snapshot.sessionNumber, 1);

    const followupDecision = workflow.orchestrateWorkflowNavigation({
      currentStep: 5,
      maxUnlocked: 5,
      event: { type: "followup-started", sessionNumber: 2, priorSessionExists: true },
    });
    assert.equal(followupDecision.allowed, true);
    assert.equal(followupDecision.transition.to, "followup-review");
    assert.deepEqual(followupDecision.commands, [{ type: "start-followup", sessionNumber: 2 }]);

    const followupSnapshot = completePilotSnapshot({
      step: 4,
      followupMode: true,
      sessionNumber: 2,
      followupScore: 2,
      followupScoreHistory: [2],
      followupStage: "review",
    });
    const followupSave = await api.save(access.caseId, access.accessToken, {
      requestId: "request-session-2",
      caseId: access.caseId,
      sessionId: "vertical-case:session-2",
      baseRevision: 1,
      expectedRevision: 1,
      snapshot: followupSnapshot,
      eventId: "event-session-2",
      eventType: "session_saved",
      eventPayload: { ruleIds: followupDecision.ruleIds, transition: followupDecision.transition },
      currentStage: "训练居家",
      isBilateral: false,
      hasSafetyStop: false,
      sessionCount: 2,
    });
    assert.equal(followupSave.status, 200);
    assert.equal(followupSave.body.progress.snapshot.revision, 2);

    const feedback = await api.feedback(access.caseId, access.accessToken, {
      eventId: "event-session-1",
      sessionNumber: 1,
      stage: "康复总结",
      kind: "流程问题",
      message: "fixture feedback",
      sourceSessionNumber: 2,
      sourceStage: "训练居家",
      sourceEventId: "event-session-2",
    });
    assert.equal(feedback.status, 201);

    const admin = await api.adminByPublicCode(access.publicCode);
    assert.equal(admin.status, 200);
    assert.equal(admin.body.case.snapshot.revision, 2);
    assert.deepEqual(admin.body.case.events.map((event) => event.sequence), [1, 2, 3, 4]);
    assert.equal(admin.body.case.feedback[0].sessionNumber, 1);
    assert.equal(admin.body.case.feedback[0].sourceSessionNumber, 2);
    const savedEventPayload = admin.body.case.events.find((event) => event.id === "event-session-2").payload;
    assert.equal(savedEventPayload.technical.requestId, "request-session-2");
    assert.equal(savedEventPayload.technical.baseRevision, 1);

    const publicCodeRead = await api.read(access.publicCode, access.accessToken);
    assert.equal(publicCodeRead.status, 404);

    const rows = api.inspect((sqlite) => ({
      cases: sqlite.prepare("SELECT count(*) AS count FROM pilot_cases").get().count,
      revisions: sqlite.prepare("SELECT revision FROM case_snapshots WHERE case_id = ?").get(access.caseId).revision,
      events: sqlite.prepare("SELECT count(*) AS count FROM case_events WHERE case_id = ?").get(access.caseId).count,
      feedback: sqlite.prepare("SELECT count(*) AS count FROM case_feedback WHERE case_id = ?").get(access.caseId).count,
    }));
    assert.deepEqual(rows, { cases: 1, revisions: 2, events: 4, feedback: 1 });
  } finally {
    await api.close();
  }
});

test("A5 SQLite/API: stale writes, invalid snapshots, deletion, and case isolation have deterministic exits", async () => {
  const api = await createSqliteApiHarness("isolation");
  try {
    const makeCase = async (suffix) => {
      const response = await api.create({
        clientCreationId: `creation-${suffix}`,
        accessToken: `token-${suffix}`,
        initialSnapshot: completePilotSnapshot({ intake: { regionId: "knee", description: suffix } }),
      });
      assert.equal(response.status, 201);
      return response.body.case;
    };
    const first = await makeCase("first");
    const second = await makeCase("second");

    assert.equal((await api.read(first.caseId, second.accessToken)).status, 401);
    assert.equal((await api.read(first.publicCode, first.accessToken)).status, 404);

    const invalid = await api.save(first.caseId, first.accessToken, {
      requestId: "invalid-request",
      caseId: first.caseId,
      sessionId: "first:session-1",
      baseRevision: 0,
      expectedRevision: 0,
      snapshot: { schemaVersion: 99, step: 4 },
      eventId: "invalid-event",
      eventType: "session_saved",
      eventPayload: {},
      sessionCount: 1,
    });
    assert.equal(invalid.status, 400);
    assert.equal((await api.read(first.caseId, first.accessToken)).body.case.snapshot.revision, 0);

    const progress = (suffix) => ({
      requestId: `race-${suffix}`,
      caseId: first.caseId,
      sessionId: "first:session-1",
      baseRevision: 0,
      expectedRevision: 0,
      snapshot: completePilotSnapshot({ intake: { regionId: "knee", description: `race-${suffix}` } }),
      eventId: `race-event-${suffix}`,
      eventType: "session_saved",
      eventPayload: { suffix },
      sessionCount: 1,
    });
    const race = await Promise.all([
      api.save(first.caseId, first.accessToken, progress("a")),
      api.save(first.caseId, first.accessToken, progress("b")),
    ]);
    assert.deepEqual(race.map((item) => item.status).sort(), [200, 409]);

    const deleted = await api.delete(first.caseId, first.accessToken);
    assert.equal(deleted.status, 200);
    const late = await api.save(first.caseId, first.accessToken, {
      ...progress("late"),
      baseRevision: 1,
      expectedRevision: 1,
    });
    assert.equal(late.status, 401);
    assert.equal((await api.read(second.caseId, second.accessToken)).status, 200);

    const rows = api.inspect((sqlite) => ({
      firstStatus: sqlite.prepare("SELECT status FROM pilot_cases WHERE id = ?").get(first.caseId).status,
      firstRevision: sqlite.prepare("SELECT revision FROM case_snapshots WHERE case_id = ?").get(first.caseId).revision,
      secondRevision: sqlite.prepare("SELECT revision FROM case_snapshots WHERE case_id = ?").get(second.caseId).revision,
      firstEvents: sqlite.prepare("SELECT count(*) AS count FROM case_events WHERE case_id = ?").get(first.caseId).count,
      secondEvents: sqlite.prepare("SELECT count(*) AS count FROM case_events WHERE case_id = ?").get(second.caseId).count,
    }));
    assert.equal(rows.firstStatus, "deleted");
    assert.equal(rows.firstRevision, 1);
    assert.equal(rows.secondRevision, 0);
    assert.equal(rows.firstEvents, 3);
    assert.equal(rows.secondEvents, 1);
  } finally {
    await api.close();
  }
});

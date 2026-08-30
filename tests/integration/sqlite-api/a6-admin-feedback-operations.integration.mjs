import assert from "node:assert/strict";
import test from "node:test";
import { completePilotSnapshot, createSqliteApiHarness } from "./support.mjs";

test("A6 FEED-01/ADMIN-02: feedback context, status, notes, redacted export, and admin deletion form one operational trace", async () => {
  const harness = await createSqliteApiHarness("a6-admin-feedback");
  try {
    const created = await harness.create({
      clientCreationId: "creation-admin-flow",
      accessToken: "access-admin-flow",
      initialSnapshot: completePilotSnapshot({
        domain: { intake: { description: "private symptom wording", baselineScore: 4, baselineScoreConfirmed: true } },
      }),
      currentStage: "康复总结",
    });
    assert.equal(created.status, 201);
    const { caseId, publicCode } = created.body.case;

    const initial = await harness.adminByPublicCode(publicCode);
    assert.equal(initial.status, 200);
    const sourceEventId = initial.body.case.events[0].id;
    const feedback = await harness.feedback(caseId, "access-admin-flow", {
      sessionNumber: 1,
      stage: "评估检查",
      kind: "flow",
      message: "private feedback wording",
      eventId: sourceEventId,
      sourceSessionNumber: 1,
      sourceStage: "康复总结",
      sourceEventId,
    });
    assert.equal(feedback.status, 201);
    const feedbackId = feedback.body.feedback.id;

    const detail = await harness.adminCase(caseId);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.case.feedback[0].status, "open");
    assert.equal(detail.body.case.feedback[0].sessionNumber, 1);
    assert.equal(detail.body.case.feedback[0].stage, "评估检查");
    assert.equal(detail.body.case.feedback[0].sourceStage, "康复总结");
    assert.equal(detail.body.case.feedback[0].sourceEventId, sourceEventId);
    assert.match(detail.body.case.feedback[0].appVersion, /^rehabmind-pilot-app-/);
    assert.deepEqual(detail.body.case.adminNotes, []);

    assert.equal((await harness.adminCases("status=unknown")).status, 400);
    assert.equal((await harness.adminCases("cursor=%25")).status, 400);

    const note = await harness.adminPatch(caseId, { action: "add-note", note: "已复现，等待规则修复" });
    assert.equal(note.status, 200);
    assert.equal(note.body.note.note, "已复现，等待规则修复");
    assert.equal((await harness.read(caseId, "access-admin-flow")).body.case.adminNotes, undefined);
    assert.equal((await harness.read(caseId, "access-admin-flow")).body.case.adminAudit, undefined);

    assert.equal((await harness.adminCase(caseId, "", { admin: false })).status, 401);

    const another = await harness.create({
      clientCreationId: "creation-admin-other",
      accessToken: "access-admin-other",
      initialSnapshot: completePilotSnapshot(),
      currentStage: "康复总结",
    });
    assert.equal(another.status, 201);
    const crossCase = await harness.adminPatch(another.body.case.caseId, { action: "update-feedback", feedbackId, status: "resolved" });
    assert.equal(crossCase.status, 404);

    const invalidStatus = await harness.adminPatch(caseId, { action: "update-feedback", feedbackId, status: "anything" });
    assert.equal(invalidStatus.status, 400);

    const resolved = await harness.adminPatch(caseId, { action: "update-feedback", feedbackId, status: "resolved" });
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.feedback.status, "resolved");

    const exported = await harness.adminCase(caseId, "format=redacted");
    assert.equal(exported.status, 200);
    const serialized = JSON.stringify(exported.body);
    assert.doesNotMatch(serialized, /access-admin-flow|private symptom wording|private feedback wording/);
    assert.doesNotMatch(serialized, /accessTokenHash|inviteTokenHash/);
    assert.equal(exported.body.export.caseRecord.publicCode, publicCode);

    const deleted = await harness.adminDelete(caseId);
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.case.status, "deleted");
    assert.equal((await harness.read(caseId, "access-admin-flow")).status, 401);
    const deletedDetail = await harness.adminCase(caseId);
    assert.equal(deletedDetail.body.case.events.at(-1).source, "admin");
    assert.match(deletedDetail.body.case.events.at(-1).appVersion, /^rehabmind-pilot-app-/);
    const auditActions = deletedDetail.body.case.adminAudit.map((event) => event.action);
    for (const action of ["case_full_viewed", "note_added", "feedback_status_updated", "case_exported", "case_deleted"]) {
      assert.ok(auditActions.includes(action), `missing admin audit action ${action}`);
    }
    assert.doesNotMatch(JSON.stringify(deletedDetail.body.case.adminAudit), /已复现，等待规则修复|private symptom wording/);
  } finally {
    await harness.close();
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";
import { applyPilotMigrations, completePilotSnapshot } from "./support.mjs";

async function fixture(label, faultPoint) {
  const directory = await mkdtemp(path.join(os.tmpdir(), `rehabmind-${label}-`));
  const databasePath = path.join(directory, "pilot.sqlite");
  await applyPilotMigrations(databasePath);
  const { SqlitePilotCaseRepository } = await loadTypeScriptModule("./db/sqlite/sqlite-pilot-case-repository.ts");
  const { PilotCaseService } = await loadTypeScriptModule("./src/infrastructure/pilot/services/case-service.ts");
  let enabled = false;
  const repository = SqlitePilotCaseRepository.open(databasePath, {
    faultInjector: (point) => {
      if (enabled && point === faultPoint) throw new Error(`injected:${point}`);
    },
  });
  let id = 0;
  const service = new PilotCaseService({
    repository,
    versions: { appVersion: "app", knowledgeVersion: "knowledge", decisionVersion: "decision" },
    now: () => "2026-08-24T00:00:00.000Z",
    createId: () => `id-${++id}`,
    createPublicCode: () => "FAULT001",
    hashAccessToken: async (token) => `hash:${token}`,
  });
  const initialSnapshot = completePilotSnapshot();
  const access = await service.createCase({
    source: { channel: "douyin_fan_group", detail: null },
    consent: initialSnapshot.consent,
    clientCreationId: `creation-${label}`,
    accessToken: `token-${label}`,
    initialSnapshot,
    currentStage: "康复总结",
  });
  enabled = true;
  return {
    directory,
    databasePath,
    repository,
    service,
    access,
    async close() {
      repository.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

test("A5 DB-01: an exception between snapshot and event writes rolls back the whole progress transaction", async () => {
  const testCase = await fixture("save-fault", "save-after-snapshot");
  try {
    await assert.rejects(testCase.service.saveProgress({
      caseId: testCase.access.caseId,
      accessToken: testCase.access.accessToken,
      expectedRevision: 0,
      snapshot: completePilotSnapshot({ step: 4 }),
      eventId: "fault-event",
      eventType: "session_saved",
      eventPayload: {},
      currentStage: "训练居家",
      sessionCount: 1,
    }), /injected:save-after-snapshot/);
    const snapshot = await testCase.repository.getSnapshot(testCase.access.caseId);
    const record = await testCase.repository.getCaseById(testCase.access.caseId);
    const events = await testCase.repository.getEventsByCaseId(testCase.access.caseId);
    assert.equal(snapshot.revision, 0);
    assert.equal(record.currentStage, "康复总结");
    assert.deepEqual(events.map((event) => event.type), ["case_created"]);
  } finally {
    await testCase.close();
  }
});

test("A5 DB-01: an exception between feedback and timeline writes leaves neither row", async () => {
  const testCase = await fixture("feedback-fault", "feedback-after-record");
  try {
    await assert.rejects(testCase.service.submitFeedback({
      caseId: testCase.access.caseId,
      accessToken: testCase.access.accessToken,
      sessionNumber: 1,
      stage: "康复总结",
      kind: "fixture",
    }), /injected:feedback-after-record/);
    assert.equal((await testCase.repository.getFeedbackByCaseId(testCase.access.caseId)).length, 0);
    assert.deepEqual((await testCase.repository.getEventsByCaseId(testCase.access.caseId)).map((event) => event.type), ["case_created"]);
  } finally {
    await testCase.close();
  }
});

test("A5 DB-01: SQLITE_BUSY reports failure without advancing revision or timeline", async () => {
  const testCase = await fixture("busy", "never");
  const locker = new Database(testCase.databasePath);
  try {
    testCase.repository.sqlite.pragma("busy_timeout = 5");
    locker.pragma("journal_mode = WAL");
    locker.exec("BEGIN IMMEDIATE");
    await assert.rejects(testCase.service.saveProgress({
      caseId: testCase.access.caseId,
      accessToken: testCase.access.accessToken,
      expectedRevision: 0,
      snapshot: completePilotSnapshot({ step: 4 }),
      eventId: "busy-event",
      eventType: "session_saved",
      eventPayload: {},
      sessionCount: 1,
    }), /locked|busy/i);
    locker.exec("ROLLBACK");
    assert.equal((await testCase.repository.getSnapshot(testCase.access.caseId)).revision, 0);
    assert.deepEqual((await testCase.repository.getEventsByCaseId(testCase.access.caseId)).map((event) => event.type), ["case_created"]);
  } finally {
    if (locker.inTransaction) locker.exec("ROLLBACK");
    locker.close();
    await testCase.close();
  }
});

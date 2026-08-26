import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

async function applyMigrations(databasePath) {
  const sqlite = new Database(databasePath);
  try {
    for (const name of ["0000_worried_lyja.sql", "0001_ambiguous_killraven.sql", "0002_stale_silhouette.sql", "0003_operational_invites.sql", "0004_feedback_operations.sql", "0005_trial_operations.sql", "0006_admin_audit.sql", "0007_source_and_consent.sql", "0008_test_case_isolation.sql", "0009_clinical_event_identity.sql"]) {
      const sql = await readFile(path.resolve("drizzle", name), "utf8");
      sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));
    }
  } finally {
    sqlite.close();
  }
}

test("A5 DB-01: SQLite repository has one process-level connection and an explicit close", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "rehabmind-a5-lifecycle-"));
  const databasePath = path.join(directory, "pilot.sqlite");
  await applyMigrations(databasePath);
  process.env.PILOT_DB_DRIVER = "sqlite";
  process.env.PILOT_SQLITE_PATH = databasePath;

  const shared = await loadTypeScriptModule("./app/api/pilot/_shared.ts");
  try {
    const repositories = await Promise.all(Array.from({ length: 100 }, () => shared.createPilotCaseRepository()));
    const first = repositories[0];
    assert.equal(repositories.every((repository) => repository === first), true);
    assert.equal(typeof shared.closePilotCaseRepository, "function");
    shared.closePilotCaseRepository();
    assert.equal(first.sqlite.open, false);

    const reopened = await shared.createPilotCaseRepository();
    assert.notEqual(reopened, first);
    assert.equal(reopened.sqlite.open, true);
  } finally {
    shared.closePilotCaseRepository?.();
    await rm(directory, { recursive: true, force: true });
  }
});

test("A5 DB-01: hard purge removes the case and all referencing rows atomically", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "rehabmind-a5-purge-"));
  const databasePath = path.join(directory, "pilot.sqlite");
  await applyMigrations(databasePath);
  const { SqlitePilotCaseRepository } = await loadTypeScriptModule("./db/sqlite/sqlite-pilot-case-repository.ts");
  const { PilotCaseService } = await loadTypeScriptModule("./src/infrastructure/pilot/services/case-service.ts");
  const repository = SqlitePilotCaseRepository.open(databasePath);
  const ids = ["case-a", "event-created", "feedback-event", "feedback-a", "delete-event"];
  let idIndex = 0;
  const service = new PilotCaseService({
    repository,
    versions: { appVersion: "app-a", knowledgeVersion: "knowledge-a", decisionVersion: "decision-a" },
    now: () => "2026-08-24T00:00:00.000Z",
    createId: () => ids[idIndex++],
    createPublicCode: () => "PUBLIC01",
    hashAccessToken: async (token) => `hash:${token}`,
  });
  const snapshot = {
    schemaVersion: 1,
    consent: { version: "pilot-consent-v1", confirmedAt: "2026-08-24T00:00:00.000Z" },
    step: 0,
    intake: { regionId: "knee", description: "test" },
    safety: {}, imaging: [], assessmentIndex: 0, assessmentResults: {}, trialTargetIndex: 0,
    candidateIndex: 0, trialRecords: [], postScore: 0, movementResponse: "", exerciseFeedback: {},
    trainingComplete: false, followupMode: false, sessionNumber: 1, followupScore: 0,
    followupScoreHistory: [], followupStage: "review", followupPostScore: 0, followupCandidateId: "",
    followupTrialRecords: [], followupExerciseChoices: {}, followupTrends: {},
  };

  try {
    const access = await service.createCase({ clientCreationId: "creation-a", accessToken: "token-a", initialSnapshot: snapshot, source: { channel: "douyin_fan_group", detail: null }, consent: snapshot.consent });
    await service.saveProgress({
      caseId: access.caseId, accessToken: access.accessToken, expectedRevision: 0, snapshot,
      eventId: "event-progress", eventType: "session_saved", eventPayload: {}, sessionCount: 1,
    });
    await service.submitFeedback({
      caseId: access.caseId, accessToken: access.accessToken, eventId: "event-progress",
      sourceEventId: "event-progress", sessionNumber: 1, sourceSessionNumber: 1,
      stage: "康复总结", sourceStage: "康复总结", kind: "flow",
    });
    repository.sqlite.prepare("INSERT INTO knowledge_gap_candidates (id, case_id, source_event_id, category, label, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run("gap-a", access.caseId, "event-progress", "flow", "gap", "observed", "2026-08-24T00:00:00.000Z");
    repository.sqlite.prepare("INSERT INTO pilot_trial_events (id, dedupe_key, flow_id, event_type, case_id, app_version, knowledge_version, decision_version, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run("trial-a", "flow-a:case_recovered:case-a", "flow-a", "case_recovered", access.caseId, "app-a", "knowledge-a", "decision-a", "2026-08-24T00:00:00.000Z");
    repository.sqlite.prepare("INSERT INTO pilot_admin_audit (id, case_id, action, app_version, knowledge_version, decision_version, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run("audit-a", access.caseId, "case_full_viewed", "app-a", "knowledge-a", "decision-a", "2026-08-24T00:00:00.000Z");
    await service.deleteCase({ caseId: access.caseId, accessToken: access.accessToken });
    assert.equal(await service.purgeCases({ deletedBeforeDays: 0 }), 1);
    for (const table of ["pilot_cases", "case_snapshots", "case_events", "case_feedback", "knowledge_gap_candidates", "pilot_trial_events", "pilot_admin_audit"]) {
      assert.equal(repository.sqlite.prepare(`SELECT count(*) AS count FROM ${table}`).get().count, 0, table);
    }
  } finally {
    if (repository.close) repository.close();
    else if (repository.sqlite.open) repository.sqlite.close();
    await rm(directory, { recursive: true, force: true });
  }
});

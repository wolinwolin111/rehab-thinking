import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { applySqliteMigrations } from "../../../scripts/data/sqlite-migration-core.mjs";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

async function migration(name) {
  return { id: name, sql: await readFile(path.resolve("drizzle", name), "utf8") };
}

test("A5 SQLite migrations are idempotent and a failed multi-statement migration rolls back", () => {
  const sqlite = new Database(":memory:");
  try {
    const base = { id: "base.sql", sql: "CREATE TABLE base_table (id TEXT PRIMARY KEY);" };
    assert.equal(applySqliteMigrations(sqlite, [base])[0].status, "applied");
    assert.equal(applySqliteMigrations(sqlite, [base])[0].status, "already-applied");
    assert.throws(() => applySqliteMigrations(sqlite, [{
      id: "broken.sql",
      sql: "CREATE TABLE must_rollback (id TEXT);--> statement-breakpoint\nTHIS IS NOT SQL;",
    }]));
    assert.equal(sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='must_rollback'").get(), undefined);
    assert.equal(sqlite.prepare("SELECT count(*) AS count FROM pilot_migrations_applied").get().count, 1);
  } finally {
    sqlite.close();
  }
});

test("A5 an old 0000 SQLite database upgrades through current migrations and remains readable", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "rehabmind-a5-migration-"));
  const databasePath = path.join(directory, "old.sqlite");
  const sqlite = new Database(databasePath);
  try {
    applySqliteMigrations(sqlite, [await migration("0000_worried_lyja.sql")]);
    sqlite.prepare(`INSERT INTO pilot_cases (
      id, public_code, access_token_hash, status, current_stage, is_trial, is_bilateral,
      has_safety_stop, session_count, app_version, knowledge_version, decision_version,
      created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, 'active', ?, 1, 0, 0, 1, ?, ?, ?, ?, ?, NULL)`).run(
      "legacy-case", "LEGACY01", "hash", "康复总结", "app-old", "knowledge-old", "decision-old",
      "2026-08-20T00:00:00.000Z", "2026-08-20T00:00:00.000Z",
    );
    sqlite.prepare("INSERT INTO case_snapshots (case_id, revision, payload, created_at, updated_at) VALUES (?, 0, ?, ?, ?)").run(
      "legacy-case", JSON.stringify({ schemaVersion: 1, step: 0 }),
      "2026-08-20T00:00:00.000Z", "2026-08-20T00:00:00.000Z",
    );
    applySqliteMigrations(sqlite, [
      await migration("0001_ambiguous_killraven.sql"),
      await migration("0002_stale_silhouette.sql"),
      await migration("0003_operational_invites.sql"),
      await migration("0004_feedback_operations.sql"),
      await migration("0005_trial_operations.sql"),
      await migration("0006_admin_audit.sql"),
      await migration("0007_source_and_consent.sql"),
      await migration("0008_test_case_isolation.sql"),
    ]);
    const migrated = sqlite.prepare("SELECT client_creation_id FROM pilot_cases WHERE id = ?").get("legacy-case");
    assert.equal(migrated.client_creation_id, "legacy-legacy-case");
    assert.equal(sqlite.prepare("PRAGMA table_info(case_feedback)").all().some((column) => column.name === "source_event_id"), true);
    assert.equal(sqlite.prepare("PRAGMA table_info(pilot_cases)").all().some((column) => column.name === "invite_source"), true);
    assert.equal(sqlite.prepare("PRAGMA table_info(case_feedback)").all().some((column) => column.name === "app_version"), true);
    assert.equal(sqlite.prepare("PRAGMA table_info(pilot_cases)").all().some((column) => column.name === "first_use_flow_id"), true);
    assert.equal(sqlite.prepare("PRAGMA table_info(pilot_cases)").all().some((column) => column.name === "source_channel"), true);
    assert.equal(sqlite.prepare("PRAGMA table_info(pilot_cases)").all().some((column) => column.name === "consent_confirmed_at"), true);
    assert.equal(sqlite.prepare("PRAGMA table_info(pilot_cases)").all().some((column) => column.name === "is_test_case"), true);
    assert.equal(sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='pilot_trial_events'").get()["1"], 1);
    assert.equal(sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='pilot_admin_audit'").get()["1"], 1);
  } finally {
    sqlite.close();
  }

  const { SqlitePilotCaseRepository } = await loadTypeScriptModule("./db/sqlite/sqlite-pilot-case-repository.ts");
  const repository = SqlitePilotCaseRepository.open(databasePath);
  try {
    const record = await repository.getCaseById("legacy-case");
    const snapshot = await repository.getSnapshot("legacy-case");
    assert.equal(record.clientCreationId, "legacy-legacy-case");
    assert.equal(snapshot.revision, 0);
  } finally {
    repository.close();
    await rm(directory, { recursive: true, force: true });
  }
});

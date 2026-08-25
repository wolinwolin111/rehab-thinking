import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { applySqliteMigrations } from "./sqlite-migration-core.mjs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const root = path.resolve(import.meta.dirname, "../..");
const temporaryRoot = process.env.PILOT_SQLITE_PATH ? null : mkdtempSync(path.join(os.tmpdir(), "rehabmind-health-"));
const databasePath = process.env.PILOT_SQLITE_PATH || path.join(temporaryRoot, "health.sqlite");
const database = new Database(databasePath);

try {
  database.pragma("foreign_keys = ON");
  if (temporaryRoot || process.env.SQLITE_HEALTH_APPLY_MIGRATIONS === "1") {
    const drizzleDir = path.join(root, "drizzle");
    const migrations = readdirSync(drizzleDir)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map((id) => ({ id, sql: readFileSync(path.join(drizzleDir, id), "utf8") }));
    applySqliteMigrations(database, migrations);
  }
  const integrity = database.pragma("integrity_check");
  const foreignKeyFailures = database.pragma("foreign_key_check");
  const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
  const requiredTables = [
    "pilot_cases", "case_snapshots", "case_events", "case_feedback",
    "app_releases", "knowledge_releases", "decision_releases",
    "admin_notes", "pilot_trial_events", "pilot_admin_audit", "knowledge_gap_candidates",
  ];
  const missingTables = requiredTables.filter((table) => !tables.has(table));
  const result = {
    database: temporaryRoot ? "temporary" : "configured",
    integrity: integrity.map((row) => row.integrity_check),
    foreignKeyFailures: foreignKeyFailures.length,
    missingTables,
    migrationCount: database.prepare("SELECT COUNT(*) AS count FROM pilot_migrations_applied").get().count,
  };
  console.log(JSON.stringify(result));
  if (result.integrity.length !== 1 || result.integrity[0] !== "ok" || result.foreignKeyFailures || result.missingTables.length) process.exitCode = 1;
} finally {
  database.close();
  if (temporaryRoot) rmSync(temporaryRoot, { recursive: true, force: true });
}

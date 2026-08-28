import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const root = path.resolve(import.meta.dirname, "../..");
const dataDirectory = path.join(root, "data");
const databasePath = path.join(dataDirectory, "rehabmind.sqlite");
const backupDirectory = path.join(dataDirectory, "backups");
const apply = process.argv.includes("--apply");

const runtimeTables = [
  "knowledge_gap_candidates",
  "case_feedback",
  "admin_notes",
  "case_events",
  "case_snapshots",
  "pilot_cases",
  "pilot_trial_events",
  "pilot_admin_audit",
];
const preservedTables = [
  "app_releases",
  "knowledge_releases",
  "decision_releases",
  "pilot_migrations_applied",
];

function tableNames(database) {
  return new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
}

function counts(database, names) {
  const available = tableNames(database);
  return Object.fromEntries(names.map((name) => [name, available.has(name)
    ? database.prepare(`SELECT COUNT(*) AS count FROM "${name}"`).get().count
    : null]));
}

function integrity(database) {
  return database.pragma("integrity_check").map((row) => row.integrity_check);
}

const database = new Database(databasePath);
database.pragma("foreign_keys = ON");
const before = {
  runtime: counts(database, runtimeTables),
  preserved: counts(database, preservedTables),
  integrity: integrity(database),
  foreignKeyFailures: database.pragma("foreign_key_check").length,
};

if (!apply) {
  console.log(JSON.stringify({ mode: "dry-run", database: databasePath, before }, null, 2));
  database.close();
  process.exit(0);
}

mkdirSync(backupDirectory, { recursive: true });
database.pragma("wal_checkpoint(TRUNCATE)");
const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const backupPath = path.join(backupDirectory, `rehabmind-before-v3-${timestamp}.sqlite`);
await database.backup(backupPath);

const backup = new Database(backupPath, { readonly: true });
const backupCheck = {
  runtime: counts(backup, runtimeTables),
  preserved: counts(backup, preservedTables),
  integrity: integrity(backup),
  foreignKeyFailures: backup.pragma("foreign_key_check").length,
};
backup.close();
if (JSON.stringify(backupCheck.runtime) !== JSON.stringify(before.runtime)
  || JSON.stringify(backupCheck.preserved) !== JSON.stringify(before.preserved)
  || backupCheck.integrity.length !== 1
  || backupCheck.integrity[0] !== "ok"
  || backupCheck.foreignKeyFailures !== 0) {
  database.close();
  throw new Error(`v3 reset aborted: backup verification failed (${backupPath})`);
}

database.transaction(() => {
  const available = tableNames(database);
  for (const table of runtimeTables) {
    if (available.has(table)) database.prepare(`DELETE FROM "${table}"`).run();
  }
})();

const after = {
  runtime: counts(database, runtimeTables),
  preserved: counts(database, preservedTables),
  integrity: integrity(database),
  foreignKeyFailures: database.pragma("foreign_key_check").length,
};
database.close();
if (Object.values(after.runtime).some((count) => count !== 0)
  || after.integrity.length !== 1
  || after.integrity[0] !== "ok"
  || after.foreignKeyFailures !== 0) {
  throw new Error(`v3 reset completed with an invalid database; restore ${backupPath}`);
}

console.log(JSON.stringify({ mode: "applied", database: databasePath, backup: backupPath, before, backupCheck, after }, null, 2));

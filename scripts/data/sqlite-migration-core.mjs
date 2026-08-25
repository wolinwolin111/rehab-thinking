import { createHash } from "node:crypto";

export function splitSqliteMigrationStatements(sql) {
  return sql
    .split(/-->[\s-]*statement-breakpoint[\s;]*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function migrationKey(id, sql) {
  return `${id}:${createHash("sha256").update(sql).digest("hex")}`;
}

export function applySqliteMigrations(db, migrations) {
  db.exec("CREATE TABLE IF NOT EXISTS pilot_migrations_applied (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL DEFAULT (datetime('now')))");
  const hasMigration = db.prepare("SELECT 1 FROM pilot_migrations_applied WHERE hash IN (?, ?) LIMIT 1");
  const recordMigration = db.prepare("INSERT INTO pilot_migrations_applied (hash) VALUES (?)");
  const results = [];

  for (const migration of migrations) {
    const key = migrationKey(migration.id, migration.sql);
    if (hasMigration.get(migration.id, key)) {
      results.push({ id: migration.id, key, status: "already-applied", statements: 0 });
      continue;
    }
    const statements = splitSqliteMigrationStatements(migration.sql);
    const run = db.transaction(() => {
      for (const statement of statements) db.exec(statement);
      recordMigration.run(key);
    });
    run();
    results.push({ id: migration.id, key, status: "applied", statements: statements.length });
  }

  return results;
}

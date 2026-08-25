#!/usr/bin/env node
/**
 * 把 drizzle/ 下的 SQLite 迁移按文件名顺序应用到 better-sqlite3 数据库。
 *
 * - 用 `sqlite_migrations_applied(hash)` 表做幂等：已应用过的文件跳过。
 * - drizzle 产物以 `--> statement-breakpoint` 分隔语句，需拆分后逐条执行。
 * - 用法：PILOT_SQLITE_PATH=./data/rehabmind.sqlite node scripts/migrate-sqlite.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const databasePath = process.env.PILOT_SQLITE_PATH ?? "./data/rehabmind.sqlite";
const drizzleDir = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle");

require("node:fs").mkdirSync(dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec("CREATE TABLE IF NOT EXISTS pilot_migrations_applied (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL DEFAULT (datetime('now')))");

const files = readdirSync(drizzleDir).filter((name) => name.endsWith(".sql")).sort();
let applied = 0;
for (const file of files) {
  const already = db.prepare("SELECT 1 FROM pilot_migrations_applied WHERE hash = ?").get(file);
  if (already) continue;
  const raw = readFileSync(join(drizzleDir, file), "utf8");
  const statements = raw
    .split(/-->[\s-]*statement-breakpoint[\s;]*/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const run = db.transaction(() => {
    for (const statement of statements) db.exec(statement);
    db.prepare("INSERT INTO pilot_migrations_applied (hash) VALUES (?)").run(file);
  });
  run();
  applied += 1;
  console.log(`applied ${file} (${statements.length} statements)`);
}
const total = db.prepare("SELECT COUNT(*) AS n FROM pilot_migrations_applied").get();
console.log(`migrations complete: ${applied} newly applied, ${total.n} total on ${databasePath}`);
db.close();

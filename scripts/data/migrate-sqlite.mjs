#!/usr/bin/env node
/**
 * 把 drizzle/ 下的 SQLite 迁移按文件名顺序应用到 better-sqlite3 数据库。
 *
 * - 用 `sqlite_migrations_applied(hash)` 表做幂等：已应用过的文件跳过。
 * - drizzle 产物以 `--> statement-breakpoint` 分隔语句，需拆分后逐条执行。
 * - 用法：PILOT_SQLITE_PATH=./data/rehabmind.sqlite node scripts/data/migrate-sqlite.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { applySqliteMigrations } from "./sqlite-migration-core.mjs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const databasePath = process.env.PILOT_SQLITE_PATH ?? "./data/rehabmind.sqlite";
const drizzleDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "drizzle");

require("node:fs").mkdirSync(dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
const files = readdirSync(drizzleDir).filter((name) => name.endsWith(".sql")).sort();
const results = applySqliteMigrations(db, files.map((file) => ({ id: file, sql: readFileSync(join(drizzleDir, file), "utf8") })));
for (const result of results.filter((item) => item.status === "applied")) {
  console.log(`applied ${result.id} (${result.statements} statements)`);
}
const total = db.prepare("SELECT COUNT(*) AS n FROM pilot_migrations_applied").get();
console.log(`migrations complete: ${results.filter((item) => item.status === "applied").length} newly applied, ${total.n} total on ${databasePath}`);
db.close();

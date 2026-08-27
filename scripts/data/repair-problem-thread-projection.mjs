/**
 * 修复普通问诊编辑曾错误写入的瞬时问题链投影。
 *
 * 默认只输出 dry-run 报告；只有显式传入 --apply 才会写数据库。
 * case_events 是不可变审计历史，本工具不删除也不改写事件。
 *
 * 用法：
 *   node scripts/data/repair-problem-thread-projection.mjs --case=ME2RLABN
 *   node scripts/data/repair-problem-thread-projection.mjs --known-cases
 *   node scripts/data/repair-problem-thread-projection.mjs --known-cases --apply
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const KNOWN_CASES = ["ME2RLABN", "S2SDVHES", "TEST-GAR5S6N4"];
const TRANSIENT_LIFETIME_MS = 5 * 60 * 1000;
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const databaseArgument = process.argv.slice(2).find((arg) => arg.startsWith("--database="));
const caseArguments = process.argv.slice(2)
  .filter((arg) => arg.startsWith("--case="))
  .map((arg) => arg.slice("--case=".length).trim())
  .filter(Boolean);
const publicCodes = args.has("--known-cases") ? KNOWN_CASES : caseArguments;
const databasePath = path.resolve(databaseArgument?.slice("--database=".length) || process.env.PILOT_SQLITE_PATH || "./data/rehabmind.sqlite");

if (!publicCodes.length) {
  throw new Error("请用 --case=案例编号 指定案例，或使用 --known-cases。工具默认只做 dry-run。");
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectClinicalIdentityReferences(snapshot) {
  const problemThreadIds = new Set();
  const sessionIds = new Set();
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isObject(value)) return;
    if (typeof value.problemThreadId === "string" && value.problemThreadId.trim()) problemThreadIds.add(value.problemThreadId);
    if (typeof value.sessionId === "string" && value.sessionId.trim()) sessionIds.add(value.sessionId);
    Object.values(value).forEach(visit);
  };

  // 线程和会话索引本身只是投影，不能拿它们自己证明自己有临床证据。
  Object.entries(snapshot).forEach(([key, value]) => {
    if (key !== "problemThreads" && key !== "sessionIndex") visit(value);
  });
  return { problemThreadIds, sessionIds };
}

function threadLifetimeMs(thread) {
  const created = Date.parse(thread.createdAt);
  const closed = Date.parse(thread.closedAt || thread.lastActiveAt);
  return Number.isFinite(created) && Number.isFinite(closed) ? Math.max(0, closed - created) : Number.POSITIVE_INFINITY;
}

function buildRepairPlan(snapshot) {
  const problemThreads = Array.isArray(snapshot.problemThreads) ? snapshot.problemThreads : [];
  const sessionIndex = Array.isArray(snapshot.sessionIndex) ? snapshot.sessionIndex : [];
  const references = collectClinicalIdentityReferences(snapshot);
  const relationThreadIds = new Set(problemThreads.flatMap((thread) => [thread.problemThreadId, thread.supersedesProblemThreadId].filter((value) => typeof value === "string" && value)));
  const completedThreadIds = new Set(sessionIndex
    .filter((session) => session.status === "completed" || references.sessionIds.has(session.sessionId))
    .map((session) => session.problemThreadId));

  const removedThreads = problemThreads.filter((thread) => {
    if (!isObject(thread) || thread.status !== "archived") return false;
    if (thread.problemThreadId === snapshot.problemThreadId) return false;
    if (references.problemThreadIds.has(thread.problemThreadId) || completedThreadIds.has(thread.problemThreadId)) return false;
    if (problemThreads.some((other) => other.supersedesProblemThreadId === thread.problemThreadId)) return false;
    return threadLifetimeMs(thread) <= TRANSIENT_LIFETIME_MS;
  });
  const removedThreadIds = new Set(removedThreads.map((thread) => thread.problemThreadId));
  const removedSessions = sessionIndex.filter((session) => removedThreadIds.has(session.problemThreadId)
    && session.status === "draft"
    && !references.sessionIds.has(session.sessionId));
  const removedSessionIds = new Set(removedSessions.map((session) => session.sessionId));

  const repairedSnapshot = {
    ...snapshot,
    problemThreads: problemThreads.filter((thread) => !removedThreadIds.has(thread.problemThreadId)),
    sessionIndex: sessionIndex.filter((session) => !removedSessionIds.has(session.sessionId)),
  };

  return {
    repairedSnapshot,
    removedThreads,
    removedSessions,
    relationThreadIds,
    changed: removedThreads.length > 0 || removedSessions.length > 0,
  };
}

function compactThread(thread) {
  return {
    problemThreadId: thread.problemThreadId,
    createdAt: thread.createdAt,
    closedAt: thread.closedAt,
    lifetimeMs: threadLifetimeMs(thread),
    title: thread.title,
  };
}

function timestampForFile() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

const db = new Database(databasePath);
db.pragma("foreign_keys = ON");

try {
  const rows = publicCodes.map((publicCode) => {
    const row = db.prepare(`
      SELECT c.id, c.public_code AS publicCode, c.app_version AS appVersion,
             c.knowledge_version AS knowledgeVersion, c.decision_version AS decisionVersion,
             s.revision, s.payload
      FROM pilot_cases c
      JOIN case_snapshots s ON s.case_id = c.id
      WHERE c.public_code = ? AND c.deleted_at IS NULL
    `).get(publicCode);
    if (!row) return { publicCode, found: false };
    const snapshot = JSON.parse(row.payload);
    const plan = buildRepairPlan(snapshot);
    return { ...row, found: true, snapshot, plan };
  });

  const missing = rows.filter((row) => !row.found).map((row) => row.publicCode);
  if (missing.length) throw new Error(`未找到案例：${missing.join("、")}`);

  const report = rows.map((row) => ({
    publicCode: row.publicCode,
    caseId: row.id,
    revisionBefore: row.revision,
    revisionAfter: row.plan.changed ? row.revision + 1 : row.revision,
    problemThreadsBefore: row.snapshot.problemThreads?.length ?? 0,
    problemThreadsAfter: row.plan.repairedSnapshot.problemThreads.length,
    sessionsBefore: row.snapshot.sessionIndex?.length ?? 0,
    sessionsAfter: row.plan.repairedSnapshot.sessionIndex.length,
    removedThreads: row.plan.removedThreads.map(compactThread),
    removedSessions: row.plan.removedSessions.map((session) => ({
      sessionId: session.sessionId,
      problemThreadId: session.problemThreadId,
      status: session.status,
      startedAt: session.startedAt,
    })),
    changed: row.plan.changed,
  }));

  let backupPath = null;
  if (apply && report.some((item) => item.changed)) {
    const backupDirectory = path.join(path.dirname(databasePath), "backups");
    mkdirSync(backupDirectory, { recursive: true });
    backupPath = path.join(backupDirectory, `rehabmind-before-projection-repair-${timestampForFile()}.sqlite`);
    await db.backup(backupPath);

    const updateSnapshot = db.prepare("UPDATE case_snapshots SET revision = ?, payload = ?, updated_at = ? WHERE case_id = ? AND revision = ?");
    const updateCase = db.prepare("UPDATE pilot_cases SET updated_at = ? WHERE id = ?");
    const insertAudit = db.prepare(`
      INSERT INTO pilot_admin_audit
        (id, case_id, action, target_id, metadata, app_version, knowledge_version, decision_version, occurred_at)
      VALUES (?, ?, 'snapshot_projection_repaired', ?, ?, ?, ?, ?, ?)
    `);
    const applyRepairs = db.transaction(() => {
      for (const row of rows) {
        if (!row.plan.changed) continue;
        const occurredAt = new Date().toISOString();
        const result = updateSnapshot.run(
          row.revision + 1,
          JSON.stringify(row.plan.repairedSnapshot),
          occurredAt,
          row.id,
          row.revision,
        );
        if (result.changes !== 1) throw new Error(`案例 ${row.publicCode} revision 已变化，修复已中止`);
        updateCase.run(occurredAt, row.id);
        insertAudit.run(
          randomUUID(),
          row.id,
          row.id,
          JSON.stringify({
            tool: "repair-problem-thread-projection@1",
            publicCode: row.publicCode,
            revisionBefore: row.revision,
            revisionAfter: row.revision + 1,
            removedProblemThreadIds: row.plan.removedThreads.map((thread) => thread.problemThreadId),
            removedSessionIds: row.plan.removedSessions.map((session) => session.sessionId),
            caseEventsChanged: false,
            backupPath,
          }),
          row.appVersion,
          row.knowledgeVersion,
          row.decisionVersion,
          occurredAt,
        );
      }
    });
    applyRepairs();
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", databasePath, backupPath, cases: report }, null, 2));
} finally {
  db.close();
}

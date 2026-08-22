import { and, asc, desc, eq, inArray, lt, max, or } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import nodePath from "node:path";
import type BetterSqlite3 from "better-sqlite3";
import {
  PilotCaseConflictError,
  PilotCaseNotFoundError,
  type NewPilotCaseBundle,
  type PilotCaseEventRecord,
  type PilotCaseFeedbackRecord,
  type PilotCaseRecord,
  type PilotCaseRepository,
  type PilotCaseSnapshotRecord,
  type SaveFeedbackInput,
  type SaveProgressInput,
  type SaveProgressResult,
} from "../app/pilot-case-contracts";
import * as schema from "./schema";

type SqlitePilotDb = BetterSQLite3Database<typeof schema>;

type PilotCaseRow = typeof schema.pilotCases.$inferSelect;
type PilotSnapshotRow = typeof schema.caseSnapshots.$inferSelect;
type PilotEventRow = typeof schema.caseEvents.$inferSelect;
type PilotFeedbackRow = typeof schema.caseFeedback.$inferSelect;

function mapCase(row: PilotCaseRow): PilotCaseRecord {
  return { ...row, status: row.status === "deleted" ? "deleted" : "active" };
}

function mapEvent(row: PilotEventRow): PilotCaseEventRecord {
  return {
    ...row,
    type: row.type as PilotCaseEventRecord["type"],
    source: row.source as PilotCaseEventRecord["source"],
  };
}

function mapFeedback(row: PilotFeedbackRow): PilotCaseFeedbackRecord {
  return { ...row, source: row.source as PilotCaseFeedbackRecord["source"] };
}

function isUniqueConstraintError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("UNIQUE constraint failed") || message.includes("SQLITE_CONSTRAINT");
}

/**
 * VPS/Node 环境的试点案例仓储：与 `D1PilotCaseRepository` 实现同一接口，
 * 复用同一份 drizzle sqlite schema 与迁移产物。
 * better-sqlite3 是同步驱动：查询用 .all()/.get() 终结，写事务用原生 transaction
 * 保证原子性；冲突语义（revision 不匹配、事件 id 复用、时间线并发）与 D1 版一致。
 */
export class SqlitePilotCaseRepository implements PilotCaseRepository {
  /** 打开数据库连接并启用 WAL 与外键；目录不存在时自动创建。 */
  static open(databasePath: string) {
    mkdirForDatabase(databasePath);
    const BetterSqlite3Ctor = loadBetterSqlite3();
    const sqlite = new BetterSqlite3Ctor(databasePath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    return new SqlitePilotCaseRepository(sqlite);
  }

  private readonly db: SqlitePilotDb;

  constructor(readonly sqlite: BetterSqlite3.Database) {
    this.db = drizzle(sqlite, { schema });
  }

  async createCaseBundle(input: NewPilotCaseBundle) {
    this.db.transaction((tx) => {
      tx.insert(schema.pilotCases).values(input.caseRecord).run();
      tx.insert(schema.caseSnapshots).values(input.snapshot).run();
      tx.insert(schema.caseEvents).values(input.event).run();
    });
    return input;
  }

  async getCaseById(caseId: string) {
    const row = this.db.select().from(schema.pilotCases).where(eq(schema.pilotCases.id, caseId)).limit(1).get();
    return row ? mapCase(row) : null;
  }

  async getCaseByClientCreationId(clientCreationId: string) {
    const row = this.db.select().from(schema.pilotCases).where(eq(schema.pilotCases.clientCreationId, clientCreationId)).limit(1).get();
    return row ? mapCase(row) : null;
  }

  async getCaseByPublicCode(publicCode: string) {
    const row = this.db.select().from(schema.pilotCases).where(eq(schema.pilotCases.publicCode, publicCode)).limit(1).get();
    return row ? mapCase(row) : null;
  }

  async getSnapshot(caseId: string) {
    const row = this.db.select().from(schema.caseSnapshots).where(eq(schema.caseSnapshots.caseId, caseId)).limit(1).get();
    return row ?? null;
  }

  async getEventById(eventId: string) {
    const row = this.db.select().from(schema.caseEvents).where(eq(schema.caseEvents.id, eventId)).limit(1).get();
    return row ? mapEvent(row) : null;
  }

  async getEventsByCaseId(caseId: string) {
    return this.db.select().from(schema.caseEvents)
      .where(eq(schema.caseEvents.caseId, caseId))
      .orderBy(asc(schema.caseEvents.sequence))
      .all()
      .map(mapEvent);
  }

  async getFeedbackByCaseId(caseId: string) {
    return this.db.select().from(schema.caseFeedback)
      .where(eq(schema.caseFeedback.caseId, caseId))
      .orderBy(asc(schema.caseFeedback.createdAt))
      .all()
      .map(mapFeedback);
  }

  async listCases() {
    return this.db.select().from(schema.pilotCases)
      .orderBy(desc(schema.pilotCases.createdAt))
      .all()
      .map(mapCase);
  }

  async saveProgress(input: SaveProgressInput): Promise<SaveProgressResult> {
    const existingEvent = this.db.select().from(schema.caseEvents).where(eq(schema.caseEvents.id, input.event.id)).limit(1).get();
    if (existingEvent) {
      if (existingEvent.caseId !== input.caseId || existingEvent.payload !== input.event.payload || existingEvent.type !== input.event.type) {
        throw new PilotCaseConflictError("Event id has already been used for different content");
      }
      const existingCase = this.db.select().from(schema.pilotCases).where(eq(schema.pilotCases.id, input.caseId)).limit(1).get();
      const existingSnapshot = this.db.select().from(schema.caseSnapshots).where(eq(schema.caseSnapshots.caseId, input.caseId)).limit(1).get();
      if (!existingCase || !existingSnapshot) throw new PilotCaseNotFoundError();
      return { caseRecord: mapCase(existingCase), snapshot: existingSnapshot, event: mapEvent(existingEvent) };
    }

    const caseState = this.db
      .select({
        revision: schema.caseSnapshots.revision,
        lastSequence: max(schema.caseEvents.sequence),
      })
      .from(schema.caseSnapshots)
      .leftJoin(schema.caseEvents, eq(schema.caseEvents.caseId, schema.caseSnapshots.caseId))
      .where(eq(schema.caseSnapshots.caseId, input.caseId))
      .groupBy(schema.caseSnapshots.caseId, schema.caseSnapshots.revision)
      .limit(1)
      .get();
    if (!caseState) throw new PilotCaseNotFoundError();
    if (caseState.revision !== input.expectedRevision) throw new PilotCaseConflictError();
    const nextSequence = Number(caseState.lastSequence ?? 0) + 1;

    let snapshotRows: PilotSnapshotRow[] = [];
    let eventRows: PilotEventRow[] = [];
    let caseRows: PilotCaseRow[] = [];
    try {
      // 与 D1 版 batch 相同的三步原子写；任一步唯一约束失败都映射为可重试的 revision 冲突。
      this.db.transaction((tx) => {
        snapshotRows = tx.update(schema.caseSnapshots)
          .set({
            revision: input.expectedRevision + 1,
            payload: input.snapshot.payload,
            updatedAt: input.snapshot.updatedAt,
          })
          .where(and(eq(schema.caseSnapshots.caseId, input.caseId), eq(schema.caseSnapshots.revision, input.expectedRevision)))
          .returning()
          .all();
        eventRows = tx.insert(schema.caseEvents)
          .values({ ...input.event, caseId: input.caseId, sequence: nextSequence })
          .returning()
          .all();
        caseRows = tx.update(schema.pilotCases)
          .set({ ...input.patch, updatedAt: input.snapshot.updatedAt })
          .where(eq(schema.pilotCases.id, input.caseId))
          .returning()
          .all();
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new PilotCaseConflictError();
      throw error;
    }
    const snapshot = snapshotRows[0];
    const event = eventRows[0];
    const caseRecord = caseRows[0];
    if (!snapshot || !event || !caseRecord) throw new PilotCaseConflictError("Could not save case progress");
    return { caseRecord: mapCase(caseRecord), snapshot, event: mapEvent(event) };
  }

  async saveFeedback(input: SaveFeedbackInput) {
    const { timelineEvent, ...feedback } = input;
    if (timelineEvent) {
      const [lastSequence] = this.db.select({ lastSequence: max(schema.caseEvents.sequence) })
        .from(schema.caseEvents)
        .where(eq(schema.caseEvents.caseId, input.caseId))
        .all();
      let feedbackRows: PilotFeedbackRow[] = [];
      try {
        this.db.transaction((tx) => {
          feedbackRows = tx.insert(schema.caseFeedback).values(feedback).returning().all();
          tx.insert(schema.caseEvents)
            .values({ ...timelineEvent, caseId: input.caseId, sequence: Number(lastSequence?.lastSequence ?? 0) + 1 })
            .run();
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) throw new PilotCaseConflictError("Case timeline changed; retry feedback");
        throw error;
      }
      const row = feedbackRows[0];
      if (!row) throw new PilotCaseNotFoundError("Could not save feedback");
      return mapFeedback(row);
    }
    const [row] = this.db.insert(schema.caseFeedback).values(feedback).returning().all();
    if (!row) throw new PilotCaseNotFoundError("Could not save feedback");
    return mapFeedback(row);
  }

  async deleteCase(input: Parameters<PilotCaseRepository["deleteCase"]>[0]) {
    const caseRow = this.db.select().from(schema.pilotCases)
      .where(eq(schema.pilotCases.id, input.caseId)).limit(1).get();
    if (!caseRow) throw new PilotCaseNotFoundError();
    if (caseRow.status === "deleted") throw new PilotCaseNotFoundError();

    const [lastSequence] = this.db.select({ lastSequence: max(schema.caseEvents.sequence) })
      .from(schema.caseEvents)
      .where(eq(schema.caseEvents.caseId, input.caseId))
      .all();
    const nextSequence = Number(lastSequence?.lastSequence ?? 0) + 1;
    let updatedRows: PilotCaseRow[] = [];
    try {
      this.db.transaction((tx) => {
        updatedRows = tx.update(schema.pilotCases)
          .set({ status: "deleted", deletedAt: input.deletedAt, updatedAt: input.deletedAt })
          .where(eq(schema.pilotCases.id, input.caseId))
          .returning()
          .all();
        tx.insert(schema.caseEvents)
          .values({ ...input.event, caseId: input.caseId, sequence: nextSequence })
          .run();
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new PilotCaseConflictError("Case timeline changed; retry deletion");
      throw error;
    }
    const updatedCase = updatedRows[0];
    if (!updatedCase) throw new PilotCaseNotFoundError();
    return mapCase(updatedCase);
  }

  /** PRIV-02：物理清除（显式清理子表，顺序与 D1 版一致），返回移除的案例数。 */
  async hardDeleteCases(where: { deletedBefore?: string; createdBefore?: string }): Promise<number> {
    const conditions = [];
    if (where.deletedBefore !== undefined) {
      conditions.push(and(eq(schema.pilotCases.status, "deleted"), lt(schema.pilotCases.deletedAt, where.deletedBefore)));
    }
    if (where.createdBefore !== undefined) {
      conditions.push(lt(schema.pilotCases.createdAt, where.createdBefore));
    }
    if (!conditions.length) throw new Error("hardDeleteCases requires at least one cutoff");
    const ids = this.db
      .select({ id: schema.pilotCases.id })
      .from(schema.pilotCases)
      .where(conditions.length === 1 ? conditions[0] : or(...conditions))
      .all();
    if (!ids.length) return 0;
    const idList = ids.map((row) => row.id);
    // 顺序必须是“引用者先删、被引用者后删”（外键无 ON DELETE 子句）。
    this.db.transaction((tx) => {
      tx.delete(schema.knowledgeGapCandidates).where(inArray(schema.knowledgeGapCandidates.caseId, idList)).run();
      tx.delete(schema.knowledgeGapCandidates).where(inArray(schema.knowledgeGapCandidates.sourceEventId, idList)).run();
      tx.delete(schema.caseFeedback).where(inArray(schema.caseFeedback.caseId, idList)).run();
      tx.delete(schema.adminNotes).where(inArray(schema.adminNotes.caseId, idList)).run();
      tx.delete(schema.caseSnapshots).where(inArray(schema.caseSnapshots.caseId, idList)).run();
      tx.delete(schema.caseEvents).where(inArray(schema.caseEvents.id, idList)).run();
      tx.delete(schema.pilotCases).where(inArray(schema.pilotCases.id, idList)).run();
    });
    return idList.length;
  }
}

function mkdirForDatabase(databasePath: string) {
  mkdirSync(nodePath.dirname(databasePath), { recursive: true });
}

/**
 * 运行时加载原生模块：打包器会把静态 import 的 better-sqlite3 连同 .node 二进制
 * 一起内联，运行期相对路径失效；createRequire 从真实 node_modules 解析始终可用。
 * 打包产物位于 dist/server/assets/，向上回溯即可命中项目 node_modules。
 */
function loadBetterSqlite3(): typeof BetterSqlite3 {
  const bases = [import.meta.url, nodePath.join(process.cwd(), "index.js"), nodePath.join(process.cwd(), "package.json")];
  for (const base of bases) {
    try {
      return createRequire(base)("better-sqlite3");
    } catch {
      // 尝试下一个解析基点。
    }
  }
  throw new Error("better-sqlite3 could not be resolved from the server runtime");
}

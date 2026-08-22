import { and, asc, desc, eq, inArray, lt, max, or } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
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

type PilotDb = DrizzleD1Database<typeof schema>;

type PilotCaseRow = typeof schema.pilotCases.$inferSelect;
type PilotSnapshotRow = typeof schema.caseSnapshots.$inferSelect;
type PilotEventRow = typeof schema.caseEvents.$inferSelect;
type PilotFeedbackRow = typeof schema.caseFeedback.$inferSelect;

function mapCase(row: PilotCaseRow): PilotCaseRecord {
  return { ...row, status: row.status === "deleted" ? "deleted" : "active" };
}

function mapSnapshot(row: PilotSnapshotRow): PilotCaseSnapshotRecord {
  return row;
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

export class D1PilotCaseRepository implements PilotCaseRepository {
  constructor(private readonly db: PilotDb) {}

  async createCaseBundle(input: NewPilotCaseBundle) {
    await this.db.batch([
      this.db.insert(schema.pilotCases).values(input.caseRecord),
      this.db.insert(schema.caseSnapshots).values(input.snapshot),
      this.db.insert(schema.caseEvents).values(input.event),
    ]);
    return input;
  }

  async getCaseById(caseId: string) {
    const [row] = await this.db.select().from(schema.pilotCases).where(eq(schema.pilotCases.id, caseId)).limit(1);
    return row ? mapCase(row) : null;
  }

  async getCaseByClientCreationId(clientCreationId: string) {
    const [row] = await this.db.select().from(schema.pilotCases).where(eq(schema.pilotCases.clientCreationId, clientCreationId)).limit(1);
    return row ? mapCase(row) : null;
  }

  async getCaseByPublicCode(publicCode: string) {
    const [row] = await this.db.select().from(schema.pilotCases).where(eq(schema.pilotCases.publicCode, publicCode)).limit(1);
    return row ? mapCase(row) : null;
  }

  async getSnapshot(caseId: string) {
    const [row] = await this.db.select().from(schema.caseSnapshots).where(eq(schema.caseSnapshots.caseId, caseId)).limit(1);
    return row ? mapSnapshot(row) : null;
  }

  async getEventById(eventId: string) {
    const [row] = await this.db.select().from(schema.caseEvents).where(eq(schema.caseEvents.id, eventId)).limit(1);
    return row ? mapEvent(row) : null;
  }

  async getEventsByCaseId(caseId: string) {
    const rows = await this.db.select().from(schema.caseEvents)
      .where(eq(schema.caseEvents.caseId, caseId))
      .orderBy(asc(schema.caseEvents.sequence));
    return rows.map(mapEvent);
  }

  async getFeedbackByCaseId(caseId: string) {
    const rows = await this.db.select().from(schema.caseFeedback)
      .where(eq(schema.caseFeedback.caseId, caseId))
      .orderBy(asc(schema.caseFeedback.createdAt));
    return rows.map(mapFeedback);
  }

  async listCases() {
    const rows = await this.db.select().from(schema.pilotCases)
      .orderBy(desc(schema.pilotCases.createdAt));
    return rows.map(mapCase);
  }

  async saveProgress(input: SaveProgressInput): Promise<SaveProgressResult> {
    const [existingEvent] = await this.db.select().from(schema.caseEvents).where(eq(schema.caseEvents.id, input.event.id)).limit(1);
    if (existingEvent) {
      if (existingEvent.caseId !== input.caseId || existingEvent.payload !== input.event.payload || existingEvent.type !== input.event.type) {
        throw new PilotCaseConflictError("Event id has already been used for different content");
      }
      const [existingCase, existingSnapshot] = await Promise.all([
        this.db.select().from(schema.pilotCases).where(eq(schema.pilotCases.id, input.caseId)).limit(1),
        this.db.select().from(schema.caseSnapshots).where(eq(schema.caseSnapshots.caseId, input.caseId)).limit(1),
      ]);
      if (!existingCase[0] || !existingSnapshot[0]) throw new PilotCaseNotFoundError();
      return { caseRecord: mapCase(existingCase[0]), snapshot: mapSnapshot(existingSnapshot[0]), event: mapEvent(existingEvent) };
    }

    const [caseState] = await this.db
      .select({
        revision: schema.caseSnapshots.revision,
        lastSequence: max(schema.caseEvents.sequence),
      })
      .from(schema.caseSnapshots)
      .leftJoin(schema.caseEvents, eq(schema.caseEvents.caseId, schema.caseSnapshots.caseId))
      .where(eq(schema.caseSnapshots.caseId, input.caseId))
      .groupBy(schema.caseSnapshots.caseId, schema.caseSnapshots.revision)
      .limit(1);
    if (!caseState) throw new PilotCaseNotFoundError();
    if (caseState.revision !== input.expectedRevision) throw new PilotCaseConflictError();
    const nextSequence = Number(caseState.lastSequence ?? 0) + 1;

    let snapshotRows: unknown;
    let eventRows: unknown;
    let caseRows: unknown;
    try {
      [snapshotRows, eventRows, caseRows] = await this.db.batch([
        this.db.update(schema.caseSnapshots)
          .set({
            revision: input.expectedRevision + 1,
            payload: input.snapshot.payload,
            updatedAt: input.snapshot.updatedAt,
          })
          .where(and(eq(schema.caseSnapshots.caseId, input.caseId), eq(schema.caseSnapshots.revision, input.expectedRevision)))
          .returning(),
        this.db.insert(schema.caseEvents)
          .values({ ...input.event, caseId: input.caseId, sequence: nextSequence })
          .returning(),
        this.db.update(schema.pilotCases)
          .set({ ...input.patch, updatedAt: input.snapshot.updatedAt })
          .where(eq(schema.pilotCases.id, input.caseId))
          .returning(),
      ]);
    } catch (error) {
      // Two tabs can calculate the same next event sequence before either
      // batch commits. The losing batch is atomic, so expose it as the same
      // retryable revision conflict as the explicit stale-revision path.
      if (isUniqueConstraintError(error)) throw new PilotCaseConflictError();
      throw error;
    }
    const snapshot = (snapshotRows as PilotSnapshotRow[])[0] as PilotSnapshotRow | undefined;
    const event = (eventRows as PilotEventRow[])[0] as PilotEventRow | undefined;
    const caseRecord = (caseRows as PilotCaseRow[])[0] as PilotCaseRow | undefined;
    if (!snapshot || !event || !caseRecord) throw new PilotCaseConflictError("Could not save case progress");
    return { caseRecord: mapCase(caseRecord), snapshot: mapSnapshot(snapshot), event: mapEvent(event) };
  }

  async saveFeedback(input: SaveFeedbackInput) {
    const { timelineEvent, ...feedback } = input;
    if (timelineEvent) {
      const [lastSequence] = await this.db.select({ lastSequence: max(schema.caseEvents.sequence) })
        .from(schema.caseEvents)
        .where(eq(schema.caseEvents.caseId, input.caseId));
      let feedbackRows: unknown;
      try {
        [feedbackRows] = await this.db.batch([
          this.db.insert(schema.caseFeedback).values(feedback).returning(),
          this.db.insert(schema.caseEvents).values({ ...timelineEvent, caseId: input.caseId, sequence: Number(lastSequence?.lastSequence ?? 0) + 1 }).returning(),
        ]);
      } catch (error) {
        if (isUniqueConstraintError(error)) throw new PilotCaseConflictError("Case timeline changed; retry feedback");
        throw error;
      }
      const row = (feedbackRows as unknown as Array<PilotFeedbackRow>)[0];
      if (!row) throw new PilotCaseNotFoundError("Could not save feedback");
      return mapFeedback(row);
    }
    const [row] = await this.db.insert(schema.caseFeedback).values(feedback).returning();
    if (!row) throw new PilotCaseNotFoundError("Could not save feedback");
    return mapFeedback(row);
  }

  async deleteCase(input: Parameters<PilotCaseRepository["deleteCase"]>[0]) {    const [caseRow] = await this.db.select().from(schema.pilotCases)
      .where(eq(schema.pilotCases.id, input.caseId)).limit(1);
    if (!caseRow) throw new PilotCaseNotFoundError();
    if (caseRow.status === "deleted") throw new PilotCaseNotFoundError();

    const [lastSequence] = await this.db.select({ lastSequence: max(schema.caseEvents.sequence) })
      .from(schema.caseEvents)
      .where(eq(schema.caseEvents.caseId, input.caseId));
    const nextSequence = Number(lastSequence?.lastSequence ?? 0) + 1;
    let updated: unknown;
    try {
      [updated] = await this.db.batch([
        this.db.update(schema.pilotCases)
          .set({ status: "deleted", deletedAt: input.deletedAt, updatedAt: input.deletedAt })
          .where(eq(schema.pilotCases.id, input.caseId))
          .returning(),
        this.db.insert(schema.caseEvents)
          .values({ ...input.event, caseId: input.caseId, sequence: nextSequence })
          .returning(),
      ]);
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new PilotCaseConflictError("Case timeline changed; retry deletion");
      throw error;
    }
    const updatedCase = (updated as unknown as Array<PilotCaseRow>)[0];
    if (!updatedCase) throw new PilotCaseNotFoundError();
    return mapCase(updatedCase);
  }

  /** PRIV-02：物理清除（显式清理子表，不依赖外键级联开关），返回移除的案例数。 */
  async hardDeleteCases(where: { deletedBefore?: string; createdBefore?: string }): Promise<number> {
    const conditions = [];
    if (where.deletedBefore !== undefined) {
      conditions.push(and(eq(schema.pilotCases.status, "deleted"), lt(schema.pilotCases.deletedAt, where.deletedBefore)));
    }
    if (where.createdBefore !== undefined) {
      conditions.push(lt(schema.pilotCases.createdAt, where.createdBefore));
    }
    if (!conditions.length) throw new Error("hardDeleteCases requires at least one cutoff");
    const ids = await this.db
      .select({ id: schema.pilotCases.id })
      .from(schema.pilotCases)
      .where(conditions.length === 1 ? conditions[0] : or(...conditions));
    if (!ids.length) return 0;
    const idList = ids.map((row) => row.id);
    // 顺序必须是“引用者先删、被引用者后删”：
    // 迁移产物中的外键可能没有 ON DELETE 子句，顺序错误会触发 FK 约束失败。
    await this.db.batch([
      this.db.delete(schema.knowledgeGapCandidates).where(inArray(schema.knowledgeGapCandidates.caseId, idList)),
      this.db.delete(schema.knowledgeGapCandidates).where(inArray(schema.knowledgeGapCandidates.sourceEventId, idList)),
      this.db.delete(schema.caseFeedback).where(inArray(schema.caseFeedback.caseId, idList)),
      this.db.delete(schema.adminNotes).where(inArray(schema.adminNotes.caseId, idList)),
      this.db.delete(schema.caseSnapshots).where(inArray(schema.caseSnapshots.caseId, idList)),
      this.db.delete(schema.caseEvents).where(inArray(schema.caseEvents.id, idList)),
      this.db.delete(schema.pilotCases).where(inArray(schema.pilotCases.id, idList)),
    ]);
    return idList.length;
  }
}

export async function listCaseEvents(db: PilotDb, caseId: string) {
  const rows = await db.select().from(schema.caseEvents)
    .where(eq(schema.caseEvents.caseId, caseId))
    .orderBy(asc(schema.caseEvents.sequence));
  return rows.map(mapEvent);
}

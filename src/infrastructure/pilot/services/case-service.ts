import {
  assertPilotEventType,
  assertPilotReleaseVersions,
  PilotCaseConflictError,
  PilotCaseNotFoundError,
  PilotCaseUnauthorizedError,
  PilotCaseValidationError,
  serializePilotPayload,
  type PilotCaseEventType,
  type PilotCaseRecord,
  type PilotCaseRepository,
  type PilotReleaseVersions,
  type SaveProgressResult,
} from "./pilot-case-contracts";
import { buildPilotCaseView, type PilotCaseView } from "./pilot-case-view";
import { assertAndStampPilotSnapshotSchemaVersion } from "./pilot-snapshot-schema";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type PilotCaseAccess = {
  caseId: string;
  publicCode: string;
  accessToken: string;
  revision: number;
  versions: PilotReleaseVersions;
  replayed?: boolean;
};

export type PilotCaseServiceDependencies = {
  repository: PilotCaseRepository;
  versions: PilotReleaseVersions;
  now?: () => string;
  createId?: () => string;
  createPublicCode?: () => string;
  createAccessToken?: () => string;
  hashAccessToken?: (token: string) => Promise<string>;
};

export type CreatePilotCaseInput = {
  clientCreationId?: string;
  accessToken?: string;
  initialSnapshot?: unknown;
  currentStage?: string;
  isBilateral?: boolean;
  hasSafetyStop?: boolean;
};

export type SavePilotCaseProgressInput = {
  caseId: string;
  accessToken: string;
  expectedRevision: number;
  snapshot: unknown;
  eventType: PilotCaseEventType;
  eventPayload: unknown;
  eventId?: string;
  currentStage?: string;
  isBilateral?: boolean;
  hasSafetyStop?: boolean;
  sessionCount?: number;
};

export type SubmitPilotCaseFeedbackInput = {
  caseId: string;
  accessToken: string;
  eventId?: string;
  sessionNumber?: number;
  stage: string;
  kind: string;
  message?: string;
  payload?: unknown;
  sourceSessionNumber?: number;
  sourceStage?: string;
  sourceEventId?: string;
};

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function defaultId() {
  return globalThis.crypto.randomUUID();
}

function defaultPublicCode() {
  return Array.from(randomBytes(8), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

function defaultAccessToken() {
  return Array.from(randomBytes(32), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function defaultHashAccessToken(token: string) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function assertAccessToken(token: string) {
  if (typeof token !== "string" || !token.trim()) throw new PilotCaseValidationError("accessToken is required");
}

function assertRevision(revision: number) {
  if (!Number.isInteger(revision) || revision < 0) {
    throw new PilotCaseValidationError("expectedRevision must be a non-negative integer");
  }
}

export type PurgeInput = { deletedBeforeDays?: number; createdBefore?: string };

/** 校验并计算物理清除的截止时间；至少提供一个条件。 */
export function resolvePurgeCutoffs(
  input: PurgeInput,
  nowMs: number,
): { deletedBefore?: string; createdBefore?: string } {
  let deletedBefore: string | undefined;
  if (input.deletedBeforeDays !== undefined) {
    if (!Number.isInteger(input.deletedBeforeDays) || input.deletedBeforeDays < 0 || input.deletedBeforeDays > 3650) {
      throw new PilotCaseValidationError("deletedBeforeDays must be an integer between 0 and 3650");
    }
    deletedBefore = new Date(nowMs - input.deletedBeforeDays * 86_400_000).toISOString();
  }
  let createdBefore: string | undefined;
  if (input.createdBefore !== undefined) {
    if (typeof input.createdBefore !== "string" || !Number.isFinite(Date.parse(input.createdBefore))) {
      throw new PilotCaseValidationError("createdBefore must be a valid ISO date string");
    }
    createdBefore = new Date(input.createdBefore).toISOString();
  }
  if (deletedBefore === undefined && createdBefore === undefined) {
    throw new PilotCaseValidationError("purge requires deletedBeforeDays or createdBefore");
  }
  return { deletedBefore, createdBefore };
}

export class PilotCaseService {
  private readonly now: () => string;
  private readonly createId: () => string;
  private readonly createPublicCode: () => string;
  private readonly createAccessToken: () => string;
  private readonly hashAccessToken: (token: string) => Promise<string>;

  constructor(private readonly dependencies: PilotCaseServiceDependencies) {
    assertPilotReleaseVersions(dependencies.versions);
    this.now = dependencies.now ?? (() => new Date().toISOString());
    this.createId = dependencies.createId ?? defaultId;
    this.createPublicCode = dependencies.createPublicCode ?? defaultPublicCode;
    this.createAccessToken = dependencies.createAccessToken ?? defaultAccessToken;
    this.hashAccessToken = dependencies.hashAccessToken ?? defaultHashAccessToken;
  }

  private async replayExistingCase(existing: PilotCaseRecord, accessToken: string): Promise<PilotCaseAccess> {
    const tokenHash = await this.hashAccessToken(accessToken);
    if (tokenHash !== existing.accessTokenHash) throw new PilotCaseConflictError("clientCreationId is already bound to another token");
    const snapshot = await this.dependencies.repository.getSnapshot(existing.id);
    if (!snapshot) throw new PilotCaseNotFoundError("Case snapshot not found");
    return {
      caseId: existing.id,
      publicCode: existing.publicCode,
      accessToken,
      revision: snapshot.revision,
      versions: {
        appVersion: existing.appVersion,
        knowledgeVersion: existing.knowledgeVersion,
        decisionVersion: existing.decisionVersion,
      },
      replayed: true,
    };
  }

  async createCase(input: CreatePilotCaseInput = {}): Promise<PilotCaseAccess> {
    const clientCreationId = input.clientCreationId ?? this.createId();
    if (typeof clientCreationId !== "string" || clientCreationId.trim().length < 4 || clientCreationId.length > 128) {
      throw new PilotCaseValidationError("clientCreationId must be between 4 and 128 characters");
    }
    const accessToken = input.accessToken ?? this.createAccessToken();
    assertAccessToken(accessToken);
    const existing = await this.dependencies.repository.getCaseByClientCreationId(clientCreationId);
    if (existing) return this.replayExistingCase(existing, accessToken);
    const caseId = this.createId();
    const publicCode = this.createPublicCode();
    const now = this.now();
    const snapshotPayload = serializePilotPayload(
      assertAndStampPilotSnapshotSchemaVersion(input.initialSnapshot ?? {}, "initialSnapshot"),
      "initialSnapshot",
    );
    const eventPayload = JSON.stringify({ source: "case_creation" });
    const versions = this.dependencies.versions;
    const caseRecord: PilotCaseRecord = {
      id: caseId,
      clientCreationId,
      publicCode,
      accessTokenHash: await this.hashAccessToken(accessToken),
      status: "active",
      currentStage: input.currentStage ?? null,
      isTrial: true,
      isBilateral: input.isBilateral ?? false,
      hasSafetyStop: input.hasSafetyStop ?? false,
      sessionCount: 0,
      ...versions,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    let created;
    try {
      created = await this.dependencies.repository.createCaseBundle({
        caseRecord,
        snapshot: { caseId, revision: 0, payload: snapshotPayload, createdAt: now, updatedAt: now },
        event: {
          id: this.createId(),
          caseId,
          sequence: 1,
          type: "case_created",
          payload: eventPayload,
          source: "system",
          occurredAt: now,
          ...versions,
        },
      });
    } catch (error) {
      // A concurrent request may win the unique clientCreationId constraint.
      // Re-read it so a lost response can safely replay the winning case.
      const concurrent = await this.dependencies.repository.getCaseByClientCreationId(clientCreationId);
      if (concurrent) return this.replayExistingCase(concurrent, accessToken);
      throw error;
    }

    return {
      caseId: created.caseRecord.id,
      publicCode: created.caseRecord.publicCode,
      accessToken,
      revision: created.snapshot.revision,
      versions,
    };
  }

  async saveProgress(input: SavePilotCaseProgressInput): Promise<SaveProgressResult> {
    assertAccessToken(input.accessToken);
    assertRevision(input.expectedRevision);
    assertPilotEventType(input.eventType);
    const caseRecord = await this.authorize(input.caseId, input.accessToken);
    const versions = this.dependencies.versions;
    const now = this.now();
    const eventId = input.eventId ?? this.createId();
    const snapshotPayload = serializePilotPayload(
      assertAndStampPilotSnapshotSchemaVersion(input.snapshot, "snapshot"),
      "snapshot",
    );
    const eventPayload = serializePilotPayload(input.eventPayload, "eventPayload");

    return this.dependencies.repository.saveProgress({
      caseId: caseRecord.id,
      expectedRevision: input.expectedRevision,
      snapshot: {
        payload: snapshotPayload,
        createdAt: (await this.dependencies.repository.getSnapshot(caseRecord.id))?.createdAt ?? now,
        updatedAt: now,
      },
      event: {
        id: eventId,
        type: input.eventType,
        payload: eventPayload,
        source: "user",
        occurredAt: now,
        ...versions,
      },
      patch: {
        currentStage: input.currentStage,
        isBilateral: input.isBilateral,
        hasSafetyStop: input.hasSafetyStop,
        sessionCount: input.sessionCount,
      },
    });
  }

  async submitFeedback(input: SubmitPilotCaseFeedbackInput) {
    assertAccessToken(input.accessToken);
    const caseRecord = await this.authorize(input.caseId, input.accessToken);
    if (typeof input.stage !== "string" || typeof input.kind !== "string" || !input.stage.trim() || !input.kind.trim()) {
      throw new PilotCaseValidationError("feedback stage and kind are required");
    }
    if (input.message && input.message.length > 2000) {
      throw new PilotCaseValidationError("feedback message is too long");
    }
    for (const [label, value] of [["sessionNumber", input.sessionNumber], ["sourceSessionNumber", input.sourceSessionNumber]] as const) {
      if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
        throw new PilotCaseValidationError(`${label} must be a positive integer`);
      }
    }
    if (input.eventId) {
      const event = await this.dependencies.repository.getEventById(input.eventId);
      if (!event || event.caseId !== caseRecord.id) {
        throw new PilotCaseValidationError("feedback event does not belong to this case");
      }
    }
    if (input.sourceEventId) {
      const event = await this.dependencies.repository.getEventById(input.sourceEventId);
      if (!event || event.caseId !== caseRecord.id) {
        throw new PilotCaseValidationError("feedback source event does not belong to this case");
      }
    }
    const feedbackEventId = this.createId();
    return this.dependencies.repository.saveFeedback({
      id: this.createId(),
      caseId: caseRecord.id,
      eventId: input.eventId ?? null,
      sessionNumber: input.sessionNumber ?? null,
      stage: input.stage.trim(),
      kind: input.kind.trim(),
      message: input.message?.trim() || null,
      payload: input.payload === undefined ? null : serializePilotPayload(input.payload, "feedbackPayload"),
      source: "in_app",
      sourceSessionNumber: input.sourceSessionNumber ?? null,
      sourceStage: input.sourceStage?.trim() || null,
      sourceEventId: input.sourceEventId ?? null,
      createdAt: this.now(),
      timelineEvent: {
        id: feedbackEventId,
        type: "feedback_submitted",
        payload: serializePilotPayload({
          targetEventId: input.eventId ?? null,
          targetSessionNumber: input.sessionNumber ?? null,
          targetStage: input.stage.trim(),
          kind: input.kind.trim(),
          sourceStage: input.sourceStage?.trim() || null,
          sourceEventId: input.sourceEventId ?? null,
        }, "feedbackEventPayload"),
        source: "user",
        occurredAt: this.now(),
        ...this.dependencies.versions,
      },
    });
  }

  async deleteCase(input: { caseId: string; accessToken: string }) {
    assertAccessToken(input.accessToken);
    const caseRecord = await this.authorize(input.caseId, input.accessToken);
    const deletedAt = this.now();
    return this.dependencies.repository.deleteCase({
      caseId: caseRecord.id,
      deletedAt,
      event: {
        id: this.createId(),
        type: "case_deleted",
        payload: JSON.stringify({ source: "user" }),
        source: "user",
        occurredAt: deletedAt,
        ...this.dependencies.versions,
      },
    });
  }

  /** PRIV-02：按截止条件物理清除案例，返回移除数量。至少提供一个条件。 */
  async purgeCases(input: PurgeInput): Promise<number> {
    const cutoffs = resolvePurgeCutoffs(input, Date.parse(this.now()));
    return this.dependencies.repository.hardDeleteCases(cutoffs);
  }

  async readCase(input: { caseId: string; accessToken: string }): Promise<PilotCaseView> {
    const caseRecord = await this.authorize(input.caseId, input.accessToken);
    return this.buildCaseView(caseRecord);
  }

  private async buildCaseView(caseRecord: PilotCaseRecord) {
    const [snapshot, events, feedback] = await Promise.all([
      this.dependencies.repository.getSnapshot(caseRecord.id),
      this.dependencies.repository.getEventsByCaseId(caseRecord.id),
      this.dependencies.repository.getFeedbackByCaseId(caseRecord.id),
    ]);
    if (!snapshot) throw new PilotCaseNotFoundError("Case snapshot not found");
    return buildPilotCaseView(caseRecord, snapshot, events, feedback);
  }

  private async authorize(caseId: string, accessToken: string) {
    const caseRecord = await this.dependencies.repository.getCaseById(caseId);
    if (!caseRecord) throw new PilotCaseNotFoundError();
    if (caseRecord.status !== "active") throw new PilotCaseUnauthorizedError();
    const tokenHash = await this.hashAccessToken(accessToken);
    if (tokenHash !== caseRecord.accessTokenHash) throw new PilotCaseUnauthorizedError();
    return caseRecord;
  }
}

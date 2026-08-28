import {
  assertPilotEventType,
  assertPilotReleaseVersions,
  PILOT_EVENT_SCHEMA_VERSION,
  PilotCaseConflictError,
  PilotCaseNotFoundError,
  PilotCaseUnauthorizedError,
  PilotCaseValidationError,
  serializePilotPayload,
  type PilotCaseEventType,
  type PilotClinicalEventEnvelope,
  type PilotCaseRecord,
  type PilotCaseRepository,
  type PilotReleaseVersions,
  type SaveProgressResult,
} from "@/src/infrastructure/pilot/api/case-contracts";
import { buildPilotCaseView, type PilotCaseView } from "@/src/infrastructure/pilot/services/case-view";
import { assertAndStampPilotSnapshotSchemaVersion } from "@/src/infrastructure/pilot/persistence/snapshot-schema";
import { projectWorkflowState } from "@/src/features/rehabmind/workflow/workflow-orchestrator";
import { assertPilotConsentTimestamp, attachPilotConsent, parsePilotConsentRecord, type PilotConsentRecord } from "@/src/infrastructure/pilot/consent/consent-core";
import { parsePilotSourceRecord, type PilotSourceRecord } from "@/src/infrastructure/pilot/onboarding/source-channel";
import {
  buildPilotInvariantAlert,
  inspectWorkflowProjectionInvariants,
  parseWorkflowProjectionObservation,
} from "@/src/features/rehabmind/workflow/workflow-invariants";

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
  source: PilotSourceRecord;
  consent: PilotConsentRecord;
  firstUseFlowId?: string;
  testContext?: { testRunId: string; scenarioId: string; createdBy: "test_workbench" };
};

export type SavePilotCaseProgressInput = {
  caseId: string;
  accessToken: string;
  expectedRevision: number;
  requestId?: string;
  sessionId?: string;
  problemThreadId?: string;
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

function assertOpenProductMode(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return;
  const root = snapshot as Record<string, unknown>;
  const domain = root.domain && typeof root.domain === "object" && !Array.isArray(root.domain)
    ? root.domain as Record<string, unknown>
    : null;
  const intake = domain?.intake;
  if (!intake || typeof intake !== "object" || Array.isArray(intake)) return;
  if ((intake as Record<string, unknown>).operationTarget === "study") {
    throw new PilotCaseValidationError("案例学习模式已关闭，不能创建或更新真实康复案例");
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

  async createCase(input: CreatePilotCaseInput): Promise<PilotCaseAccess> {
    const clientCreationId = input.clientCreationId ?? this.createId();
    if (typeof clientCreationId !== "string" || clientCreationId.trim().length < 4 || clientCreationId.length > 128) {
      throw new PilotCaseValidationError("clientCreationId must be between 4 and 128 characters");
    }
    const accessToken = input.accessToken ?? this.createAccessToken();
    assertAccessToken(accessToken);
    let source: PilotSourceRecord;
    let consent: PilotConsentRecord;
    const now = this.now();
    try {
      source = parsePilotSourceRecord(input.source, { allowInternalTest: Boolean(input.testContext) });
      consent = parsePilotConsentRecord(input.consent);
      assertPilotConsentTimestamp(consent, Date.parse(now));
    } catch (error) {
      throw new PilotCaseValidationError(error instanceof Error ? error.message : "source or consent is invalid");
    }
    const firstUseFlowId = input.firstUseFlowId?.trim() || null;
    if (firstUseFlowId && (!/^[A-Za-z0-9_-]{8,128}$/.test(firstUseFlowId))) {
      throw new PilotCaseValidationError("firstUseFlowId must be 8 to 128 URL-safe characters");
    }
    const testContext = input.testContext ?? null;
    if (testContext) {
      if (source.channel !== "internal_test") throw new PilotCaseValidationError("test cases must use internal_test source");
      if (!/^[A-Za-z0-9_-]{8,128}$/.test(testContext.testRunId)) throw new PilotCaseValidationError("testRunId is invalid");
      if (!/^[A-Za-z0-9_-]{2,128}$/.test(testContext.scenarioId)) throw new PilotCaseValidationError("scenarioId is invalid");
    } else if (source.channel === "internal_test") {
      throw new PilotCaseValidationError("internal_test source requires test context");
    }
    const existing = await this.dependencies.repository.getCaseByClientCreationId(clientCreationId);
    if (existing) return this.replayExistingCase(existing, accessToken);
    const caseId = this.createId();
    const publicCode = testContext ? `TEST-${this.createPublicCode()}` : this.createPublicCode();
    const rawInitialSnapshot = input.initialSnapshot && typeof input.initialSnapshot === "object"
      ? input.initialSnapshot as Record<string, unknown>
      : {};
    const rawIdentity = rawInitialSnapshot.identity && typeof rawInitialSnapshot.identity === "object" && !Array.isArray(rawInitialSnapshot.identity)
      ? rawInitialSnapshot.identity as Record<string, unknown>
      : {};
    const problemThreadId = typeof rawIdentity.problemThreadId === "string" && rawIdentity.problemThreadId.trim()
      ? rawIdentity.problemThreadId
      : `thread-${caseId}`;
    const sessionId = typeof rawIdentity.sessionId === "string" && rawIdentity.sessionId.trim()
      ? rawIdentity.sessionId
      : `session-${caseId}-1`;
    const initialSnapshot = {
      ...rawInitialSnapshot,
      identity: {
        ...rawIdentity,
        problemThreadId,
        sessionId,
        sessionStatus: rawIdentity.sessionStatus ?? "draft",
      },
    };
    assertOpenProductMode(initialSnapshot);
    const snapshotPayload = serializePilotPayload(
      assertAndStampPilotSnapshotSchemaVersion(attachPilotConsent(initialSnapshot, consent), "initialSnapshot", { requireConsent: true }),
      "initialSnapshot",
    );
    const eventPayload = JSON.stringify({
      eventSchemaVersion: PILOT_EVENT_SCHEMA_VERSION,
      caseId,
      problemThreadId,
      sessionId,
      occurredAt: now,
      source: "system",
      event: "case_creation",
      sourceChannel: source.channel,
      sourceDetail: source.detail,
      firstUseFlowId,
    });
    const versions = this.dependencies.versions;
    const caseRecord: PilotCaseRecord = {
      id: caseId,
      clientCreationId,
      publicCode,
      accessTokenHash: await this.hashAccessToken(accessToken),
      inviteTokenHash: null,
      inviteSource: null,
      sourceChannel: source.channel,
      sourceDetail: source.detail,
      consentVersion: consent.version,
      consentConfirmedAt: consent.confirmedAt,
      isTestCase: Boolean(testContext),
      testRunId: testContext?.testRunId ?? null,
      scenarioId: testContext?.scenarioId ?? null,
      createdBy: testContext?.createdBy ?? null,
      firstUseFlowId,
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
          eventSchemaVersion: PILOT_EVENT_SCHEMA_VERSION,
          problemThreadId,
          sessionId,
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
    // 事件编号是幂等键。同一请求重放时必须复用首次事件的发生时间，
    // 否则 envelope 仅因当前时间变化就会被仓储误判为“同 ID 不同内容”。
    // 其他字段仍按本次请求重新构造；若请求内容被篡改，仓储会继续拒绝冲突。
    const existingEvent = await this.dependencies.repository.getEventById(eventId);
    const eventOccurredAt = existingEvent?.occurredAt ?? now;
    const rawSnapshot = input.snapshot && typeof input.snapshot === "object" && !Array.isArray(input.snapshot)
      ? input.snapshot as Record<string, unknown>
      : {};
    const rawIdentity = rawSnapshot.identity && typeof rawSnapshot.identity === "object" && !Array.isArray(rawSnapshot.identity)
      ? rawSnapshot.identity as Record<string, unknown>
      : {};
    const requestedProblemThreadId = input.problemThreadId
      ?? (typeof rawIdentity.problemThreadId === "string" ? rawIdentity.problemThreadId : "");
    const problemThreadId = requestedProblemThreadId.trim() || `thread-${caseRecord.id}`;
    const requestedSessionId = input.sessionId
      ?? (typeof rawIdentity.sessionId === "string" ? rawIdentity.sessionId : "");
    const sessionId = requestedSessionId.trim() || `session-${caseRecord.id}-${Math.max(1, input.sessionCount ?? 1)}`;
    const normalizedSnapshot = { ...rawSnapshot, identity: { ...rawIdentity, problemThreadId, sessionId } };
    assertOpenProductMode(normalizedSnapshot);
    const validatedSnapshot = assertAndStampPilotSnapshotSchemaVersion(normalizedSnapshot, "snapshot", { requireConsent: true });
    const snapshotPayload = serializePilotPayload(validatedSnapshot, "snapshot");
    const rawEventPayload = input.eventPayload && typeof input.eventPayload === "object" && !Array.isArray(input.eventPayload)
      ? input.eventPayload as Record<string, unknown>
      : input.eventPayload;
    const workflowContainer = rawEventPayload && typeof rawEventPayload === "object"
      ? (rawEventPayload as Record<string, unknown>).workflow
      : null;
    const workflowInput = parseWorkflowProjectionObservation(
      workflowContainer && typeof workflowContainer === "object"
        ? (workflowContainer as Record<string, unknown>).projectionInput
        : null,
    );
    const invariantCodes = workflowInput
      ? inspectWorkflowProjectionInvariants({
          snapshotStep: Number(((validatedSnapshot.workflow as Record<string, unknown> | undefined)?.stage) ?? 0),
          projection: projectWorkflowState(workflowInput),
        })
      : [];
    if (invariantCodes.length) {
      console.warn("pilot workflow invariant", buildPilotInvariantAlert({
        codes: invariantCodes,
        requestId: input.requestId ?? eventId,
        caseId: input.caseId,
        sessionId: input.sessionId ?? `session-${input.sessionCount ?? 0}`,
      }));
    }
    const eventEnvelope: PilotClinicalEventEnvelope | null = rawEventPayload && typeof rawEventPayload === "object"
      ? {
          eventSchemaVersion: PILOT_EVENT_SCHEMA_VERSION,
          caseId: caseRecord.id,
          problemThreadId,
          sessionId,
          occurredAt: eventOccurredAt,
          source: "user",
          payload: {
            ...rawEventPayload,
            technical: {
              requestId: input.requestId ?? eventId,
              caseId: input.caseId,
              sessionId,
              problemThreadId,
              baseRevision: input.expectedRevision,
              invariantCodes,
            },
          },
        }
      : null;
    const eventPayload = serializePilotPayload(
      eventEnvelope
        ? {
            ...eventEnvelope.payload,
            envelope: {
              eventSchemaVersion: eventEnvelope.eventSchemaVersion,
              caseId: eventEnvelope.caseId,
              problemThreadId: eventEnvelope.problemThreadId,
              sessionId: eventEnvelope.sessionId,
              occurredAt: eventEnvelope.occurredAt,
              source: eventEnvelope.source,
            },
          }
        : rawEventPayload,
      "eventPayload",
    );

    const currentSnapshot = await this.dependencies.repository.getSnapshot(caseRecord.id);
    try {
      return await this.dependencies.repository.saveProgress({
        caseId: caseRecord.id,
        expectedRevision: input.expectedRevision,
        snapshot: {
          payload: snapshotPayload,
          createdAt: currentSnapshot?.createdAt ?? now,
          updatedAt: now,
        },
        event: {
          id: eventId,
          type: input.eventType,
          payload: eventPayload,
          source: "user",
          occurredAt: eventOccurredAt,
          eventSchemaVersion: PILOT_EVENT_SCHEMA_VERSION,
          problemThreadId,
          sessionId,
          ...versions,
        },
        patch: {
          currentStage: input.currentStage,
          isBilateral: input.isBilateral,
          hasSafetyStop: input.hasSafetyStop,
          sessionCount: input.sessionCount,
        },
      });
    } catch (error) {
      const replayEvent = error instanceof PilotCaseConflictError
        ? await this.dependencies.repository.getEventById(eventId)
        : null;
      if (error instanceof PilotCaseConflictError && !replayEvent && currentSnapshot && input.expectedRevision < currentSnapshot.revision) {
        console.warn("pilot workflow invariant", buildPilotInvariantAlert({
          codes: ["INV-REVISION-REGRESSION"],
          requestId: input.requestId ?? eventId,
          caseId: input.caseId,
          sessionId: input.sessionId ?? `session-${input.sessionCount ?? 0}`,
        }));
      }
      throw error;
    }
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
    const warnFeedbackInvariant = (code: "INV-FEEDBACK-EVENT-CROSSCASE" | "INV-FEEDBACK-SESSION-MISMATCH") => {
      console.warn("pilot workflow invariant", buildPilotInvariantAlert({
        codes: [code],
        requestId: input.eventId ?? input.sourceEventId ?? "feedback-reference",
        caseId: caseRecord.id,
        sessionId: `session-${input.sourceSessionNumber ?? input.sessionNumber ?? "unknown"}`,
      }));
    };
    const maximumSession = Math.max(1, caseRecord.sessionCount);
    for (const [label, value] of [["sessionNumber", input.sessionNumber], ["sourceSessionNumber", input.sourceSessionNumber]] as const) {
      if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
        throw new PilotCaseValidationError(`${label} must be a positive integer`);
      }
      if (value !== undefined && value > maximumSession) {
        warnFeedbackInvariant("INV-FEEDBACK-SESSION-MISMATCH");
        throw new PilotCaseValidationError(`${label} does not belong to this case`);
      }
    }
    if (input.eventId) {
      const event = await this.dependencies.repository.getEventById(input.eventId);
      if (!event || event.caseId !== caseRecord.id) {
        warnFeedbackInvariant("INV-FEEDBACK-EVENT-CROSSCASE");
        throw new PilotCaseValidationError("feedback event does not belong to this case");
      }
    }
    if (input.sourceEventId) {
      const event = await this.dependencies.repository.getEventById(input.sourceEventId);
      if (!event || event.caseId !== caseRecord.id) {
        warnFeedbackInvariant("INV-FEEDBACK-EVENT-CROSSCASE");
        throw new PilotCaseValidationError("feedback source event does not belong to this case");
      }
    }
    const feedbackEventId = this.createId();
    const createdAt = this.now();
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
      status: "open",
      ...this.dependencies.versions,
      createdAt,
      updatedAt: null,
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
        occurredAt: createdAt,
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
    if (caseRecord.status !== "active") {
      console.warn("pilot workflow invariant", buildPilotInvariantAlert({
        codes: ["INV-DELETED-CASE-RESUMED"],
        requestId: "deleted-case-access",
        caseId,
        sessionId: "unknown",
      }));
      throw new PilotCaseUnauthorizedError();
    }
    const tokenHash = await this.hashAccessToken(accessToken);
    if (tokenHash !== caseRecord.accessTokenHash) throw new PilotCaseUnauthorizedError();
    return caseRecord;
  }
}

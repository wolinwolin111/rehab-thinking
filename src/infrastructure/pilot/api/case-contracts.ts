export const PILOT_CASE_EVENT_TYPES = [
  "case_created",
  "consent_confirmed",
  "intake_saved",
  "intake_confirmed",
  "assessment_answered",
  "assessment_skipped",
  "assessment_completed",
  "finding_generated",
  "treatment_started",
  "treatment_skipped",
  "treatment_retested",
  "training_plan_saved",
  "training_feedback_saved",
  "session_saved",
  "problem_thread_started",
  "problem_thread_archived",
  "problem_thread_restored",
  "session_draft_saved",
  "session_completed",
  "observation_added",
  "assessment_recorded",
  "treatment_completed",
  "score_recorded",
  "record_superseded",
  "capability_profile_changed",
  "feedback_submitted",
  "case_deleted",
] as const;

export type PilotCaseEventType = (typeof PILOT_CASE_EVENT_TYPES)[number];
export type PilotCaseStatus = "active" | "deleted";
export type PilotCaseEventSource = "user" | "system" | "admin";
export const PILOT_EVENT_SCHEMA_VERSION = 2;
export type PilotCaseFeedbackSource = "in_app" | "fan_group" | "admin";
export type PilotCaseFeedbackStatus = "open" | "in_review" | "resolved" | "dismissed";
export const PILOT_TRIAL_EVENT_TYPES = [
  "tutorial_completed",
  "tutorial_skipped",
  "consent_confirmed",
  "consent_declined",
  "case_recovered",
  "save_failed",
  "save_conflict",
] as const;
export type PilotTrialEventType = (typeof PILOT_TRIAL_EVENT_TYPES)[number];

export type PilotReleaseVersions = {
  appVersion: string;
  knowledgeVersion: string;
  decisionVersion: string;
};

export type PilotCaseRecord = PilotReleaseVersions & {
  id: string;
  clientCreationId: string;
  publicCode: string;
  accessTokenHash: string;
  inviteTokenHash: string | null;
  inviteSource: string | null;
  sourceChannel: string | null;
  sourceDetail: string | null;
  consentVersion: string | null;
  consentConfirmedAt: string | null;
  isTestCase: boolean;
  testRunId: string | null;
  scenarioId: string | null;
  createdBy: string | null;
  firstUseFlowId: string | null;
  status: PilotCaseStatus;
  currentStage: string | null;
  isTrial: boolean;
  isBilateral: boolean;
  hasSafetyStop: boolean;
  sessionCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type PilotCaseSnapshotRecord = {
  caseId: string;
  revision: number;
  payload: string;
  createdAt: string;
  updatedAt: string;
};

export type PilotCaseEventRecord = PilotReleaseVersions & {
  id: string;
  caseId: string;
  sequence: number;
  type: PilotCaseEventType;
  payload: string;
  source: PilotCaseEventSource;
  occurredAt: string;
  /** v2 事件的显式身份列；旧事件允许为空，读取端仍可按 payload 回放。 */
  eventSchemaVersion?: number | null;
  problemThreadId?: string | null;
  sessionId?: string | null;
};

export type PilotClinicalEventEnvelope = {
  eventSchemaVersion: typeof PILOT_EVENT_SCHEMA_VERSION;
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  occurredAt: string;
  source: PilotCaseEventSource;
  payload: Record<string, unknown>;
};

export type PilotCaseFeedbackRecord = PilotReleaseVersions & {
  id: string;
  caseId: string;
  eventId: string | null;
  sessionNumber: number | null;
  stage: string;
  kind: string;
  message: string | null;
  payload: string | null;
  source: PilotCaseFeedbackSource;
  sourceSessionNumber: number | null;
  sourceStage: string | null;
  sourceEventId: string | null;
  status: PilotCaseFeedbackStatus;
  createdAt: string;
  updatedAt: string | null;
};

export type PilotAdminNoteRecord = {
  id: string;
  caseId: string;
  note: string;
  author: "admin";
  createdAt: string;
};

export type PilotAdminAuditAction =
  | "case_full_viewed"
  | "note_added"
  | "feedback_status_updated"
  | "case_exported"
  | "snapshot_projection_repaired"
  | "case_deleted";

export type PilotAdminAuditRecord = PilotReleaseVersions & {
  id: string;
  caseId: string;
  action: PilotAdminAuditAction;
  targetId: string | null;
  metadata: string | null;
  occurredAt: string;
};

export type PilotTrialEventRecord = PilotReleaseVersions & {
  id: string;
  dedupeKey: string;
  flowId: string;
  eventType: PilotTrialEventType;
  caseId: string | null;
  occurredAt: string;
};

export type NewPilotCaseBundle = {
  caseRecord: PilotCaseRecord;
  snapshot: PilotCaseSnapshotRecord;
  event: PilotCaseEventRecord;
};

export type SaveProgressInput = {
  caseId: string;
  expectedRevision: number;
  snapshot: Omit<PilotCaseSnapshotRecord, "caseId" | "revision">;
  event: Omit<PilotCaseEventRecord, "caseId" | "sequence">;
  patch: Partial<Pick<PilotCaseRecord, "currentStage" | "isBilateral" | "hasSafetyStop" | "sessionCount">>;
};

export type SaveProgressResult = {
  caseRecord: PilotCaseRecord;
  snapshot: PilotCaseSnapshotRecord;
  event: PilotCaseEventRecord;
};

export type DeleteCaseInput = {
  caseId: string;
  deletedAt: string;
  event: Omit<PilotCaseEventRecord, "caseId" | "sequence">;
  adminAudit?: PilotAdminAuditRecord;
};

export type SaveFeedbackInput = Omit<PilotCaseFeedbackRecord, "createdAt"> & {
  createdAt: string;
  timelineEvent?: Omit<PilotCaseEventRecord, "caseId" | "sequence">;
};

export interface PilotCaseRepository {
  createCaseBundle(input: NewPilotCaseBundle): Promise<NewPilotCaseBundle>;
  getCaseById(caseId: string): Promise<PilotCaseRecord | null>;
  getCaseByClientCreationId(clientCreationId: string): Promise<PilotCaseRecord | null>;
  getCaseByPublicCode(publicCode: string): Promise<PilotCaseRecord | null>;
  getSnapshot(caseId: string): Promise<PilotCaseSnapshotRecord | null>;
  getEventById(eventId: string): Promise<PilotCaseEventRecord | null>;
  getEventsByCaseId(caseId: string): Promise<PilotCaseEventRecord[]>;
  getFeedbackByCaseId(caseId: string): Promise<PilotCaseFeedbackRecord[]>;
  getAdminNotesByCaseId(caseId: string): Promise<PilotAdminNoteRecord[]>;
  getAdminAuditByCaseId(caseId: string): Promise<PilotAdminAuditRecord[]>;
  listTrialEvents(): Promise<PilotTrialEventRecord[]>;
  listCases(): Promise<PilotCaseRecord[]>;
  saveProgress(input: SaveProgressInput): Promise<SaveProgressResult>;
  saveFeedback(input: SaveFeedbackInput): Promise<PilotCaseFeedbackRecord>;
  saveAdminNote(input: PilotAdminNoteRecord, audit?: PilotAdminAuditRecord): Promise<PilotAdminNoteRecord>;
  saveAdminAudit(input: PilotAdminAuditRecord): Promise<PilotAdminAuditRecord>;
  saveTrialEvent(input: PilotTrialEventRecord): Promise<PilotTrialEventRecord>;
  updateFeedbackStatus(input: { caseId: string; feedbackId: string; status: PilotCaseFeedbackStatus; updatedAt: string; adminAudit?: PilotAdminAuditRecord }): Promise<PilotCaseFeedbackRecord>;
  deleteCase(input: DeleteCaseInput): Promise<PilotCaseRecord>;
  /** PRIV-02：物理清除过期案例（子表级联），返回移除数量。至少提供一个截止条件。 */
  hardDeleteCases(where: { deletedBefore?: string; createdBefore?: string }): Promise<number>;
  hardDeleteTestRun(testRunId: string): Promise<number>;
}

export class PilotCaseError extends Error {
  constructor(
    message: string,
    readonly code: "validation" | "payload_too_large" | "not_found" | "unauthorized" | "conflict" | "storage",
  ) {
    super(message);
    this.name = "PilotCaseError";
  }
}

export class PilotCaseValidationError extends PilotCaseError {
  constructor(message: string) {
    super(message, "validation");
    this.name = "PilotCaseValidationError";
  }
}

export class PilotCasePayloadTooLargeError extends PilotCaseError {
  constructor(message = "Payload is too large") {
    super(message, "payload_too_large");
    this.name = "PilotCasePayloadTooLargeError";
  }
}

export class PilotCaseNotFoundError extends PilotCaseError {
  constructor(message = "Case not found") {
    super(message, "not_found");
    this.name = "PilotCaseNotFoundError";
  }
}

export class PilotCaseUnauthorizedError extends PilotCaseError {
  constructor(message = "Case access denied") {
    super(message, "unauthorized");
    this.name = "PilotCaseUnauthorizedError";
  }
}

export class PilotCaseConflictError extends PilotCaseError {
  constructor(message = "Case revision conflict") {
    super(message, "conflict");
    this.name = "PilotCaseConflictError";
  }
}

export const MAX_PILOT_PAYLOAD_BYTES = 1_000_000;

/** REL-01：快照数据结构版本的唯一事实来源；不兼容载荷在服务层被拒绝。 */
export const PILOT_SNAPSHOT_SCHEMA_VERSION = 2;

function objectDepth(value: unknown, depth = 0): number {
  if (!value || typeof value !== "object") return depth;
  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  return children.reduce((maxDepth, child) => Math.max(maxDepth, objectDepth(child, depth + 1)), depth);
}

export function serializePilotPayload(value: unknown, label: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PilotCaseValidationError(`${label} must be a JSON object`);
  }

  try {
    const serialized = JSON.stringify(value);
    if (!serialized) throw new Error("empty JSON");
    if (new TextEncoder().encode(serialized).byteLength > MAX_PILOT_PAYLOAD_BYTES) {
      throw new PilotCasePayloadTooLargeError(`${label} exceeds the maximum size`);
    }
    if (objectDepth(value) > 24) throw new PilotCaseValidationError(`${label} is too deeply nested`);
    return serialized;
  } catch (error) {
    if (error instanceof PilotCaseError) throw error;
    throw new PilotCaseValidationError(`${label} must be JSON serializable`);
  }
}

export function parsePilotPayload(payload: string, label: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new PilotCaseError(`${label} is corrupt`, "storage");
  }
}

export function assertPilotEventType(value: string): asserts value is PilotCaseEventType {
  if (!(PILOT_CASE_EVENT_TYPES as readonly string[]).includes(value)) {
    throw new PilotCaseValidationError(`Unsupported case event type: ${value}`);
  }
}

export function assertPilotTrialEventType(value: string): asserts value is PilotTrialEventType {
  if (!(PILOT_TRIAL_EVENT_TYPES as readonly string[]).includes(value)) {
    throw new PilotCaseValidationError(`Unsupported trial event type: ${value}`);
  }
}

export function assertPilotEventSource(value: string): asserts value is PilotCaseEventSource {
  if (!("user system admin".split(" ") as readonly string[]).includes(value)) {
    throw new PilotCaseValidationError(`Unsupported case event source: ${value}`);
  }
}

export function assertPilotReleaseVersions(versions: PilotReleaseVersions) {
  for (const [key, value] of Object.entries(versions)) {
    if (!value.trim()) throw new PilotCaseValidationError(`${key} is required`);
  }
}

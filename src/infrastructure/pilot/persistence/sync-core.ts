export type PilotLocalSyncState = {
  serverRevision: number;
  dirty: boolean;
  localContentFingerprint?: string;
};

export type PilotRemoteSyncState = {
  revision: number;
  contentFingerprint?: string;
};

export type PilotRestoreDecision = "use-local" | "use-remote" | "conflict";

export type PilotSyncStatus =
  | "local_only"
  | "dirty"
  | "syncing"
  | "synced"
  | "failed"
  | "conflict"
  | "deleting"
  | "deleted";

export type PilotSyncOperation = {
  caseId: string;
  sessionId: string;
  requestId: string;
  baseRevision: number;
};

export type PilotSyncMachineState = {
  caseId: string;
  status: PilotSyncStatus;
  serverRevision: number;
  activeOperation: PilotSyncOperation | null;
  deleteRequestId: string | null;
  errorCode: string | null;
};

export type PilotSyncEvent =
  | { type: "case-selected"; caseId: string; serverRevision: number; remoteEnabled?: boolean }
  | { type: "local-changed"; caseId: string }
  | { type: "restore-started"; caseId: string }
  | { type: "restore-succeeded"; caseId: string; revision: number }
  | { type: "restore-conflict"; caseId: string }
  | { type: "restore-failed"; caseId: string; code: string }
  | { type: "remote-create-started"; caseId: string }
  | { type: "remote-create-failed"; caseId: string; code: string }
  | { type: "remote-save-started"; operation: PilotSyncOperation }
  | { type: "remote-save-succeeded"; operation: PilotSyncOperation; revision: number }
  | { type: "remote-save-failed"; operation: PilotSyncOperation; code: string }
  | { type: "conflict-detected"; operation: PilotSyncOperation }
  | { type: "delete-started"; caseId: string; requestId: string }
  | { type: "delete-succeeded"; caseId: string; requestId: string }
  | { type: "delete-failed"; caseId: string; requestId: string; code: string };

export function createPilotSyncMachineState(
  caseId: string,
  serverRevision = 0,
  remoteEnabled = true,
): PilotSyncMachineState {
  return {
    caseId,
    status: remoteEnabled ? "dirty" : "local_only",
    serverRevision,
    activeOperation: null,
    deleteRequestId: null,
    errorCode: null,
  };
}

function sameOperation(left: PilotSyncOperation | null, right: PilotSyncOperation) {
  return Boolean(left
    && left.caseId === right.caseId
    && left.sessionId === right.sessionId
    && left.requestId === right.requestId
    && left.baseRevision === right.baseRevision);
}

/** Pure save/delete arbitration. Stale responses are intentionally ignored. */
export function reducePilotSyncState(state: PilotSyncMachineState, event: PilotSyncEvent): PilotSyncMachineState {
  if (event.type === "case-selected") {
    return createPilotSyncMachineState(event.caseId, event.serverRevision, event.remoteEnabled ?? true);
  }
  if (event.type === "local-changed") {
    if (event.caseId !== state.caseId || state.status === "deleting" || state.status === "deleted") return state;
    return { ...state, status: "dirty", errorCode: null };
  }
  if (event.type === "restore-started" || event.type === "remote-create-started") {
    if (event.caseId !== state.caseId || state.status === "deleting" || state.status === "deleted") return state;
    return { ...state, status: "syncing", activeOperation: null, errorCode: null };
  }
  if (event.type === "restore-succeeded") {
    if (event.caseId !== state.caseId || state.status === "deleting" || state.status === "deleted") return state;
    return { ...state, status: "synced", serverRevision: event.revision, activeOperation: null, errorCode: null };
  }
  if (event.type === "restore-conflict" || event.type === "restore-failed" || event.type === "remote-create-failed") {
    if (event.caseId !== state.caseId || state.status === "deleting" || state.status === "deleted") return state;
    return {
      ...state,
      status: event.type === "restore-conflict" ? "conflict" : "failed",
      activeOperation: null,
      errorCode: event.type === "restore-conflict" ? "conflict" : event.code,
    };
  }
  if (event.type === "remote-save-started") {
    if (event.operation.caseId !== state.caseId || state.status === "deleting" || state.status === "deleted") return state;
    return { ...state, status: "syncing", activeOperation: event.operation, errorCode: null };
  }
  if (event.type === "remote-save-succeeded") {
    if (!sameOperation(state.activeOperation, event.operation)) return state;
    if (!Number.isInteger(event.revision) || event.revision < event.operation.baseRevision) return state;
    return { ...state, status: "synced", serverRevision: event.revision, activeOperation: null, errorCode: null };
  }
  if (event.type === "remote-save-failed" || event.type === "conflict-detected") {
    if (!sameOperation(state.activeOperation, event.operation)) return state;
    return {
      ...state,
      status: event.type === "conflict-detected" ? "conflict" : "failed",
      activeOperation: null,
      errorCode: event.type === "conflict-detected" ? "conflict" : event.code,
    };
  }
  if (event.type === "delete-started") {
    if (event.caseId !== state.caseId || state.status === "deleted") return state;
    return { ...state, status: "deleting", activeOperation: null, deleteRequestId: event.requestId, errorCode: null };
  }
  if (event.caseId !== state.caseId || event.requestId !== state.deleteRequestId) return state;
  if (event.type === "delete-succeeded") {
    return { ...state, status: "deleted", activeOperation: null, deleteRequestId: null, errorCode: null };
  }
  return { ...state, status: "failed", deleteRequestId: null, errorCode: event.code };
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? String(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

/** A deterministic equality fingerprint, not a security hash. */
export function contentFingerprint(value: unknown) {
  const text = stableSerialize(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

const CONFLICT_SECTION_KEYS = [
  { label: "症状信息", keys: ["intake"] },
  { label: "安全确认", keys: ["safety", "boneRisk", "imaging"] },
  { label: "评估检查", keys: ["assessmentIndex", "assessmentResults"] },
  { label: "处理复测", keys: ["trialTargetIndex", "candidateIndex", "trialRecords", "postScore", "movementResponse"] },
  { label: "训练居家", keys: ["exerciseFeedback", "trainingComplete", "trainingPlanSaved"] },
  { label: "后续康复", keys: ["followupMode", "sessionNumber", "followupStage", "followupTrialRecords", "sessionHistory"] },
] as const;

export function summarizePilotSnapshotConflict(local: unknown, remote: unknown) {
  const localObject = local && typeof local === "object" ? local as Record<string, unknown> : {};
  const remoteObject = remote && typeof remote === "object" ? remote as Record<string, unknown> : {};
  return CONFLICT_SECTION_KEYS
    .filter((section) => section.keys.some((key) => contentFingerprint(localObject[key]) !== contentFingerprint(remoteObject[key])))
    .map((section) => section.label);
}

/** A conflict copy must never inherit credentials or revision ownership from the original remote case. */
export function buildPilotConflictCaseCopy<T extends Record<string, unknown>>(
  record: T,
  identity: { id: string; localCaseId: string },
): T {
  const copy: Record<string, unknown> = {
    ...record,
    ...identity,
    pilotDirty: true,
  };
  for (const key of [
    "pilotCaseId", "pilotClientCreationId", "pilotPublicCode", "pilotAccessToken", "pilotRevision",
    "pilotLastSyncedRevision", "lastSyncedContentFingerprint", "pilotConflictSnapshot",
    "pilotConflictRevision", "pilotVersions",
  ]) delete copy[key];
  return copy as T;
}

export function decidePilotRestoreSource(
  local: PilotLocalSyncState | null,
  remote: PilotRemoteSyncState,
): PilotRestoreDecision {
  if (!local) return "use-remote";
  if (!local.dirty) return remote.revision >= local.serverRevision ? "use-remote" : "use-local";
  if (local.localContentFingerprint && remote.contentFingerprint === local.localContentFingerprint) return "use-remote";
  if (remote.revision < local.serverRevision) return "use-local";
  return "conflict";
}

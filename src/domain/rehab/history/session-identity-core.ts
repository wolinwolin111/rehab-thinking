/**
 * 康复案例的技术身份与生命周期。
 *
 * caseId 标识一整条案例；problemThreadId 标识同一主问题链；sessionId
 * 标识一次具体康复会话。三者不能用主诉文本或数组位置推导，否则编辑主诉、
 * 新症状分支和恢复记录时会把不同会话错误合并。
 */
export type SessionLifecycleStatus = "draft" | "completed" | "abandoned";
export type ProblemThreadStatus = "active" | "resolved" | "archived" | "superseded";

export type ProblemThreadIdentity = {
  problemThreadId: string;
  caseId?: string;
  status: ProblemThreadStatus;
  createdAt: string;
  lastActiveAt: string;
  closedAt?: string;
  supersedesProblemThreadId?: string;
};

export type SessionIdentity = {
  sessionId: string;
  problemThreadId: string;
  sessionNumber: number;
  status: SessionLifecycleStatus;
  startedAt: string;
  lastDraftSavedAt?: string;
  completedAt?: string;
  completionReason?: string;
};

/**
 * 持久化在案例快照中的问题线程投影。
 *
 * 这是记录页和工作台之间的最小共享合同：工作台只加载 active 线程，
 * 记录页可以按 caseId 展示 active/resolved/archived 线程及其会话索引。
 * 线程状态变化不会移动或复制会话记录。
 */
export type ProblemThreadRecord = ProblemThreadIdentity & {
  caseId: string;
  regionId?: string;
  location?: string;
  title?: string;
};

/**
 * 不携带临床内容的会话索引。临床摘要仍保存在对应 sessionHistory 中，
 * 这里仅用于正确归属、生命周期展示和跨线程隔离。
 */
export type SessionIndexRecord = SessionIdentity & {
  caseId: string;
  location?: string;
};

function fallbackId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createProblemThreadId() {
  const id = globalThis.crypto?.randomUUID?.();
  return id ? `thread-${id}` : fallbackId("thread");
}

export function createSessionId() {
  const id = globalThis.crypto?.randomUUID?.();
  return id ? `session-${id}` : fallbackId("session");
}

/** 为 v1 旧记录提供稳定的技术身份；同一记录重复恢复时不会变化。 */
export function legacySessionIdentity(localCaseId: string, sessionNumber: number): Pick<SessionIdentity, "sessionId" | "problemThreadId"> {
  const safeCaseId = localCaseId.trim() || "legacy-case";
  return {
    problemThreadId: `thread-legacy-${safeCaseId}`,
    sessionId: `session-legacy-${safeCaseId}-${Math.max(1, sessionNumber)}`,
  };
}

export function markSessionDraft(identity: SessionIdentity, savedAt: string): SessionIdentity {
  return { ...identity, status: "draft", lastDraftSavedAt: savedAt, completedAt: undefined, completionReason: undefined };
}

export function markSessionCompleted(identity: SessionIdentity, completedAt: string, completionReason = "workflow_completed"): SessionIdentity {
  return { ...identity, status: "completed", lastDraftSavedAt: completedAt, completedAt, completionReason };
}

export function createProblemThreadRecord(input: {
  caseId: string;
  problemThreadId?: string;
  regionId?: string;
  location?: string;
  title?: string;
  createdAt?: string;
}): ProblemThreadRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    problemThreadId: input.problemThreadId ?? createProblemThreadId(),
    caseId: input.caseId,
    status: "active",
    createdAt,
    lastActiveAt: createdAt,
    regionId: input.regionId,
    location: input.location,
    title: input.title,
  };
}

export function upsertProblemThreadRecord(records: ProblemThreadRecord[], record: ProblemThreadRecord) {
  return [...records.filter((item) => item.problemThreadId !== record.problemThreadId), record]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function archiveProblemThreadRecord(record: ProblemThreadRecord, closedAt = new Date().toISOString()): ProblemThreadRecord {
  return { ...record, status: "archived", lastActiveAt: closedAt, closedAt };
}

export function sessionIndexFromSummary(input: {
  caseId: string;
  problemThreadId: string;
  sessionId?: string;
  sessionNumber: number;
  status?: SessionLifecycleStatus;
  startedAt?: string;
  lastDraftSavedAt?: string;
  completedAt?: string;
  completionReason?: string;
  location?: string;
}): SessionIndexRecord {
  const startedAt = input.startedAt ?? input.completedAt ?? new Date(0).toISOString();
  return {
    sessionId: input.sessionId ?? `session-legacy-${input.caseId}-${Math.max(1, input.sessionNumber)}`,
    problemThreadId: input.problemThreadId,
    caseId: input.caseId,
    sessionNumber: Math.max(1, input.sessionNumber),
    status: input.status ?? (input.completedAt ? "completed" : "draft"),
    startedAt,
    lastDraftSavedAt: input.lastDraftSavedAt,
    completedAt: input.completedAt,
    completionReason: input.completionReason,
    location: input.location,
  };
}

export function upsertSessionIndex(records: SessionIndexRecord[], record: SessionIndexRecord) {
  return [...records.filter((item) => item.sessionId !== record.sessionId), record]
    .sort((left, right) => left.sessionNumber - right.sessionNumber || left.startedAt.localeCompare(right.startedAt));
}

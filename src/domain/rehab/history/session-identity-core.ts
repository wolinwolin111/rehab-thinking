/**
 * 康复案例的技术身份与生命周期。
 *
 * caseId 标识一整条案例；problemThreadId 标识同一主问题链；sessionId
 * 标识一次具体康复会话。三者不能用主诉文本或数组位置推导，否则编辑主诉、
 * 新症状分支和恢复记录时会把不同会话错误合并。
 */
export type SessionLifecycleStatus = "draft" | "completed" | "abandoned";
export type ProblemThreadStatus = "active" | "resolved" | "superseded";

export type ProblemThreadIdentity = {
  problemThreadId: string;
  status: ProblemThreadStatus;
  createdAt: string;
  lastActiveAt: string;
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


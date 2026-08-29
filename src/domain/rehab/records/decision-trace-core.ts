export type DecisionTrace = {
  traceId: string;
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  findingIds: string[];
  relationIds: string[];
  ruleIds: string[];
  sourceCaseIds: string[];
  knowledgeVersion: string;
  decisionVersion: string;
  recordedAt: string;
};

type TraceTrial = { treatmentRecordId?: string; sessionId?: string; recordedAt?: string; candidateId: string; targetId?: string; sourceCaseIds?: string[]; relationIds?: string[]; findingIds?: string[]; knowledgeBranchId?: string; treatmentKey?: string };
type TraceSnapshotInput = { localCaseId?: string; problemThreadId?: string; sessionId?: string; trialRecords?: TraceTrial[] };

/** Keep evidence lineage attached to an executed treatment without exposing IDs in normal UI. */
export function buildDecisionTraces(input: TraceSnapshotInput, recordedAt = new Date().toISOString()): DecisionTrace[] {
  const caseId = input.localCaseId ?? "legacy-case";
  const problemThreadId = input.problemThreadId ?? "legacy-thread";
  const sessionId = input.sessionId ?? "legacy-session";
  return (input.trialRecords ?? []).map((trial, index) => ({
    traceId: `trace:${trial.treatmentRecordId ?? `${trial.sessionId ?? sessionId}:${trial.candidateId}:${index}`}`,
    caseId,
    problemThreadId,
    sessionId: trial.sessionId ?? sessionId,
    findingIds: trial.findingIds?.length ? [...new Set(trial.findingIds)] : trial.targetId ? [trial.targetId] : [],
    relationIds: [...new Set(trial.relationIds ?? [])],
    ruleIds: [...new Set([
      ...(trial.knowledgeBranchId ? [trial.knowledgeBranchId] : []),
      trial.treatmentKey ?? trial.candidateId,
    ])],
    sourceCaseIds: [...new Set(trial.sourceCaseIds ?? [])],
    knowledgeVersion: trial.relationIds?.length
      ? "REHABMIND-KNEE-ANKLE-KNOWLEDGE-V1:2026-08-29.owner-reviewed"
      : "rehabmind-pilot-knowledge-0.1.0",
    decisionVersion: trial.relationIds?.length
      ? "rehabmind-p0-runtime-1"
      : "rehabmind-pilot-decision-0.1.0",
    recordedAt: trial.recordedAt ?? recordedAt,
  }));
}

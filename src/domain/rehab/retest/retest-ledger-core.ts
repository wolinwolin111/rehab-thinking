import type {
  FunctionRetestCompletion,
  FunctionRetestMode,
  FunctionRetestRecord,
  TrialRecord,
  TrialResult,
} from "@/src/domain/rehab/treatment/trial-record-types";

export type RetestObligationKind = "range" | "function" | "chief" | "training-safety";
export type RetestObligationStatus = "pending" | "completed" | "deferred" | "cancelled" | "superseded";
export type RetestSide = "左侧" | "右侧";

/** v3 复查义务台账：记录仍欠什么，不承担页面排序职责。 */
export type RetestObligation = {
  obligationId: string;
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  kind: RetestObligationKind;
  targetId: string;
  label: string;
  sourceAssessmentId?: string;
  sourceAssessmentRevision?: number;
  baselineCompletion?: FunctionRetestCompletion;
  mode?: FunctionRetestMode;
  baselineScore?: number;
  treatmentRecordIds: string[];
  side?: RetestSide;
  required: boolean;
  status: RetestObligationStatus;
  createdAt: string;
  completedAt?: string;
  supersededAt?: string;
};

export type RetestRecord = {
  retestRecordId: string;
  obligationId: string;
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  treatmentRecordId?: string;
  sourceAssessmentRevision?: number;
  recordedAt: string;
  result: TrialResult;
  completion?: "complete" | "unable";
  unableReason?: "pain" | "weak" | "fear" | "instruction";
  score?: number;
  rangeOutcome?: "both-match" | "passive-match-active-limited" | "better-passive-limited" | "passive-limited" | "worse";
};

export type PendingFunctionInput = {
  assessmentId: string;
  label: string;
  baselineCompletion?: FunctionRetestCompletion;
  mode?: FunctionRetestMode;
  baselineScore?: number;
  sides?: RetestSide[];
  /** 兼容旧调用；候选身份不能再充当处理事实身份。 */
  candidateIds?: string[];
  treatmentRecordIds?: string[];
  assessmentRevision?: number;
};

/** 已由页面确认、但不属于处理卡本身的复查事实。页面布尔值只能先转成此输入。 */
export type RetestSignalInput = {
  kind: "chief" | "training-safety";
  targetId: string;
  label: string;
  required: boolean;
  status: "pending" | "completed" | "cancelled" | "superseded";
  result?: TrialResult;
  score?: number;
  treatmentRecordId?: string;
  recordedAt?: string;
  assessmentRevision?: number;
};

export function retestObligationId(input: {
  sessionId: string;
  kind: RetestObligationKind;
  targetId: string;
  side?: RetestSide;
  assessmentRevision?: number;
}) {
  return ["retest", input.sessionId, `r${input.assessmentRevision ?? 0}`, input.kind, input.targetId, input.side ?? "overall"]
    .map((part) => encodeURIComponent(part)).join(":");
}

export function pendingRequiredRetests(obligations: RetestObligation[]) {
  return obligations.filter((item) => item.required && item.status === "pending");
}

export function projectRetestLedger(input: { obligations: RetestObligation[]; records: RetestRecord[] }) {
  const completedIds = new Set(input.records.map((record) => record.obligationId));
  const obligations = input.obligations.map((obligation) => completedIds.has(obligation.obligationId)
    ? { ...obligation, status: "completed" as const }
    : obligation);
  return { obligations, records: input.records, pendingRequiredCount: pendingRequiredRetests(obligations).length };
}

function resultFromFunctionRetest(record: FunctionRetestRecord, side?: RetestSide): TrialResult {
  const answer = side ? record.sideResults?.[side] : record;
  if (!answer) return "same";
  if (record.baselineCompletion === "unable") return answer.afterCompletion === "complete" ? "better" : "same";
  if (answer.afterCompletion === "unable") return "worse";
  if (typeof record.baselineScore === "number" && typeof answer.afterScore === "number") {
    if (answer.afterScore < record.baselineScore) return "better";
    if (answer.afterScore > record.baselineScore) return "worse";
  }
  return "same";
}

function resultFromRangeOutcome(outcome: NonNullable<RetestRecord["rangeOutcome"]>): TrialResult {
  if (outcome === "both-match") return "better";
  if (outcome === "passive-match-active-limited" || outcome === "better-passive-limited") return "partial";
  if (outcome === "worse") return "worse";
  return "same";
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

/** 合并已保存台账、评估产生的义务和真实处理记录；不会用页面队列覆盖历史。 */
export function buildRetestLedgerFromTrials(input: {
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  recordedAt: string;
  assessmentRevision?: number;
  trials: TrialRecord[];
  pendingFunctions: PendingFunctionInput[];
  pendingRangeDirectionIds?: string[];
  signals?: RetestSignalInput[];
  previousObligations?: RetestObligation[];
  previousRecords?: RetestRecord[];
}) {
  const obligations = new Map<string, RetestObligation>();
  const records = new Map<string, RetestRecord>();
  const revision = input.assessmentRevision ?? 0;
  for (const item of input.previousObligations ?? []) obligations.set(item.obligationId, item);
  for (const item of input.previousRecords ?? []) records.set(item.retestRecordId, item);

  const trialIdentity = (trial: TrialRecord, index: number) => trial.treatmentRecordId
    ?? `legacy-treatment:${trial.sessionId ?? input.sessionId}:${encodeURIComponent(trial.candidateId)}:${index}`;
  const addCompleted = (
    obligation: RetestObligation,
    treatmentRecordId: string,
    recordedAt: string,
    record: Omit<RetestRecord, "retestRecordId" | "obligationId" | "caseId" | "problemThreadId" | "sessionId" | "recordedAt">,
  ) => {
    const previous = obligations.get(obligation.obligationId);
    obligations.set(obligation.obligationId, {
      ...previous,
      ...obligation,
      treatmentRecordIds: unique([...(previous?.treatmentRecordIds ?? []), treatmentRecordId]),
      status: "completed",
      completedAt: recordedAt,
    });
    const retestRecordId = `retest-result:${encodeURIComponent(treatmentRecordId)}:${encodeURIComponent(obligation.obligationId)}:${encodeURIComponent(recordedAt)}`;
    if (!records.has(retestRecordId)) records.set(retestRecordId, {
      retestRecordId,
      obligationId: obligation.obligationId,
      caseId: input.caseId,
      problemThreadId: input.problemThreadId,
      sessionId: input.sessionId,
      treatmentRecordId,
      recordedAt,
      ...record,
    });
  };

  input.trials.forEach((trial, index) => {
    const treatmentRecordId = trialIdentity(trial, index);
    const trialRevision = trial.assessmentRevision ?? revision;
    const trialRecordedAt = trial.recordedAt ?? input.recordedAt;
    Object.entries(trial.functionRetests ?? {}).forEach(([assessmentId, functionRecord]) => {
      const sides = functionRecord.sides?.length ? functionRecord.sides : [undefined];
      sides.forEach((side) => {
        const answer = side ? functionRecord.sideResults?.[side] : functionRecord;
        if (!answer) return;
        const obligationId = retestObligationId({ sessionId: input.sessionId, kind: "function", targetId: assessmentId, side, assessmentRevision: trialRevision });
        addCompleted({
          obligationId, caseId: input.caseId, problemThreadId: input.problemThreadId, sessionId: input.sessionId,
          kind: "function", targetId: assessmentId, label: functionRecord.label, sourceAssessmentId: assessmentId,
          sourceAssessmentRevision: trialRevision, baselineCompletion: functionRecord.baselineCompletion,
          mode: functionRecord.mode, baselineScore: functionRecord.baselineScore,
          treatmentRecordIds: [treatmentRecordId], side, required: true,
          status: "completed", createdAt: trialRecordedAt,
        }, treatmentRecordId, trialRecordedAt, {
          sourceAssessmentRevision: trialRevision,
          result: resultFromFunctionRetest(functionRecord, side),
          completion: answer.afterCompletion,
          unableReason: answer.unableReason,
          score: answer.afterScore,
        });
      });
    });
    Object.entries(trial.rangeOutcomes ?? {}).forEach(([directionId, outcome]) => {
      const obligationId = retestObligationId({ sessionId: input.sessionId, kind: "range", targetId: directionId, assessmentRevision: trialRevision });
      addCompleted({
        obligationId, caseId: input.caseId, problemThreadId: input.problemThreadId, sessionId: input.sessionId,
        kind: "range", targetId: directionId, label: trial.targetTitle ?? trial.candidateTitle,
        sourceAssessmentId: directionId, sourceAssessmentRevision: trialRevision, treatmentRecordIds: [treatmentRecordId],
        required: true, status: "completed", createdAt: trialRecordedAt,
      }, treatmentRecordId, trialRecordedAt, {
        sourceAssessmentRevision: trialRevision,
        result: resultFromRangeOutcome(outcome),
        rangeOutcome: outcome,
      });
    });
    if (trial.chiefRetested) {
      const obligationId = retestObligationId({ sessionId: input.sessionId, kind: "chief", targetId: "chief-action", assessmentRevision: trialRevision });
      addCompleted({
        obligationId, caseId: input.caseId, problemThreadId: input.problemThreadId, sessionId: input.sessionId,
        kind: "chief", targetId: "chief-action", label: "本次主要动作", sourceAssessmentRevision: trialRevision,
        baselineScore: trial.beforeScore, treatmentRecordIds: [treatmentRecordId], required: true,
        status: "completed", createdAt: trialRecordedAt,
      }, treatmentRecordId, trialRecordedAt, {
        sourceAssessmentRevision: trialRevision,
        result: trial.afterScore < trial.beforeScore ? "better" : trial.afterScore > trial.beforeScore ? "worse" : "same",
        score: trial.afterScore,
      });
    }
  });

  const upsertPending = (item: PendingFunctionInput, side?: RetestSide) => {
    const itemRevision = item.assessmentRevision ?? revision;
    const obligationId = retestObligationId({ sessionId: input.sessionId, kind: "function", targetId: item.assessmentId, side, assessmentRevision: itemRevision });
    const existing = obligations.get(obligationId);
    if (existing?.status === "completed" || [...records.values()].some((record) => record.obligationId === obligationId)) return;
    obligations.set(obligationId, {
      obligationId, caseId: input.caseId, problemThreadId: input.problemThreadId, sessionId: input.sessionId,
      kind: "function", targetId: item.assessmentId, label: item.label, sourceAssessmentId: item.assessmentId,
      sourceAssessmentRevision: itemRevision, baselineCompletion: item.baselineCompletion,
      mode: item.mode, baselineScore: item.baselineScore,
      treatmentRecordIds: unique(item.treatmentRecordIds ?? []), side,
      required: true, status: "pending", createdAt: existing?.createdAt ?? input.recordedAt,
    });
  };
  input.pendingFunctions.forEach((item) => (item.sides?.length ? item.sides : [undefined]).forEach((side) => upsertPending(item, side)));

  (input.pendingRangeDirectionIds ?? []).forEach((directionId) => {
    const obligationId = retestObligationId({ sessionId: input.sessionId, kind: "range", targetId: directionId, assessmentRevision: revision });
    if (obligations.get(obligationId)?.status === "completed" || [...records.values()].some((record) => record.obligationId === obligationId)) return;
    obligations.set(obligationId, {
      obligationId, caseId: input.caseId, problemThreadId: input.problemThreadId, sessionId: input.sessionId,
      kind: "range", targetId: directionId, label: directionId, sourceAssessmentId: directionId,
      sourceAssessmentRevision: revision, treatmentRecordIds: [], required: true, status: "pending", createdAt: input.recordedAt,
    });
  });

  for (const signal of input.signals ?? []) {
    const signalRevision = signal.assessmentRevision ?? revision;
    const obligationId = retestObligationId({
      sessionId: input.sessionId,
      kind: signal.kind,
      targetId: signal.targetId,
      assessmentRevision: signalRevision,
    });
    const existing = obligations.get(obligationId);
    if (signal.status === "completed" && signal.result) {
      const sourceId = signal.treatmentRecordId ?? `retest-source:${input.sessionId}:${signal.kind}:${signal.targetId}:${signal.recordedAt ?? input.recordedAt}`;
      addCompleted({
        obligationId, caseId: input.caseId, problemThreadId: input.problemThreadId, sessionId: input.sessionId,
        kind: signal.kind, targetId: signal.targetId, label: signal.label,
        sourceAssessmentRevision: signalRevision, baselineScore: existing?.baselineScore,
        treatmentRecordIds: [sourceId], required: signal.required, status: "completed",
        createdAt: existing?.createdAt ?? signal.recordedAt ?? input.recordedAt,
      }, sourceId, signal.recordedAt ?? input.recordedAt, {
        sourceAssessmentRevision: signalRevision,
        result: signal.result,
        score: signal.score,
      });
      continue;
    }
    if (existing?.status === "completed") continue;
    obligations.set(obligationId, {
      obligationId, caseId: input.caseId, problemThreadId: input.problemThreadId, sessionId: input.sessionId,
      kind: signal.kind, targetId: signal.targetId, label: signal.label,
      sourceAssessmentRevision: signalRevision, treatmentRecordIds: existing?.treatmentRecordIds ?? [],
      required: signal.required, status: signal.status,
      createdAt: existing?.createdAt ?? signal.recordedAt ?? input.recordedAt,
      ...(signal.status === "superseded" ? { supersededAt: signal.recordedAt ?? input.recordedAt } : {}),
    });
  }

  for (const [id, item] of obligations) {
    if (item.sessionId === input.sessionId && item.status === "pending" && (item.sourceAssessmentRevision ?? 0) < revision) {
      obligations.set(id, { ...item, status: "superseded", supersededAt: input.recordedAt });
    }
  }
  const projection = projectRetestLedger({ obligations: [...obligations.values()], records: [...records.values()] });
  return {
    ...projection,
    pendingRequiredCount: projection.obligations.filter((item) => item.sessionId === input.sessionId && item.required && item.status === "pending").length,
  };
}
